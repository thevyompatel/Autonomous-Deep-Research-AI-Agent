"""ChatGoogleGenerativeAI factory plus the two call helpers the nodes use."""

import json
import re
import time
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from collections.abc import Callable
from typing import Any, TypeVar

from google.api_core.exceptions import ResourceExhausted
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from src.agent import config
from src.agent.config import console

T = TypeVar("T", bound=BaseModel)


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    """Build the shared Gemini client.

    The rate limiter spaces out calls so back-to-back nodes (synthesizer ->
    reflector) and structured-output retries stay under the per-minute quota.
    429s are retried by _invoke, which waits as long as the server asks.
    """
    limiter = InMemoryRateLimiter(
        requests_per_second=config.LLM_REQUESTS_PER_MINUTE / 60,
        check_every_n_seconds=0.1,
        max_bucket_size=1,
    )
    return ChatGoogleGenerativeAI(
        model=config.MODEL_NAME,
        google_api_key=config.require_env("GEMINI_API_KEY"),
        max_output_tokens=config.MAX_OUTPUT_TOKENS,
        timeout=config.LLM_TIMEOUT_SECONDS,
        max_retries=config.LLM_MAX_RETRIES,
        rate_limiter=limiter,
    )


# Called with the wait in seconds whenever a 429 makes _invoke sleep; the web UI shows it.
quota_listeners: list[Callable[[float], None]] = []

_RETRY_DELAY = re.compile(r"retry in ([\d.]+)s|retry_delay\s*\{\s*seconds:\s*(\d+)")
# Gemini daily quotas reset at midnight Pacific time. A fixed UTC-8 offset
# resets an hour late during daylight saving time, which errs on the safe side.
_QUOTA_TZ = timezone(timedelta(hours=-8))


def _quota_day() -> str:
    """Today's date in the timezone Gemini's daily quota resets in."""
    return datetime.now(_QUOTA_TZ).date().isoformat()


def daily_usage() -> int:
    """Gemini requests counted so far today, read from LLM_USAGE_FILE."""
    try:
        usage = json.loads(config.LLM_USAGE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return 0
    return int(usage.get("requests", 0)) if usage.get("date") == _quota_day() else 0


def _reserve_daily_request() -> None:
    """Count one Gemini request against today's cap, or raise if it is used up.

    The count lives in LLM_USAGE_FILE so it carries across runs.
    """
    cap = config.LLM_REQUESTS_PER_DAY
    if cap <= 0:
        return
    today = _quota_day()
    used = daily_usage()
    if used >= cap:
        raise RuntimeError(
            f"Daily Gemini request cap reached ({used}/{cap}). It resets at midnight "
            "Pacific time; raise LLM_REQUESTS_PER_DAY in .env if your quota allows."
        )
    config.LLM_USAGE_FILE.write_text(
        json.dumps({"date": today, "requests": used + 1}), encoding="utf-8"
    )


def _invoke(runnable: Any, prompt: str) -> Any:
    """Invoke the model, waiting out per-minute quota errors (429).

    The SDK's own backoff (2 s, 4 s) is far shorter than Gemini's quota
    window, so on a 429 this sleeps for the delay the server suggests.
    Daily quota errors are raised at once, since waiting will not help.
    Every attempt counts against the client-side daily cap first.
    """
    for attempt in range(config.LLM_QUOTA_RETRIES + 1):
        _reserve_daily_request()
        try:
            return runnable.invoke(prompt)
        except ResourceExhausted as exc:
            message = str(exc)
            if "PerDay" in message or attempt == config.LLM_QUOTA_RETRIES:
                raise
            match = _RETRY_DELAY.search(message)
            delay = float(next(g for g in match.groups() if g)) if match else 60.0
            console.log(f"[yellow]Gemini quota hit, waiting {delay + 1:.0f} s[/yellow]")
            for listener in list(quota_listeners):
                listener(delay + 1)
            time.sleep(delay + 1)
    raise AssertionError("unreachable")


def _tokens(message: object) -> int:
    """Total tokens reported for one response, or 0 if unavailable."""
    usage = getattr(message, "usage_metadata", None) or {}
    return int(usage.get("total_tokens", 0))


def _text(message: object) -> str:
    """Join the text blocks of a response, skipping thinking blocks."""
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    return "".join(
        block.get("text", "")
        for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    )


def text_call(prompt: str) -> tuple[str, int]:
    """Send a prompt and return (text, tokens used)."""
    message = _invoke(get_llm(), prompt)
    return _text(message).strip(), _tokens(message)


def structured_call(schema: type[T], prompt: str) -> tuple[T, int]:
    """Send a prompt and return (validated schema instance, tokens used).

    Uses Gemini's native JSON-schema structured output. Retries
    once with the validation error if the first answer does not parse.
    """
    llm = get_llm().with_structured_output(schema, method="json_schema", include_raw=True)
    tokens = 0
    attempt_prompt = prompt
    error: object = None
    for _ in range(2):
        result = _invoke(llm, attempt_prompt)
        tokens += _tokens(result.get("raw"))
        if result.get("parsed") is not None:
            return result["parsed"], tokens
        error = result.get("parsing_error")
        attempt_prompt = (
            f"{prompt}\n\nYour previous answer was rejected with this error:\n{error}\n"
            "Answer again and fix it."
        )
    raise ValueError(f"Structured output for {schema.__name__} failed twice: {error}")

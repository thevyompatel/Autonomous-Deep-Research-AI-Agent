"""Tavily web search wrapper with retry and backoff."""

import time
from functools import lru_cache

from tavily import TavilyClient

from src.agent import config


@lru_cache(maxsize=1)
def _client() -> TavilyClient:
    """Build the shared Tavily client."""
    return TavilyClient(api_key=config.require_env("TAVILY_API_KEY"))


def web_search(query: str, max_results: int | None = None) -> list[dict]:
    """Search the web and return hits as {title, url, snippet}.

    Asks for a few extra results so the searcher can skip duplicates and
    failed scrapes. Retries transient failures with exponential backoff.
    """
    max_results = max_results or config.MAX_SOURCES_PER_QUERY + 2
    last_error: Exception | None = None
    for attempt in range(config.SEARCH_MAX_RETRIES):
        try:
            response = _client().search(query=query, max_results=max_results)
            return [
                {
                    "title": hit.get("title") or hit["url"],
                    "url": hit["url"],
                    "snippet": hit.get("content") or "",
                }
                for hit in response.get("results", [])
                if hit.get("url")
            ]
        except Exception as exc:  # network errors, rate limits, 5xx
            last_error = exc
            if attempt < config.SEARCH_MAX_RETRIES - 1:
                time.sleep(2**attempt)
    raise RuntimeError(f"Search failed for {query!r}: {last_error}")

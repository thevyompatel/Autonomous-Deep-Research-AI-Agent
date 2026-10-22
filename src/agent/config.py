"""Central configuration: environment loading, model name and run limits."""

import os
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

# LLM
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")
MAX_OUTPUT_TOKENS = 16000
LLM_TIMEOUT_SECONDS = 300
LLM_MAX_RETRIES = 1  # SDK attempts; its 2-4 s backoff only wastes quota on a 429
LLM_QUOTA_RETRIES = 3  # 429 retries in llm._invoke, each waiting the server's delay
# Client-side cap on Gemini calls. Keep it under your API tier's RPM quota
# (the free tier allows 5 per minute per model).
LLM_REQUESTS_PER_MINUTE = float(os.getenv("LLM_REQUESTS_PER_MINUTE", "4"))
# Client-side cap on Gemini calls per day, counted across runs in
# LLM_USAGE_FILE. Keep it under your tier's RPD quota; 0 disables the cap.
LLM_REQUESTS_PER_DAY = int(os.getenv("LLM_REQUESTS_PER_DAY", "20"))
LLM_USAGE_FILE = PROJECT_ROOT / ".gemini_usage.json"

# Loop limits
MAX_ITERATIONS = 3
PASS_SCORE = 8
MAX_FOLLOW_UP_QUERIES = 3
MAX_TOKENS_PER_RUN = 400_000  # input + output tokens across all LLM calls
RECURSION_LIMIT = 25  # LangGraph safety net on top of MAX_ITERATIONS

# Search and scraping
MAX_SOURCES_PER_QUERY = 3
MAX_CONTENT_CHARS = 6000
MIN_CONTENT_CHARS = 200
SCRAPE_TIMEOUT_SECONDS = 10
SCRAPE_WORKERS = 6
HOST_DELAY_SECONDS = 1.0
SEARCH_MAX_RETRIES = 3
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

REPORTS_DIR = PROJECT_ROOT / "reports"

# Web UI (python -m app.web)
WEB_HOST = os.getenv("WEB_HOST", "127.0.0.1")
WEB_PORT = int(os.getenv("WEB_PORT", "8000"))

console = Console()


def require_env(name: str) -> str:
    """Return an environment variable or raise a clear error if it is unset."""
    value = os.getenv(name, "").strip()
    if not value or value == "your_key_here":
        raise RuntimeError(f"{name} is not set. Add it to the .env file in {PROJECT_ROOT}.")
    return value


def missing_keys() -> list[str]:
    """List the required API keys that are not configured."""
    missing = []
    for name in ("GEMINI_API_KEY", "TAVILY_API_KEY"):
        try:
            require_env(name)
        except RuntimeError:
            missing.append(name)
    return missing

"""Fetch a web page and extract its main text. Never raises."""

import threading
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx
import trafilatura
from bs4 import BeautifulSoup

from src.agent import config

_lock = threading.Lock()
_robots: dict[str, RobotFileParser | None] = {}
_next_slot: dict[str, float] = {}


def _get(url: str) -> httpx.Response:
    """GET a URL with the project timeout and a browser-like User-Agent."""
    return httpx.get(
        url,
        headers={"User-Agent": config.USER_AGENT},
        timeout=config.SCRAPE_TIMEOUT_SECONDS,
        follow_redirects=True,
    )


def _allowed(url: str) -> bool:
    """Check robots.txt for the URL's host. Allows when robots.txt is unreadable."""
    parts = urlparse(url)
    origin = f"{parts.scheme}://{parts.netloc}"
    with _lock:
        cached = origin in _robots
        parser = _robots.get(origin)
    if not cached:
        parser = None
        try:
            response = _get(f"{origin}/robots.txt")
            if response.status_code == 200:
                parser = RobotFileParser()
                parser.parse(response.text.splitlines())
        except Exception:
            parser = None
        with _lock:
            _robots[origin] = parser
    return parser is None or parser.can_fetch(config.USER_AGENT, url)


def _wait_for_host(host: str) -> None:
    """Space out requests to the same host by HOST_DELAY_SECONDS."""
    with _lock:
        now = time.monotonic()
        slot = max(now, _next_slot.get(host, 0.0))
        _next_slot[host] = slot + config.HOST_DELAY_SECONDS
    if slot > now:
        time.sleep(slot - now)


def _extract(html: str) -> str:
    """Extract main article text with trafilatura, falling back to BeautifulSoup."""
    text = trafilatura.extract(html) or ""
    if len(text) < config.MIN_CONTENT_CHARS:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
            tag.decompose()
        text = " ".join(soup.get_text(separator=" ").split())
    return text.strip()


def scrape(url: str) -> str | None:
    """Return up to MAX_CONTENT_CHARS of clean page text, or None on any failure."""
    try:
        if urlparse(url).scheme not in ("http", "https") or not _allowed(url):
            return None
        _wait_for_host(urlparse(url).netloc)
        response = _get(url)
        if response.status_code != 200:
            return None
        if "html" not in response.headers.get("content-type", "html"):
            return None
        text = _extract(response.text)
        if len(text) < config.MIN_CONTENT_CHARS:
            return None
        return text[: config.MAX_CONTENT_CHARS]
    except Exception:
        return None

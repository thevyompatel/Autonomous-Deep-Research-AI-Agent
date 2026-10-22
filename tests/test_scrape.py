"""Scraper with mocked HTTP: success, fallback, and every failure mode."""

import httpx
import pytest

from src.agent import config
from src.agent.tools import scrape as scrape_module
from src.agent.tools.scrape import scrape

ARTICLE = "Solid-state batteries replace the liquid electrolyte with a solid one. " * 20
PAGE = f"<html><head><title>T</title></head><body><nav>Menu</nav><article><p>{ARTICLE}</p></article></body></html>"


class FakeResponse:
    def __init__(self, text="", status_code=200, content_type="text/html"):
        self.text = text
        self.status_code = status_code
        self.headers = {"content-type": content_type}


@pytest.fixture(autouse=True)
def _fresh(monkeypatch):
    """No politeness delay and no cached robots.txt between tests."""
    monkeypatch.setattr(config, "HOST_DELAY_SECONDS", 0)
    scrape_module._robots.clear()
    scrape_module._next_slot.clear()


def fake_get(pages):
    """Build an httpx.get replacement serving `pages`; robots.txt is a 404."""
    def _get(url, **kwargs):
        if url.endswith("/robots.txt") and url not in pages:
            return FakeResponse(status_code=404)
        result = pages[url]
        if isinstance(result, Exception):
            raise result
        return result
    return _get


def test_returns_clean_text(monkeypatch):
    monkeypatch.setattr(httpx, "get", fake_get({"https://a.com/x": FakeResponse(PAGE)}))
    text = scrape("https://a.com/x")
    assert text and "solid one" in text
    assert "Menu" not in text


def test_truncates_to_limit(monkeypatch):
    long_page = PAGE.replace(ARTICLE, ARTICLE * 20)
    monkeypatch.setattr(httpx, "get", fake_get({"https://a.com/x": FakeResponse(long_page)}))
    assert len(scrape("https://a.com/x")) == config.MAX_CONTENT_CHARS


def test_beautifulsoup_fallback(monkeypatch):
    monkeypatch.setattr(httpx, "get", fake_get({"https://a.com/x": FakeResponse(PAGE)}))
    monkeypatch.setattr(scrape_module.trafilatura, "extract", lambda html: None)
    text = scrape("https://a.com/x")
    assert text and "solid one" in text
    assert "Menu" not in text


@pytest.mark.parametrize(
    "result",
    [
        httpx.TimeoutException("timed out"),
        httpx.ConnectError("no route"),
        FakeResponse("Not found", status_code=404),
        FakeResponse(""),
        FakeResponse("<html><body></body></html>"),
        FakeResponse("%PDF-1.7", content_type="application/pdf"),
    ],
    ids=["timeout", "connect-error", "404", "empty", "no-text", "pdf"],
)
def test_failures_return_none(monkeypatch, result):
    monkeypatch.setattr(httpx, "get", fake_get({"https://a.com/x": result}))
    assert scrape("https://a.com/x") is None


def test_respects_robots_txt(monkeypatch):
    pages = {
        "https://a.com/robots.txt": FakeResponse("User-agent: *\nDisallow: /private/"),
        "https://a.com/private/x": FakeResponse(PAGE),
        "https://a.com/public": FakeResponse(PAGE),
    }
    monkeypatch.setattr(httpx, "get", fake_get(pages))
    assert scrape("https://a.com/private/x") is None
    assert scrape("https://a.com/public")


def test_rejects_non_http_urls():
    assert scrape("file:///etc/passwd") is None


@pytest.mark.live
def test_live_scrape():
    text = scrape("https://en.wikipedia.org/wiki/Solid-state_battery")
    assert text and len(text) > 500

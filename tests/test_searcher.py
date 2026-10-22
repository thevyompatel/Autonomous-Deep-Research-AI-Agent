"""Searcher node with fake search and scrape."""

from src.agent import config
from src.agent.nodes import searcher as searcher_module


def hits_for(query, count=5):
    return [{"title": f"{query} {i}", "url": f"https://site.com/{query}/{i}",
             "snippet": f"snippet {query} {i}"} for i in range(count)]


def install(monkeypatch, search=hits_for, scrape=lambda url: f"text of {url}"):
    monkeypatch.setattr(searcher_module, "web_search", search)
    monkeypatch.setattr(searcher_module, "scrape", scrape)


def test_collects_top_sources_per_query(monkeypatch):
    install(monkeypatch)
    update = searcher_module.searcher({"sub_queries": ["a", "b"], "iteration": 0})
    assert len(update["sources"]) == 2 * config.MAX_SOURCES_PER_QUERY
    assert update["sources"][0] == {"title": "a 0", "url": "https://site.com/a/0",
                                    "snippet": "snippet a 0", "query": "a",
                                    "content": "text of https://site.com/a/0", "scraped": True}


def test_never_adds_a_url_twice_across_loops(monkeypatch):
    install(monkeypatch, search=lambda q: hits_for("same"))
    first = searcher_module.searcher({"sub_queries": ["a", "b"], "iteration": 0})
    urls = [s["url"] for s in first["sources"]]
    assert len(urls) == len(set(urls))

    second = searcher_module.searcher({"sub_queries": ["a"], "follow_up_queries": ["c"],
                                       "iteration": 1, "sources": first["sources"]})
    assert not set(urls) & {s["url"] for s in second["sources"]}


def test_uses_follow_ups_after_first_iteration(monkeypatch):
    asked = []
    install(monkeypatch, search=lambda q: asked.append(q) or hits_for(q))
    searcher_module.searcher({"sub_queries": ["a"], "follow_up_queries": ["gap"], "iteration": 1})
    assert asked == ["gap"]


def test_failed_scrape_falls_back_to_snippet(monkeypatch):
    install(monkeypatch, scrape=lambda url: None)
    update = searcher_module.searcher({"sub_queries": ["a"], "iteration": 0})
    assert [s["content"] for s in update["sources"]] == [f"snippet a {i}" for i in range(3)]
    assert not any(s["scraped"] for s in update["sources"])


def test_search_error_does_not_crash(monkeypatch):
    def broken(query):
        raise RuntimeError("search down")

    install(monkeypatch, search=broken)
    assert searcher_module.searcher({"sub_queries": ["a"], "iteration": 0}) == {"sources": []}

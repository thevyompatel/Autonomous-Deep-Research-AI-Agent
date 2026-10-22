"""Searcher node: run web searches and scrape the top pages in parallel."""

from concurrent.futures import ThreadPoolExecutor

from src.agent import config
from src.agent.config import console
from src.agent.state import ResearchState
from src.agent.tools.scrape import scrape
from src.agent.tools.search import web_search


def _pick_hits(queries: list[str], seen: set[str]) -> list[dict]:
    """Search each query and keep its top unseen hits. Adds picked URLs to `seen`."""
    picked = []
    for query in queries:
        try:
            hits = web_search(query)
        except Exception as exc:
            console.log(f"[yellow]search failed[/yellow] {query!r}: {exc}")
            continue
        fresh = [h for h in hits if h["url"] not in seen][: config.MAX_SOURCES_PER_QUERY]
        for hit in fresh:
            seen.add(hit["url"])
        picked.extend({**hit, "query": query} for hit in fresh)
        console.log(f"search {query!r}: {len(fresh)} new of {len(hits)} hits")
    return picked


def searcher(state: ResearchState) -> dict:
    """Collect new sources for the sub-queries, or the follow-ups after a critique."""
    if state.get("iteration", 0) > 0:
        queries = state.get("follow_up_queries", [])
    else:
        queries = state["sub_queries"]
    seen = {s["url"] for s in state.get("sources", [])}
    hits = _pick_hits(queries, seen)

    with ThreadPoolExecutor(max_workers=config.SCRAPE_WORKERS) as pool:
        texts = list(pool.map(scrape, [h["url"] for h in hits]))

    new_sources = []
    for hit, text in zip(hits, texts):
        # Blocked or JavaScript-only page: fall back to the search engine's extract.
        content = text or hit.get("snippet", "").strip()
        if content:
            new_sources.append(
                {**hit, "content": content[: config.MAX_CONTENT_CHARS], "scraped": bool(text)}
            )
    console.log(f"searcher: {len(new_sources)} new sources ({sum(map(bool, texts))} scraped)")
    return {"sources": new_sources}

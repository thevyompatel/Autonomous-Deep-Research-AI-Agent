"""End-to-end graph runs with a fake LLM, fake search and fake scrape."""

import re

import pytest

from src.agent import config
from src.agent.graph import build_graph
from src.agent.nodes import planner, reflector, searcher, synthesizer
from src.agent.nodes.finalizer import validate_citations
from src.agent.state import Critique, Plan


@pytest.fixture
def fakes(monkeypatch, tmp_path):
    """Install fakes. `scores` holds the reflector score for each draft in turn."""
    calls = {"scores": [5, 9], "searches": [], "drafts": 0}

    def fake_structured_call(schema, prompt):
        if schema is Plan:
            return Plan(queries=["alpha", "beta", "gamma"]), 100
        score = calls["scores"].pop(0) if calls["scores"] else 1
        return Critique(score=score, passed=score >= 8, missing=["gap"],
                        follow_up_queries=[f"follow-up {score}-{len(calls['searches'])}"]), 100

    def fake_text_call(prompt):
        calls["drafts"] += 1
        count = len(re.findall(r"^\[\d+\] ", prompt, flags=re.M))
        return f"# Report\n\n## Executive summary\n\nClaim one [1]. Claim two [{count}]. Bad [99].", 500

    def fake_search(query):
        calls["searches"].append(query)
        return [{"title": f"{query} {i}", "url": f"https://x.com/{query}/{i}".replace(" ", "-"),
                 "snippet": "s"} for i in range(4)]

    monkeypatch.setattr(planner, "structured_call", fake_structured_call)
    monkeypatch.setattr(reflector, "structured_call", fake_structured_call)
    monkeypatch.setattr(synthesizer, "text_call", fake_text_call)
    monkeypatch.setattr(searcher, "web_search", fake_search)
    monkeypatch.setattr(searcher, "scrape", lambda url: f"page text for {url}")
    monkeypatch.setattr(config, "REPORTS_DIR", tmp_path)
    return calls


def run(question="Compare A and B?"):
    return build_graph().invoke({"question": question},
                                config={"recursion_limit": config.RECURSION_LIMIT})


def test_loops_once_then_writes_report(fakes, tmp_path):
    final = run()

    assert final["iteration"] == 2
    assert [c["score"] for c in final["critiques"]] == [5, 9]
    assert fakes["searches"] == ["alpha", "beta", "gamma", "follow-up 5-3"]
    assert len(final["sources"]) == 4 * config.MAX_SOURCES_PER_QUERY
    assert len({s["url"] for s in final["sources"]}) == len(final["sources"])
    assert final["tokens_used"] == 100 + 500 + 100 + 500 + 100

    files = [p.name for p in tmp_path.iterdir()]
    assert len(files) == 2 and sum(f.endswith("-draft1.md") for f in files) == 1
    saved = open(final["report_path"], encoding="utf-8").read()
    assert saved == final["final_report"]
    assert "[99]" not in saved
    assert "## Sources" in saved
    assert all(s["url"] in saved for s in final["sources"])


def test_stops_at_iteration_cap(fakes):
    fakes["scores"] = [1] * 10
    final = run()
    assert final["iteration"] == config.MAX_ITERATIONS
    assert fakes["drafts"] == config.MAX_ITERATIONS
    assert final["passed"] is False
    assert final["final_report"]


def test_passes_first_time_without_looping(fakes, tmp_path):
    fakes["scores"] = [9]
    final = run()
    assert final["iteration"] == 1
    assert len(list(tmp_path.iterdir())) == 1


def test_no_sources_still_finishes(fakes, monkeypatch):
    monkeypatch.setattr(searcher, "web_search", lambda q: [])
    final = run()
    assert "Insufficient evidence" in final["final_report"]
    assert fakes["drafts"] == 0


def test_validate_citations():
    text = "A [1]. B [2, 7]. C [9]. D [3][4]. Link [5](http://x)."
    fixed, removed = validate_citations(text, 4)
    assert fixed == "A [1]. B [2]. C . D [3][4]. Link [5](http://x)."
    assert removed == [7, 9]


@pytest.mark.live
def test_live_run_finishes_within_caps():
    import time

    if config.missing_keys():
        pytest.skip("API keys not configured")
    started = time.monotonic()
    final = run("What is a solid-state battery and who is closest to mass production?")
    assert final["final_report"] and final["iteration"] <= config.MAX_ITERATIONS
    assert final["tokens_used"] <= config.MAX_TOKENS_PER_RUN * 1.5
    assert time.monotonic() - started < 300

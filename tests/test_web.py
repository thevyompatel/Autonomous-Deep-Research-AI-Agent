"""Web UI server: status, the streamed job, reattach, stop and saved reports."""

import asyncio
import json
import time

import pytest
from starlette.testclient import TestClient

from app import web
from src.agent import config, llm


@pytest.fixture
def client(monkeypatch, tmp_path):
    """A test client with reports and quota usage kept in tmp_path and no current job."""
    monkeypatch.setattr(config, "REPORTS_DIR", tmp_path / "reports")
    monkeypatch.setattr(config, "LLM_USAGE_FILE", tmp_path / "usage.json")
    monkeypatch.setattr(config, "missing_keys", lambda: [])
    monkeypatch.setattr(web, "_current", None)
    (tmp_path / "reports").mkdir()
    return TestClient(web.app)


def fake_stream(question):
    """Yield one update per node, like stream_research, with one revision round."""
    source = {"title": "Example", "url": "https://www.example.com/a", "snippet": "s",
              "content": "c", "scraped": True, "query": "q1"}
    critique = {"score": 6, "passed": False, "missing": ["gap"], "follow_up_queries": ["more"]}
    yield "planner", {"sub_queries": ["q1", "q2", "q3"], "tokens_used": 10}
    yield "searcher", {"sources": [source]}
    yield "synthesizer", {"draft": "# R\n\nClaim [1].", "drafts": ["d1"], "tokens_used": 20}
    yield "reflector", {"critique": critique, "critiques": [critique], "iteration": 1,
                        "follow_up_queries": ["more"], "passed": False, "tokens_used": 5}
    yield "searcher", {"sources": [{**source, "url": "https://b.org/x", "scraped": False,
                                    "query": "more"}]}
    yield "synthesizer", {"draft": "# R\n\nClaim [2].", "drafts": ["d2"], "tokens_used": 20}
    passed = {**critique, "score": 9, "passed": True, "follow_up_queries": []}
    yield "reflector", {"critique": passed, "critiques": [passed], "iteration": 2,
                        "follow_up_queries": [], "passed": True, "tokens_used": 5}
    path = config.REPORTS_DIR / "r-2026-10-22.md"
    path.write_text("# Research Report: R\n\nClaim [2].", encoding="utf-8")
    path.with_name("r-2026-10-22-draft1.md").write_text("# R\n\nClaim [1].", encoding="utf-8")
    yield "finalizer", {"final_report": "# Research Report: R\n\nClaim [2].",
                        "report_path": str(path)}


def events(response) -> list[dict]:
    """Parse a newline-delimited JSON response body."""
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def run_job(client, monkeypatch, stream=fake_stream, question="What is R?") -> list[dict]:
    """Start a job with a fake graph and return all of its events."""
    monkeypatch.setattr(web, "stream_research", stream)
    response = client.post("/api/research", json={"question": question})
    assert response.status_code == 200
    return events(response)


def test_status_without_a_job(client):
    data = client.get("/api/status").json()
    assert data["model"] == config.MODEL_NAME
    assert data["usage"] == {"used": 0, "cap": config.LLM_REQUESTS_PER_DAY}
    assert data["busy"] is False
    assert data["run"] is None


def test_index_serves_the_app_or_build_instructions(client):
    response = client.get("/")
    assert response.status_code in (200, 503)
    assert "<html" in response.text.lower() or "npm run build" in response.text


def test_job_streams_numbered_events(client, monkeypatch):
    stream = run_job(client, monkeypatch)
    assert [e["seq"] for e in stream] == list(range(1, len(stream) + 1))
    assert all("t" in e for e in stream)
    start = stream[0]
    assert start["type"] == "start" and start["question"] == "What is R?"
    nodes = [e["node"] for e in stream if e["type"] == "node"]
    assert nodes == ["planner", "searcher", "synthesizer", "reflector",
                     "searcher", "synthesizer", "reflector", "finalizer"]

    searches = [e for e in stream if e.get("node") == "searcher"]
    assert [s["n"] for e in searches for s in e["sources"]] == [1, 2]
    first = searches[0]["sources"][0]
    assert first["domain"] == "example.com" and first["scraped"] is True and first["query"] == "q1"
    assert "content" not in first
    assert searches[1]["sources"][0]["scraped"] is False
    assert [e["round"] for e in searches] == [1, 2]

    drafts = [e for e in stream if e.get("node") == "synthesizer"]
    assert drafts[0]["draft"].startswith("# R") and drafts[0]["draft_number"] == 1

    reviews = [e for e in stream if e.get("node") == "reflector"]
    assert [(e["next"], e["reason"]) for e in reviews] == [("searcher", "retry"),
                                                          ("finalizer", "passed")]

    done = stream[-1]
    assert done["type"] == "done"
    assert (done["name"], done["title"], done["final_score"]) == ("r-2026-10-22", "R", 9)
    assert done["first_draft"] == "r-2026-10-22-draft1"
    assert done["markdown"].startswith("# Research Report")


def test_job_saves_run_metadata(client, monkeypatch):
    run_job(client, monkeypatch)
    meta = json.loads((config.REPORTS_DIR / "r-2026-10-22.json").read_text(encoding="utf-8"))
    assert meta["question"] == "What is R?"
    assert (meta["iterations"], meta["final_score"], meta["passed"]) == (2, 9, True)
    assert [s["n"] for s in meta["sources"]] == [1, 2]


def test_status_reports_the_finished_job(client, monkeypatch):
    stream = run_job(client, monkeypatch)
    run = client.get("/api/status").json()["run"]
    assert run["id"] == stream[0]["run_id"]
    assert run["status"] == "done"
    assert run["last_seq"] == stream[-1]["seq"]


def test_reattach_replays_only_missed_events(client, monkeypatch):
    stream = run_job(client, monkeypatch)
    run_id = stream[0]["run_id"]
    replay = events(client.get(f"/api/runs/{run_id}/events?after=3"))
    assert [e["seq"] for e in replay] == [e["seq"] for e in stream[3:]]
    assert replay[-1]["type"] == "done"


def test_reattach_rejects_unknown_jobs_and_bad_offsets(client, monkeypatch):
    assert client.get("/api/runs/nope/events").status_code == 404
    run_id = run_job(client, monkeypatch)[0]["run_id"]
    assert client.get(f"/api/runs/{run_id}/events?after=x").status_code == 400


def test_errors_are_classified(client, monkeypatch):
    def broken(question):
        yield "planner", {"sub_queries": ["a", "b", "c"]}
        raise RuntimeError("Daily Gemini request cap reached (20/20).")

    error = run_job(client, monkeypatch, stream=broken)[-1]
    assert (error["type"], error["kind"]) == ("error", "daily_cap")
    assert client.get("/api/status").json()["run"]["status"] == "error"


def test_quota_waits_become_notices(client, monkeypatch):
    def waits(question):
        for listener in list(llm.quota_listeners):
            listener(31.0)
        yield from fake_stream(question)

    notices = [e for e in run_job(client, monkeypatch, stream=waits) if e["type"] == "notice"]
    assert notices[0]["kind"] == "rate_limit" and notices[0]["seconds"] == 31
    assert llm.quota_listeners == []


def test_stop_ends_the_job_after_the_current_step(client, monkeypatch):
    def stopped_mid_run(question):
        yield "planner", {"sub_queries": ["a", "b", "c"]}
        web._current.request_stop("user")  # as if the user pressed Stop now
        yield "searcher", {"sources": []}
        raise AssertionError("the graph should not run past a stop")

    stream = run_job(client, monkeypatch, stream=stopped_mid_run)
    assert [e["type"] for e in stream][-3:] == ["notice", "node", "stopped"]
    assert stream[-1]["reason"] == "user"


def test_stop_endpoint(client):
    run = web.Run("q")
    web._current = run
    assert client.post("/api/runs/nope/stop").status_code == 404
    assert client.post(f"/api/runs/{run.id}/stop").status_code == 202
    assert run.stop.is_set() and run.events[-1]["kind"] == "stopping"
    assert client.get("/api/status").json()["run"]["status"] == "stopping"
    run.status = "done"
    run.stop.clear()
    assert client.post(f"/api/runs/{run.id}/stop").status_code == 409


def test_job_stops_when_nobody_reconnects(monkeypatch):
    monkeypatch.setattr(web, "RECONNECT_GRACE_SECONDS", 0.05)
    run = web.Run("q")
    loop, queue = asyncio.new_event_loop(), asyncio.Queue()
    run.subscribe(loop, queue, 0)
    run.unsubscribe(loop, queue)
    time.sleep(0.3)
    assert run.stop.is_set() and run.stop_reason == "disconnected"
    loop.close()


def test_reconnecting_cancels_the_grace_timer(monkeypatch):
    monkeypatch.setattr(web, "RECONNECT_GRACE_SECONDS", 0.1)
    run = web.Run("q")
    loop = asyncio.new_event_loop()
    first, second = asyncio.Queue(), asyncio.Queue()
    run.subscribe(loop, first, 0)
    run.unsubscribe(loop, first)
    run.subscribe(loop, second, 0)
    time.sleep(0.3)
    assert not run.stop.is_set()
    loop.close()


@pytest.mark.parametrize("body", [{}, {"question": "  "}, {"question": "x" * 501}, ["q"]])
def test_research_rejects_bad_questions(client, body):
    assert client.post("/api/research", json=body).status_code == 400


def test_research_rejects_a_second_job(client):
    web._current = web.Run("busy")
    response = client.post("/api/research", json={"question": "x"})
    assert response.status_code == 409
    assert response.json()["run_id"] == web._current.id


def test_research_needs_keys(client, monkeypatch):
    monkeypatch.setattr(config, "missing_keys", lambda: ["GEMINI_API_KEY"])
    response = client.post("/api/research", json={"question": "x"})
    assert response.status_code == 503
    assert response.json()["missing_keys"] == ["GEMINI_API_KEY"]


def test_reports_list_fetch_and_download(client):
    reports = config.REPORTS_DIR
    (reports / "sle-2026-10-19.md").write_text("# Research Report: SLE\n\nText [1].",
                                               encoding="utf-8")
    (reports / "sle-2026-10-19-draft1.md").write_text("# Draft", encoding="utf-8")
    (reports / "sle-2026-10-19.json").write_text(json.dumps({"final_score": 9, "iterations": 2}),
                                                 encoding="utf-8")
    (reports / "plain-2026-10-18.md").write_text("# Plain\n\nText.", encoding="utf-8")

    listing = {r["name"]: r for r in client.get("/api/reports").json()}
    assert set(listing) == {"sle-2026-10-19", "plain-2026-10-18"}  # draft copy hidden
    sle = listing["sle-2026-10-19"]
    assert (sle["title"], sle["revised"], sle["final_score"]) == ("SLE", True, 9)
    assert listing["plain-2026-10-18"]["revised"] is False

    report = client.get("/api/reports/sle-2026-10-19").json()
    assert report["first_draft"] == "sle-2026-10-19-draft1"
    assert report["markdown"].startswith("# Research Report: SLE")
    assert report["meta"]["iterations"] == 2
    assert client.get("/api/reports/plain-2026-10-18").json()["meta"] is None

    raw = client.get("/api/reports/sle-2026-10-19/raw")
    assert raw.text.startswith("# Research Report")
    assert "attachment" in raw.headers["content-disposition"]


@pytest.mark.parametrize("name", ["missing", "..%2F..%2F.env", "UPPER", "-x"])
def test_report_rejects_unknown_names(client, name):
    assert client.get(f"/api/reports/{name}").status_code == 404
    assert client.get(f"/api/reports/{name}/raw").status_code == 404

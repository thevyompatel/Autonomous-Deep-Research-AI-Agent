"""Web UI server: python -m app.web, then open http://127.0.0.1:8000.

Serves the built React app in app/static (source in app/frontend) and runs
one research job at a time in a worker thread. Every event a job emits is
numbered (`seq`) and kept in memory, so a browser that loses its connection
can reattach with GET /api/runs/{id}/events?after=N and replay what it
missed. A job with no connected browser for RECONNECT_GRACE_SECONDS stops
after its current step, so closing the tab still stops the agent.
"""

import asyncio
import contextlib
import json
import re
import threading
import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import uvicorn
from google.api_core.exceptions import ResourceExhausted
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse, Response
from starlette.responses import StreamingResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from app.run import describe, merge
from src.agent import config, llm
from src.agent.graph import route_after_reflection, stream_research

STATIC_DIR = Path(__file__).resolve().parent / "static"
MAX_QUESTION_CHARS = 500
HEARTBEAT_SECONDS = 15.0
RECONNECT_GRACE_SECONDS = 20.0
TERMINAL = {"done", "error", "stopped"}
_REPORT_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def report_title(markdown: str, fallback: str) -> str:
    """First top-level heading of a report, without a 'Research Report:' prefix."""
    match = re.search(r"^#\s+(.+)$", markdown, flags=re.M)
    if not match:
        return fallback
    return re.sub(r"^research report:\s*", "", match.group(1).strip(), flags=re.I)


def _usage() -> dict:
    """Today's Gemini request count and the configured daily cap."""
    return {"used": llm.daily_usage(), "cap": config.LLM_REQUESTS_PER_DAY}


def _source(number: int, source: dict) -> dict:
    """Browser-facing view of one source, without the scraped page text."""
    url = source["url"]
    return {
        "n": number,
        "title": source.get("title") or url,
        "url": url,
        "domain": urlparse(url).netloc.removeprefix("www."),
        "snippet": (source.get("snippet") or source.get("content", ""))[:300],
        "scraped": bool(source.get("scraped", True)),
        "query": source.get("query", ""),
    }


def _decision(state: dict) -> str:
    """Why the router picked its next step, mirroring route_after_reflection."""
    if state["critique"]["passed"]:
        return "passed"
    if state["iteration"] >= config.MAX_ITERATIONS:
        return "max_iterations"
    if state.get("tokens_used", 0) >= config.MAX_TOKENS_PER_RUN:
        return "token_cap"
    if not state.get("follow_up_queries"):
        return "no_follow_ups"
    return "retry"


def _node_event(node: str, update: dict, state: dict) -> dict:
    """Summarise one node's update for the browser. `state` already includes it."""
    event = {
        "type": "node",
        "node": node,
        "summary": describe(node, update),
        "tokens": state.get("tokens_used", 0),
        "source_count": len(state.get("sources", [])),
        "usage": _usage(),
    }
    if node == "planner":
        event["sub_queries"] = update["sub_queries"]
    elif node == "searcher":
        new = update.get("sources", [])
        first = len(state.get("sources", [])) - len(new) + 1
        follow_up = state.get("iteration", 0) > 0
        event["round"] = state.get("iteration", 0) + 1
        event["queries"] = state.get("follow_up_queries" if follow_up else "sub_queries", [])
        event["sources"] = [_source(n, s) for n, s in enumerate(new, start=first)]
    elif node == "synthesizer":
        event["draft_number"] = len(state.get("drafts", []))
        event["words"] = len(update["draft"].split())
        event["draft"] = update["draft"]
    elif node == "reflector":
        event["critique"] = update["critique"]
        event["iteration"] = update["iteration"]
        event["next"] = route_after_reflection(state)
        event["reason"] = _decision(state)
    elif node == "finalizer":
        event["name"] = Path(update["report_path"]).stem
    return event


def _error_event(exc: Exception) -> dict:
    """Classify a failed run so the UI can suggest the right fix."""
    message = str(exc)
    if "Daily Gemini request cap" in message:
        kind = "daily_cap"
    elif isinstance(exc, ResourceExhausted) or "429" in message:
        kind = "rate_limit"
    elif "is not set" in message:
        kind = "missing_keys"
    else:
        kind = "agent"
    return {"type": "error", "kind": kind, "message": message, "usage": _usage()}


def _save_meta(state: dict, seconds: float) -> dict:
    """Write reports/<name>.json next to the report so the library can show run details."""
    critiques = state.get("critiques", [])
    meta = {
        "question": state["question"],
        "model": config.MODEL_NAME,
        "created": datetime.now().isoformat(timespec="seconds"),
        "seconds": round(seconds, 1),
        "tokens": state.get("tokens_used", 0),
        "iterations": state.get("iteration", 0),
        "final_score": critiques[-1]["score"] if critiques else None,
        "passed": critiques[-1]["passed"] if critiques else None,
        "sources": [_source(n, s) for n, s in enumerate(state.get("sources", []), start=1)],
    }
    path = Path(state["report_path"]).with_suffix(".json")
    try:
        path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError as exc:  # the report itself is already saved
        config.console.log(f"[yellow]could not save {path.name}: {exc}[/yellow]")
    return meta


@dataclass
class Run:
    """One research job: its events, subscribers and stop flag."""

    question: str
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    started_at: float = field(default_factory=time.time)
    status: str = "running"  # running | done | error | stopped
    stop_reason: str | None = None
    events: list[dict] = field(default_factory=list)
    stop: threading.Event = field(default_factory=threading.Event)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)
    _subscribers: set = field(default_factory=set, repr=False)
    _grace: threading.Timer | None = field(default=None, repr=False)

    def publish(self, event: dict) -> dict:
        """Number an event, store it and push it to every connected browser."""
        with self._lock:
            event = {"seq": len(self.events) + 1,
                     "t": round(time.time() - self.started_at, 1), **event}
            self.events.append(event)
            if event["type"] in TERMINAL:
                self.status = event["type"]
            subscribers = list(self._subscribers)
        for loop, queue in subscribers:
            with contextlib.suppress(RuntimeError):  # that browser's loop is gone
                loop.call_soon_threadsafe(queue.put_nowait, event)
        return event

    def subscribe(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue,
                  after: int) -> list[dict]:
        """Attach a browser and return the events it has not seen yet."""
        with self._lock:
            self._subscribers.add((loop, queue))
            if self._grace:
                self._grace.cancel()
                self._grace = None
            return self.events[after:]

    def unsubscribe(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue) -> None:
        """Detach a browser; the last one leaving starts the reconnect grace timer."""
        with self._lock:
            self._subscribers.discard((loop, queue))
            if self._subscribers or self.status != "running":
                return
            self._grace = threading.Timer(RECONNECT_GRACE_SECONDS, self._abandon)
            self._grace.daemon = True
            self._grace.start()

    def _abandon(self) -> None:
        """Stop a job nobody reconnected to."""
        with self._lock:
            if self._subscribers:
                return
        self.request_stop("disconnected")

    def request_stop(self, reason: str) -> bool:
        """Ask the job to stop after its current step. False if it already finished."""
        if self.status != "running" or self.stop.is_set():
            return False
        self.stop_reason = reason
        self.stop.set()
        self.publish({"type": "notice", "kind": "stopping", "reason": reason,
                      "message": "Stopping after the current step finishes."})
        return True

    def summary(self) -> dict:
        """Status-endpoint view of this job."""
        status = "stopping" if self.status == "running" and self.stop.is_set() else self.status
        return {"id": self.id, "question": self.question, "status": status,
                "started_at": self.started_at, "last_seq": len(self.events)}


_current: Run | None = None
_start_lock = threading.Lock()


def _work(run: Run) -> None:
    """Run the graph in a worker thread, publishing one event per node."""
    state: dict = {"question": run.question}
    run.publish({
        "type": "start",
        "run_id": run.id,
        "question": run.question,
        "model": config.MODEL_NAME,
        "started_at": run.started_at,
        "max_iterations": config.MAX_ITERATIONS,
        "pass_score": config.PASS_SCORE,
        "max_tokens": config.MAX_TOKENS_PER_RUN,
        "usage": _usage(),
    })

    def on_quota_wait(seconds: float) -> None:
        run.publish({"type": "notice", "kind": "rate_limit", "seconds": round(seconds),
                     "message": f"Gemini's per-minute quota was hit. Waiting {seconds:.0f} s "
                                "before retrying."})

    llm.quota_listeners.append(on_quota_wait)
    try:
        for node, update in stream_research(run.question):
            merge(state, update)
            run.publish(_node_event(node, update, state))
            if run.stop.is_set() and node != "finalizer":
                run.publish({"type": "stopped", "reason": run.stop_reason or "user"})
                return  # closing the generator stops the graph before the next node
        seconds = time.time() - run.started_at
        meta = _save_meta(state, seconds)
        report = state.get("final_report", "")
        draft = Path(state["report_path"]).with_name(f"{Path(state['report_path']).stem}-draft1.md")
        run.publish({
            "type": "done",
            "name": Path(state["report_path"]).stem,
            "title": report_title(report, run.question),
            "markdown": report,
            "seconds": meta["seconds"],
            "tokens": meta["tokens"],
            "iterations": meta["iterations"],
            "final_score": meta["final_score"],
            "first_draft": draft.stem if draft.is_file() else None,
            "usage": _usage(),
        })
    except Exception as exc:  # shown in the browser rather than killing the thread
        run.publish(_error_event(exc))
    finally:
        with contextlib.suppress(ValueError):
            llm.quota_listeners.remove(on_quota_wait)


def _line(event: dict) -> bytes:
    """Encode one event as a line of newline-delimited JSON."""
    return (json.dumps(event, ensure_ascii=False) + "\n").encode("utf-8")


def _stream(run: Run, after: int) -> StreamingResponse:
    """Stream a job's events with seq > after, then live ones, until it ends."""

    async def events() -> AsyncIterator[bytes]:
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[dict] = asyncio.Queue()
        backlog = run.subscribe(loop, queue, after)
        last = after
        try:
            for event in backlog:
                yield _line(event)
                last = event["seq"]
                if event["type"] in TERMINAL:
                    return
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), HEARTBEAT_SECONDS)
                except TimeoutError:
                    yield _line({"type": "heartbeat"})  # lets the browser spot a dead link
                    continue
                if event["seq"] <= last:
                    continue
                yield _line(event)
                last = event["seq"]
                if event["type"] in TERMINAL:
                    return
        finally:
            run.unsubscribe(loop, queue)

    return StreamingResponse(
        events(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


async def research(request: Request) -> Response:
    """POST {"question": ...}: start a job and stream its events."""
    global _current
    try:
        body = await request.json()
    except ValueError:
        body = None
    question = str(body.get("question", "")).strip() if isinstance(body, dict) else ""
    if not question or len(question) > MAX_QUESTION_CHARS:
        return JSONResponse(
            {"error": f"Enter a question of 1 to {MAX_QUESTION_CHARS} characters."}, 400
        )
    missing = config.missing_keys()
    if missing:
        return JSONResponse(
            {"error": f"Missing keys in .env: {', '.join(missing)}", "missing_keys": missing}, 503
        )
    with _start_lock:
        if _current and _current.status == "running":
            return JSONResponse(
                {"error": "A research job is already running.", "run_id": _current.id}, 409
            )
        run = _current = Run(question)
    threading.Thread(target=_work, args=(run,), daemon=True).start()
    return _stream(run, after=0)


def _find_run(request: Request) -> Run | None:
    """The job named in the URL, if it is the current one."""
    run = _current
    return run if run and run.id == request.path_params["run_id"] else None


async def run_events(request: Request) -> Response:
    """GET ?after=N: reattach to a job and replay the events after seq N."""
    run = _find_run(request)
    if not run:
        return JSONResponse({"error": "That research job is no longer available."}, 404)
    try:
        after = max(0, int(request.query_params.get("after", "0")))
    except ValueError:
        return JSONResponse({"error": "after must be an integer."}, 400)
    return _stream(run, after)


async def stop_run(request: Request) -> Response:
    """POST: stop a job after its current step."""
    run = _find_run(request)
    if not run:
        return JSONResponse({"error": "That research job is no longer available."}, 404)
    if not run.request_stop("user") and not run.stop.is_set():
        return JSONResponse({"error": "That research job has already finished."}, 409)
    return JSONResponse({"stopping": True}, 202)


async def status(_request: Request) -> Response:
    """Model, missing keys, quota usage, limits and the current job, if any."""
    run = _current
    return JSONResponse({
        "model": config.MODEL_NAME,
        "missing_keys": config.missing_keys(),
        "usage": _usage(),
        "requests_per_minute": config.LLM_REQUESTS_PER_MINUTE,
        "max_iterations": config.MAX_ITERATIONS,
        "pass_score": config.PASS_SCORE,
        "max_tokens": config.MAX_TOKENS_PER_RUN,
        "busy": bool(run and run.status == "running"),
        "run": run.summary() if run else None,
    })


def _modified(path: Path) -> str:
    """A file's modification time as an ISO string."""
    return datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds")


def _meta(path: Path) -> dict | None:
    """The run metadata saved next to a report by the web UI, if any."""
    try:
        return json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _report_path(name: str) -> Path | None:
    """reports/<name>.md if the name is safe and the file exists."""
    path = Path(config.REPORTS_DIR) / f"{name}.md"
    return path if _REPORT_NAME.match(name) and path.is_file() else None


async def reports(_request: Request) -> Response:
    """Saved reports, newest first. First-draft copies are left out."""
    directory = Path(config.REPORTS_DIR)
    paths = [p for p in directory.glob("*.md") if not p.stem.endswith("-draft1")]
    items = []
    for path in sorted(paths, key=lambda p: p.stat().st_mtime, reverse=True):
        text = path.read_text(encoding="utf-8", errors="replace")
        meta = _meta(path) or {}
        items.append({
            "name": path.stem,
            "title": report_title(text, path.stem),
            "modified": _modified(path),
            "words": len(text.split()),
            "revised": path.with_name(f"{path.stem}-draft1.md").is_file(),
            "question": meta.get("question"),
            "final_score": meta.get("final_score"),
            "iterations": meta.get("iterations"),
        })
    return JSONResponse(items)


async def report(request: Request) -> Response:
    """One saved report as Markdown, plus its run metadata when available."""
    name = request.path_params["name"]
    path = _report_path(name)
    if not path:
        return JSONResponse({"error": "Report not found."}, 404)
    text = path.read_text(encoding="utf-8", errors="replace")
    draft = path.with_name(f"{name}-draft1.md")
    return JSONResponse({
        "name": name,
        "title": report_title(text, name),
        "markdown": text,
        "modified": _modified(path),
        "words": len(text.split()),
        "first_draft": draft.stem if draft.is_file() else None,
        "meta": _meta(path),
    })


async def report_raw(request: Request) -> Response:
    """Download one saved report as a .md file."""
    name = request.path_params["name"]
    path = _report_path(name)
    if not path:
        return JSONResponse({"error": "Report not found."}, 404)
    return FileResponse(path, media_type="text/markdown; charset=utf-8", filename=path.name)


async def index(_request: Request) -> Response:
    """The single-page app, or build instructions if it has not been built."""
    page = STATIC_DIR / "index.html"
    if not page.is_file():
        return HTMLResponse(
            "<h1>Frontend not built</h1><p>Run <code>npm install</code> and "
            "<code>npm run build</code> in <code>app/frontend</code>.</p>", 503
        )
    return FileResponse(page, headers={"Cache-Control": "no-cache"})


STATIC_DIR.mkdir(exist_ok=True)
app = Starlette(routes=[
    Route("/", index),
    Route("/api/status", status),
    Route("/api/research", research, methods=["POST"]),
    Route("/api/runs/{run_id}/events", run_events),
    Route("/api/runs/{run_id}/stop", stop_run, methods=["POST"]),
    Route("/api/reports", reports),
    Route("/api/reports/{name}", report),
    Route("/api/reports/{name}/raw", report_raw),
    Mount("/static", StaticFiles(directory=STATIC_DIR), name="static"),
])


def main() -> None:
    """Start the server on WEB_HOST:WEB_PORT."""
    config.console.print(
        f"Deep Research UI running at [bold]http://{config.WEB_HOST}:{config.WEB_PORT}[/bold]"
        " (Ctrl+C to stop)"
    )
    uvicorn.run(app, host=config.WEB_HOST, port=config.WEB_PORT, log_level="warning")


if __name__ == "__main__":
    main()

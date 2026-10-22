"""Command-line interface: python -m app.cli "your question"."""

import sys
import time

from rich.markdown import Markdown
from rich.panel import Panel

from app.run import NEXT_STEP, describe, merge
from src.agent import config
from src.agent.config import console
from src.agent.graph import stream_research


def run(question: str) -> dict:
    """Run one research question with live progress and return the final state."""
    state: dict = {"question": question}
    started = time.monotonic()
    with console.status("Planning sub-queries...") as status:
        for node, update in stream_research(question):
            merge(state, update)
            console.log(f"[bold cyan]{node}[/bold cyan]: {describe(node, update)}")
            if node == "planner":
                for query in update["sub_queries"]:
                    console.log(f"  - {query}")
            if node == "reflector" and not update["critique"]["passed"]:
                for gap in update["critique"]["missing"]:
                    console.log(f"  - gap: {gap}")
            status.update(NEXT_STEP.get(node, "Working..."))
    state["seconds"] = time.monotonic() - started
    return state


def main() -> int:
    """Entry point. Returns a process exit code."""
    question = " ".join(sys.argv[1:]).strip()
    if not question:
        console.print('Usage: python -m app.cli "your research question"')
        return 2
    missing = config.missing_keys()
    if missing:
        console.print(f"[red]Missing keys in .env: {', '.join(missing)}[/red]")
        return 1

    console.print(Panel(question, title="Research question"))
    state = run(question)
    console.print(Markdown(state["final_report"]))
    scores = " -> ".join(str(c["score"]) for c in state.get("critiques", []))
    console.print(
        Panel(
            f"Report: {state['report_path']}\n"
            f"Review rounds: {state.get('iteration', 0)} (scores {scores})\n"
            f"Sources: {len(state.get('sources', []))}\n"
            f"Tokens: {state.get('tokens_used', 0):,}\n"
            f"Time: {state['seconds']:.0f} s",
            title="Run summary",
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

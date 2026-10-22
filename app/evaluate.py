"""Run the five evaluation questions and write reports/evaluation.md.

Usage: python -m app.evaluate
"""

import sys
from pathlib import Path

from app.cli import run
from src.agent import config
from src.agent.config import console

QUESTIONS = {
    "Factual comparison": "Compare solid-state and lithium-ion EV batteries for 2026",
    "Recent news": "What are the most significant AI regulation developments of 2026?",
    "Technical how-it-works": "How does retrieval-augmented generation work, and what are its main failure modes?",
    "Market overview": "What is the state of the global semiconductor foundry market in 2026?",
    "Controversial topic": "Is nuclear power necessary to reach net-zero emissions by 2050?",
}


def main() -> int:
    """Run every question and save the metrics table."""
    missing = config.missing_keys()
    if missing:
        console.print(f"[red]Missing keys in .env: {', '.join(missing)}[/red]")
        return 1
    rows = [
        "| Type | Question | Iterations | First score | Final score | Sources | Time (s) | Tokens | Report |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for kind, question in QUESTIONS.items():
        console.rule(kind)
        try:
            state = run(question)
        except Exception as exc:
            console.print(f"[red]failed: {exc}[/red]")
            rows.append(f"| {kind} | {question} | failed: {exc} | | | | | | |")
            continue
        scores = [c["score"] for c in state.get("critiques", [])] or ["n/a"]
        rows.append(
            f"| {kind} | {question} | {state.get('iteration', 0)} | {scores[0]} | {scores[-1]} "
            f"| {len(state.get('sources', []))} | {state['seconds']:.0f} "
            f"| {state.get('tokens_used', 0):,} | {Path(state['report_path']).name} |"
        )
    out = Path(config.REPORTS_DIR) / "evaluation.md"
    out.write_text("# Evaluation results\n\n" + "\n".join(rows) + "\n", encoding="utf-8")
    console.print(f"Saved {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

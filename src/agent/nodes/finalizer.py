"""Finalizer node: validate citations and save the report to reports/."""

import re
from datetime import date
from pathlib import Path

from src.agent import config
from src.agent.config import console
from src.agent.state import ResearchState

_CITATION = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\](?!\()")


def validate_citations(report: str, source_count: int) -> tuple[str, list[int]]:
    """Drop citation numbers with no matching source. Returns (report, removed)."""
    removed: list[int] = []

    def _fix(match: re.Match) -> str:
        numbers = [int(n) for n in match.group(1).split(",")]
        valid = [n for n in numbers if 1 <= n <= source_count]
        removed.extend(n for n in numbers if n not in valid)
        return f"[{', '.join(map(str, valid))}]" if valid else ""

    return _CITATION.sub(_fix, report), removed


def slugify(text: str, max_length: int = 60) -> str:
    """Make a filesystem-safe slug from the question."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:max_length].rstrip("-") or "report"


def _unique_path(directory: Path, stem: str) -> Path:
    """Return directory/stem.md, adding a counter if that file already exists."""
    path = directory / f"{stem}.md"
    counter = 2
    while path.exists():
        path = directory / f"{stem}-{counter}.md"
        counter += 1
    return path


def finalizer(state: ResearchState) -> dict:
    """Save the final report, plus the first draft when the loop revised it."""
    source_count = len(state.get("sources", []))
    report, removed = validate_citations(state["draft"], source_count)
    if removed:
        console.log(f"[yellow]finalizer: removed invalid citations {sorted(set(removed))}[/yellow]")

    directory = Path(config.REPORTS_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    path = _unique_path(directory, f"{slugify(state['question'])}-{date.today().isoformat()}")
    path.write_text(report, encoding="utf-8")

    drafts = state.get("drafts", [])
    if len(drafts) > 1:
        first, _ = validate_citations(drafts[0], source_count)
        path.with_name(f"{path.stem}-draft1.md").write_text(first, encoding="utf-8")
    return {"final_report": report, "report_path": str(path)}

"""Synthesizer node: write a cited Markdown draft from the numbered sources."""

from datetime import date

from src.agent.llm import text_call
from src.agent.prompts import SYNTHESIZER_CRITIQUE_BLOCK, SYNTHESIZER_PROMPT
from src.agent.state import ResearchState

NO_SOURCES_DRAFT = (
    "# {question}\n\n## Executive summary\n\nInsufficient evidence: no web sources "
    "could be retrieved for this question, so no report could be written.\n"
)


def format_sources(sources: list[dict]) -> str:
    """Render sources as numbered blocks [1]..[n] for the prompt."""
    return "\n\n".join(
        f"[{i}] {s['title']}\nURL: {s['url']}\n{s['content']}"
        for i, s in enumerate(sources, start=1)
    )


def sources_section(sources: list[dict]) -> str:
    """Build the report's Sources list from state, so URLs are never model-written."""
    lines = [f"{i}. [{s['title']}]({s['url']})" for i, s in enumerate(sources, start=1)]
    return "## Sources\n\n" + "\n".join(lines)


def _critique_block(critique: dict | None) -> str:
    """Format the previous critique for the prompt, or return an empty string."""
    if not critique:
        return ""
    missing = "\n".join(f"- {m}" for m in critique.get("missing", [])) or "- (none listed)"
    return SYNTHESIZER_CRITIQUE_BLOCK.format(score=critique.get("score"), missing=missing)


def synthesizer(state: ResearchState) -> dict:
    """Write a draft that cites only the sources in state."""
    sources = state.get("sources", [])
    if not sources:
        draft = NO_SOURCES_DRAFT.format(question=state["question"])
        return {"draft": draft, "drafts": [draft]}
    body, tokens = text_call(
        SYNTHESIZER_PROMPT.format(
            question=state["question"],
            sources=format_sources(sources),
            critique_block=_critique_block(state.get("critique")),
            today=date.today().isoformat(),
        )
    )
    draft = f"{body}\n\n{sources_section(sources)}\n"
    return {"draft": draft, "drafts": [draft], "tokens_used": tokens}

"""Reflector node: review the draft and propose follow-up searches."""

from datetime import date

from src.agent import config
from src.agent.llm import structured_call
from src.agent.prompts import REFLECTOR_PROMPT
from src.agent.state import Critique, ResearchState


def reflector(state: ResearchState) -> dict:
    """Score the draft as a strict reviewer and advance the loop counter."""
    critique, tokens = structured_call(
        Critique,
        REFLECTOR_PROMPT.format(
            question=state["question"],
            sub_queries="\n".join(f"- {q}" for q in state.get("sub_queries", [])),
            source_count=len(state.get("sources", [])),
            draft=state["draft"],
            max_follow_ups=config.MAX_FOLLOW_UP_QUERIES,
            today=date.today().isoformat(),
        ),
    )
    # The score decides, not the model's own passed flag.
    critique.passed = critique.score >= config.PASS_SCORE
    critique.follow_up_queries = critique.follow_up_queries[: config.MAX_FOLLOW_UP_QUERIES]
    data = critique.model_dump()
    return {
        "critique": data,
        "critiques": [data],
        "follow_up_queries": critique.follow_up_queries,
        "passed": critique.passed,
        "iteration": state.get("iteration", 0) + 1,
        "tokens_used": tokens,
    }

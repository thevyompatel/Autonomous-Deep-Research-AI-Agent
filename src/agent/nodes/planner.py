"""Planner node: split the question into targeted sub-queries."""

from datetime import date

from src.agent.llm import structured_call
from src.agent.prompts import PLANNER_PROMPT
from src.agent.state import Plan, ResearchState


def planner(state: ResearchState) -> dict:
    """Turn the research question into 3-6 sub-queries and reset the loop counter."""
    plan, tokens = structured_call(
        Plan,
        PLANNER_PROMPT.format(question=state["question"], today=date.today().isoformat()),
    )
    return {"sub_queries": plan.queries, "iteration": 0, "tokens_used": tokens}

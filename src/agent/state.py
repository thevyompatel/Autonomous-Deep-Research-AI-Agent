"""Shared graph state and the Pydantic schemas for structured LLM output."""

import operator
from typing import Annotated, TypedDict

from pydantic import BaseModel, Field, field_validator


class Plan(BaseModel):
    """Planner output: the sub-queries to search for."""

    queries: list[str] = Field(description="3-6 specific, non-overlapping web search queries")

    @field_validator("queries")
    @classmethod
    def _clean(cls, queries: list[str]) -> list[str]:
        """Strip, drop blanks and duplicates, and enforce the 3-6 range."""
        seen: set[str] = set()
        cleaned = []
        for q in (q.strip() for q in queries):
            if q and q.lower() not in seen:
                seen.add(q.lower())
                cleaned.append(q)
        if len(cleaned) < 3:
            raise ValueError("need at least 3 unique, non-empty queries")
        return cleaned[:6]


class Critique(BaseModel):
    """Reflector output: the review of one draft."""

    score: int = Field(description="Overall quality from 1 (poor) to 10 (excellent)")
    passed: bool = Field(description="True only if score >= 8")
    missing: list[str] = Field(description="Gaps, unsupported claims and conflicts found")
    follow_up_queries: list[str] = Field(
        description="At most 3 web search queries that target only the gaps"
    )

    @field_validator("score")
    @classmethod
    def _clamp(cls, score: int) -> int:
        """Keep the score inside 1-10."""
        return max(1, min(10, score))


class ResearchState(TypedDict, total=False):
    """State shared by every node. Annotated fields accumulate across loops."""

    question: str
    sub_queries: list[str]
    sources: Annotated[list[dict], operator.add]  # {url, title, snippet, content}
    draft: str
    drafts: Annotated[list[str], operator.add]  # every draft, oldest first
    critique: dict
    critiques: Annotated[list[dict], operator.add]  # critique history
    follow_up_queries: list[str]
    iteration: int
    passed: bool
    tokens_used: Annotated[int, operator.add]
    final_report: str
    report_path: str

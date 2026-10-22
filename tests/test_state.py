"""Config constants, schemas and the state reducer."""

import operator
from typing import get_type_hints

import pytest
from pydantic import ValidationError

from src.agent import config
from src.agent.state import Critique, Plan, ResearchState


def test_config_limits():
    assert config.MAX_ITERATIONS == 3
    assert config.MAX_SOURCES_PER_QUERY == 3
    assert config.MODEL_NAME


def test_plan_cleans_queries():
    plan = Plan(queries=[" a ", "b", "B", "", "c"])
    assert plan.queries == ["a", "b", "c"]


def test_plan_caps_at_six():
    assert len(Plan(queries=[f"q{i}" for i in range(9)]).queries) == 6


def test_plan_rejects_too_few():
    with pytest.raises(ValidationError):
        Plan(queries=["only", "two"])


def test_critique_clamps_score():
    critique = Critique(score=14, passed=True, missing=[], follow_up_queries=[])
    assert critique.score == 10


def test_sources_use_add_reducer():
    hints = get_type_hints(ResearchState, include_extras=True)
    assert operator.add in hints["sources"].__metadata__

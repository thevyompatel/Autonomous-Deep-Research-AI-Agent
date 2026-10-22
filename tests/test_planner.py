"""Planner node with a fake LLM."""

from src.agent.nodes import planner as planner_module
from src.agent.state import Plan


def test_planner_returns_unique_sub_queries(monkeypatch):
    prompts = []

    def fake_structured_call(schema, prompt):
        prompts.append(prompt)
        return schema(queries=["solid-state battery energy density 2026",
                               "lithium-ion battery cost per kWh 2026",
                               "solid-state battery commercial production timeline",
                               "lithium-ion battery cost per kWh 2026"]), 120

    monkeypatch.setattr(planner_module, "structured_call", fake_structured_call)
    update = planner_module.planner({"question": "Compare solid-state and lithium-ion"})

    queries = update["sub_queries"]
    assert 3 <= len(queries) <= 6
    assert len(set(queries)) == len(queries)
    assert all(q.strip() for q in queries)
    assert update["iteration"] == 0
    assert update["tokens_used"] == 120
    assert "Compare solid-state and lithium-ion" in prompts[0]


def test_plan_schema_is_what_the_planner_asks_for(monkeypatch):
    seen = {}

    def fake_structured_call(schema, prompt):
        seen["schema"] = schema
        return schema(queries=["a", "b", "c"]), 0

    monkeypatch.setattr(planner_module, "structured_call", fake_structured_call)
    planner_module.planner({"question": "q"})
    assert seen["schema"] is Plan

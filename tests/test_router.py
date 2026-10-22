"""Router outcomes and the reflector's pass rule."""

from src.agent import config
from src.agent.graph import route_after_reflection
from src.agent.nodes import reflector as reflector_module
from src.agent.state import Critique


def state(passed, iteration, follow_ups=("gap query",), tokens=0):
    return {"critique": {"passed": passed}, "iteration": iteration,
            "follow_up_queries": list(follow_ups), "tokens_used": tokens}


def test_passed_goes_to_finalizer():
    assert route_after_reflection(state(True, 1)) == "finalizer"


def test_failed_under_cap_goes_to_searcher():
    assert route_after_reflection(state(False, 1)) == "searcher"
    assert route_after_reflection(state(False, config.MAX_ITERATIONS - 1)) == "searcher"


def test_failed_at_cap_goes_to_finalizer():
    assert route_after_reflection(state(False, config.MAX_ITERATIONS)) == "finalizer"


def test_token_cap_goes_to_finalizer():
    assert route_after_reflection(state(False, 1, tokens=config.MAX_TOKENS_PER_RUN)) == "finalizer"


def test_no_follow_ups_goes_to_finalizer():
    assert route_after_reflection(state(False, 1, follow_ups=())) == "finalizer"


def run_reflector(monkeypatch, score, claimed_pass, follow_ups):
    def fake_structured_call(schema, prompt):
        return Critique(score=score, passed=claimed_pass, missing=["gap"],
                        follow_up_queries=follow_ups), 50

    monkeypatch.setattr(reflector_module, "structured_call", fake_structured_call)
    return reflector_module.reflector({"question": "q", "draft": "d", "iteration": 1,
                                       "sub_queries": ["a"], "sources": []})


def test_reflector_pass_follows_score_not_model_flag(monkeypatch):
    assert run_reflector(monkeypatch, 7, True, [])["passed"] is False
    assert run_reflector(monkeypatch, 8, False, [])["critique"]["passed"] is True


def test_reflector_increments_iteration_and_caps_follow_ups(monkeypatch):
    update = run_reflector(monkeypatch, 5, False, ["a", "b", "c", "d", "e"])
    assert update["iteration"] == 2
    assert len(update["follow_up_queries"]) == config.MAX_FOLLOW_UP_QUERIES
    assert update["critiques"] == [update["critique"]]

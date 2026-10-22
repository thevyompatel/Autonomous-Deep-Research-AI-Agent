"""StateGraph wiring: planner -> searcher -> synthesizer -> reflector -> router."""

from collections.abc import Iterator

from langgraph.graph import END, StateGraph

from src.agent import config
from src.agent.nodes.finalizer import finalizer
from src.agent.nodes.planner import planner
from src.agent.nodes.reflector import reflector
from src.agent.nodes.searcher import searcher
from src.agent.nodes.synthesizer import synthesizer
from src.agent.state import ResearchState


def route_after_reflection(state: ResearchState) -> str:
    """Finish if the draft passed or a cap was hit; otherwise search again.

    The reflector has already incremented `iteration`, so the cap check
    counts drafts written so far.
    """
    if state["critique"]["passed"] or state["iteration"] >= config.MAX_ITERATIONS:
        return "finalizer"
    if state.get("tokens_used", 0) >= config.MAX_TOKENS_PER_RUN:
        return "finalizer"
    if not state.get("follow_up_queries"):
        return "finalizer"  # nothing new to search for
    return "searcher"


def build_graph():
    """Compile the research graph."""
    g = StateGraph(ResearchState)
    g.add_node("planner", planner)
    g.add_node("searcher", searcher)
    g.add_node("synthesizer", synthesizer)
    g.add_node("reflector", reflector)
    g.add_node("finalizer", finalizer)
    g.set_entry_point("planner")
    g.add_edge("planner", "searcher")
    g.add_edge("searcher", "synthesizer")
    g.add_edge("synthesizer", "reflector")
    g.add_conditional_edges(
        "reflector", route_after_reflection, {"searcher": "searcher", "finalizer": "finalizer"}
    )
    g.add_edge("finalizer", END)
    return g.compile()


def stream_research(question: str) -> Iterator[tuple[str, dict]]:
    """Run the graph and yield (node name, state update) as each node finishes."""
    stream = build_graph().stream(
        {"question": question},
        config={"recursion_limit": config.RECURSION_LIMIT},
        stream_mode="updates",
    )
    for chunk in stream:
        for node, update in chunk.items():
            yield node, update or {}

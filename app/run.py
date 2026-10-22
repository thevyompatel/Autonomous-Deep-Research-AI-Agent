"""Shared run helpers for the CLI, the Streamlit app and the evaluation script."""

import operator

NEXT_STEP = {
    "planner": "Searching and scraping the web...",
    "searcher": "Writing the draft...",
    "synthesizer": "Reviewing the draft...",
    "reflector": "Deciding whether to search again...",
    "finalizer": "Done",
}
_ACCUMULATING = {"sources": operator.add, "drafts": operator.add,
                 "critiques": operator.add, "tokens_used": operator.add}


def merge(state: dict, update: dict) -> dict:
    """Apply a node's update to a local copy of the state, like the graph's reducers."""
    for key, value in update.items():
        if key in _ACCUMULATING and key in state:
            state[key] = _ACCUMULATING[key](state[key], value)
        else:
            state[key] = value
    return state


def describe(node: str, update: dict) -> str:
    """One-line summary of what a node just did."""
    if node == "planner":
        return f"planned {len(update['sub_queries'])} sub-queries"
    if node == "searcher":
        return f"collected {len(update.get('sources', []))} new sources"
    if node == "synthesizer":
        return f"wrote a draft ({len(update['draft'].split())} words)"
    if node == "reflector":
        c = update["critique"]
        verdict = "passed" if c["passed"] else f"{len(c['missing'])} gaps found"
        return f"review {update['iteration']}: score {c['score']}/10, {verdict}"
    if node == "finalizer":
        return f"saved {update['report_path']}"
    return "finished"

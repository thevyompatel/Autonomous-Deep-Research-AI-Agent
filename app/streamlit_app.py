"""Streamlit UI: streamlit run app/streamlit_app.py."""

import sys
import time
from pathlib import Path

# Streamlit puts app/ on sys.path, not the project root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st  # noqa: E402

from app.run import NEXT_STEP, describe, merge  # noqa: E402
from src.agent import config  # noqa: E402
from src.agent.graph import stream_research  # noqa: E402


def run(question: str) -> dict:
    """Run the graph, showing each node's result as it finishes."""
    state: dict = {"question": question}
    started = time.monotonic()
    with st.status("Planning sub-queries...", expanded=True) as status:
        for node, update in stream_research(question):
            merge(state, update)
            st.write(f"**{node}**: {describe(node, update)}")
            if node == "planner":
                st.markdown("\n".join(f"- {q}" for q in update["sub_queries"]))
            status.update(label=NEXT_STEP.get(node, "Working..."))
        status.update(label="Report ready", state="complete", expanded=False)
    state["seconds"] = time.monotonic() - started
    return state


def show(state: dict) -> None:
    """Render the report, run metrics, download button and critique history."""
    critiques = state.get("critiques", [])
    cols = st.columns(4)
    cols[0].metric("Review rounds", state.get("iteration", 0))
    cols[1].metric("Final score", f"{critiques[-1]['score']}/10" if critiques else "n/a")
    cols[2].metric("Sources", len(state.get("sources", [])))
    cols[3].metric("Time", f"{state.get('seconds', 0):.0f} s")

    st.download_button(
        "Download report (.md)",
        state["final_report"],
        file_name=Path(state["report_path"]).name,
        mime="text/markdown",
    )
    with st.expander(f"Critique history ({len(critiques)} reviews)"):
        for number, critique in enumerate(critiques, start=1):
            verdict = "passed" if critique["passed"] else "needs work"
            st.markdown(f"**Draft {number}: {critique['score']}/10, {verdict}**")
            for gap in critique["missing"]:
                st.markdown(f"- {gap}")
            if critique["follow_up_queries"]:
                st.caption("Follow-up searches: " + "; ".join(critique["follow_up_queries"]))
    st.markdown(state["final_report"])
    st.caption("Reports can contain errors. Check the cited sources before relying on them.")


def main() -> None:
    """Page layout and the run trigger."""
    st.set_page_config(page_title="Deep Research Agent", layout="wide")
    st.title("Autonomous Deep Research Agent")
    st.caption(f"Plans, searches, writes and self-reviews. Model: {config.MODEL_NAME}")

    missing = config.missing_keys()
    if missing:
        st.error(f"Missing keys in .env: {', '.join(missing)}")
        st.stop()

    question = st.text_area(
        "Research question",
        placeholder="Compare solid-state and lithium-ion EV batteries for 2026",
    )
    if st.button("Research", type="primary", disabled=not question.strip()):
        try:
            st.session_state["result"] = run(question.strip())
        except Exception as exc:
            st.error(f"Run failed: {exc}")
    if "result" in st.session_state:
        show(st.session_state["result"])


main()

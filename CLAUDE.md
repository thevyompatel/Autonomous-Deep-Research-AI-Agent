# Project: Autonomous Deep Research AI Agent

## Goal
Multi-agent research system built with LangGraph. Takes a complex question,
plans sub-queries, searches and scrapes the live web, writes a cited
Markdown report, then self-reflects and runs follow-up searches until the
report is complete or the iteration cap is reached.

## Tech stack
Python 3.11, LangGraph, langchain-google-genai, Tavily, httpx, trafilatura,
Pydantic v2, pytest, Rich, Streamlit.

## Architecture (do not change without asking)
Graph: planner -> searcher -> synthesizer -> reflector -> (router)
Router: if reflector.passed or iteration >= MAX_ITERATIONS -> finalizer,
otherwise -> searcher with reflector.follow_up_queries.
State lives in src/agent/state.py (ResearchState). Nodes are pure
functions: take state, return a partial state update.

## Rules
- One node per file in src/agent/nodes/. Keep each under 150 lines.
- All prompts live in src/agent/prompts.py, never inline.
- LLM outputs that drive control flow must use Pydantic structured output.
- Every claim in the report must cite a source URL from state["sources"].
  Never invent URLs.
- Add type hints and short docstrings to every function.
- Never hardcode API keys; read them from environment via config.py.
- Scraping: 10 s timeout, skip failures, never crash the graph.
- MAX_ITERATIONS = 3; MAX_SOURCES_PER_QUERY = 3.

## Commands
- Run: python -m app.cli "your question"
- Web UI: python -m app.web (http://127.0.0.1:8000)
- Web UI source: app/frontend (npm run dev / build / test / lint);
  `npm run build` regenerates app/static, never edit app/static by hand
- Streamlit UI: streamlit run app/streamlit_app.py
- Test: pytest -q

## Workflow
- Work phase by phase. After each phase: run tests, then summarise
  what changed and what to do next.
- Ask before adding a new dependency.

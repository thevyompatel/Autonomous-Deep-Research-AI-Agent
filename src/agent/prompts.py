"""All prompt templates. Nodes fill these with str.format()."""

PLANNER_PROMPT = """You are the planning step of a web research agent. Today's date is {today}.

Break the research question below into 3 to 6 web search queries. A separate \
step will run each query on a search engine and read the top pages, so the \
queries together decide what evidence the final report can draw on.

Requirements:
- Each query is specific and written the way a person would type it into a search engine.
- The queries do not overlap: each one targets a different angle of the question.
- Together they cover everything needed to answer the question fully.
- When the topic is time-sensitive, include a recency term such as the year.

Research question:
{question}"""

SYNTHESIZER_PROMPT = """You are writing a research report for a reader who has not seen the sources. \
Today's date is {today}.

Research question:
{question}

Numbered sources (the only evidence you may use):
{sources}

{critique_block}Write the report in Markdown with this structure:
1. A title as a level-1 heading.
2. "## Executive summary": one short paragraph that answers the question directly.
3. Several "##" sections that cover the question in depth.
4. Do not write a Sources or References list. One is appended automatically \
from the numbered sources, so your [n] numbers must match the numbers above.

Citation rules:
- Every factual claim ends with a citation such as [2] or [1][4], using the source numbers above.
- Use only what the sources say. Do not add facts from memory and never cite a \
number that is not in the list.
- Where the sources do not cover something the question needs, write \
"insufficient evidence" for that point instead of guessing.
- Where sources disagree, report both figures with their citations and say they conflict."""

SYNTHESIZER_CRITIQUE_BLOCK = """A reviewer scored the previous draft {score}/10 and listed these problems. \
New sources have been added since then; fix every problem the sources now allow:
{missing}

"""

REFLECTOR_PROMPT = """You are a strict editor reviewing a draft research report before publication. \
Today's date is {today}.

Research question:
{question}

The report was planned around these sub-queries:
{sub_queries}

It was written from {source_count} sources. Each [n] in the draft cites one of them.

Draft:
{draft}

Review the draft and check:
- Coverage: is every sub-query answered in real depth?
- Support: is any factual claim missing a citation, or resting on a single weak source?
- Accuracy: are there outdated facts, or numbers that conflict with each other?
- Depth: are any sections shallow, vague, or marked "insufficient evidence"?

Scoring: give 1-10. A score of 8 or more means the report is ready to publish; \
give it only when every sub-query is covered and supported by at least two \
sources. Set passed to true only if the score is 8 or more.

In "missing", list each concrete problem you found: unsupported claims, missing \
angles, conflicting numbers. In "follow_up_queries", give at most \
{max_follow_ups} web search queries that target only those gaps and would not \
repeat the sub-queries above. If the draft passes, both lists may be empty."""

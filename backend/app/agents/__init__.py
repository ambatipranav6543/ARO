"""The four-agent review architecture.

Three rule-based specialists, each with one job and an isolated view of the
data, plus an orchestrator that routes to them and grounds what they find:

    dispatch.py        slices a company's records into per-agent chunks
    correctness.py     agent 1 — mathematical correctness   (50%)
    consistency.py     agent 2 — internal consistency       (30%)
    variance_agent.py  agent 3 — year-over-year variance    (20%)
    orchestrator.py    agent 4 — routing, RAG grounding, narration, scoring

The specialists contain no LLM call of any kind. The orchestrator is the
only component that talks to a model, and it writes the model's output into
a narration field that cannot alter a finding's figures, severity,
citations or score.

`contracts.py` holds what they share, including the rule that gives the
architecture its teeth: an `AgentFinding` requires at least one
`SourceCitation`, so no agent can emit a claim without the source figures
it came from.
"""

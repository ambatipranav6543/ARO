"""Shared services for the review agents.

This package holds what the agents in `app.agents` build on rather than an
agent itself: the LLM client, the grounded-narration step, the prompt
contract, the API-facing finding schema, the finding store and the RAG/data
tool wrappers.

The four agents themselves — three rule-based specialists and the
orchestrator that routes to them — live in `app.agents`.
"""

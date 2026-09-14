"""Grounded interpretation generation (Day 4) — the piece that enforces
the hackathon's core grounding rule:

    If no evidence was retrieved, the Agent MUST refuse to explain rather
    than invent a cause. If an LLM is unavailable, the Agent MUST fall
    back to a deterministic, evidence-only summary rather than crash.

Confidence is derived from retrieved-evidence similarity, never from an
LLM self-rating — a self-reported "0.9 confident" from a model is not a
real number and would be exactly the kind of fabrication this module
exists to prevent.
"""

from __future__ import annotations

from app.agent.llm import LLMClient, LLMUnavailableError
from app.agent.prompts import SYSTEM_PROMPT, build_user_prompt
from app.agents.contracts import AgentFinding
from app.rag.retrieval import RetrievedEvidence

NO_EVIDENCE_AT_ALL_MESSAGE = (
    "Insufficient evidence was retrieved to explain this finding. "
    "No supporting evidence was found in the indexed dataset for this query."
)

_NO_LLM_PREFIX = (
    "AI interpretation unavailable (no LLM configured or reachable). "
    "Retrieved evidence, shown as-is:"
)


def _fallback_from_evidence(evidence: list[RetrievedEvidence]) -> str:
    """Deterministic, non-LLM fallback: relay the actual retrieved text
    verbatim (it's already a factual, dataset-derived sentence — see
    app.rag.snippets — so relaying it invents nothing new)."""
    joined = " ".join(e.text for e in evidence[:2])
    return f"{_NO_LLM_PREFIX} {joined}"


def generate_explanation(
    finding: AgentFinding,
    evidence: list[RetrievedEvidence],
    llm_client: LLMClient | None,
    instruction: str | None = None,
) -> tuple[str, float, bool]:
    """Returns (explanation, confidence, grounded).

    `grounded` is True iff at least one evidence item was retrieved —
    this is independent of whether the LLM ran successfully.

    Note that an ungrounded finding is still a valid finding: the
    deterministic rule result and its citations stand on their own, and
    only the narrative interpretation is withheld.
    """
    if not evidence:
        return NO_EVIDENCE_AT_ALL_MESSAGE, 0.0, False

    confidence = round(min(sum(e.similarity for e in evidence) / len(evidence), 1.0), 2)

    if llm_client is None:
        return _fallback_from_evidence(evidence), confidence, True

    try:
        user_prompt = build_user_prompt(finding, evidence, instruction=instruction)
        text = llm_client.generate(SYSTEM_PROMPT, user_prompt).strip()
        if not text:
            return _fallback_from_evidence(evidence), confidence, True
        return text, confidence, True
    except LLMUnavailableError:
        return _fallback_from_evidence(evidence), confidence, True

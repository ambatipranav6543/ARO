"""Tests for app.agent.interpret: the grounding/refusal core.

Per hackathon requirements, no real LLM or internet connection is used —
the LLM client is mocked/faked throughout.
"""

from __future__ import annotations

import pytest

from app.agent.interpret import NO_EVIDENCE_AT_ALL_MESSAGE, generate_explanation
from app.agent.llm import LLMUnavailableError
from app.agents.contracts import AgentFinding, AgentName, Severity, cite
from app.rag.retrieval import RetrievedEvidence


def _flag() -> AgentFinding:
    return AgentFinding(
        agent=AgentName.VARIANCE,
        check_code="VARIANCE_REVENUE",
        company="ACME",
        year=2023,
        severity=Severity.HIGH,
        metric="revenue",
        statement=(
            "Revenue decreased 27.0% year over year, from 1,000.0 in FY2022 to 730.0 in FY2023."
        ),
        citations=[
            cite("revenue", "ACME", 2023, 730.0, source_row=4),
            cite("revenue", "ACME", 2022, 1000.0, source_row=5),
        ],
        actual=730.0,
        prior_year=2022,
        prior_value=1000.0,
        pct_change=-27.0,
    )


def _evidence(similarity: float = 0.72) -> list[RetrievedEvidence]:
    return [
        RetrievedEvidence(
            text="ACME's revenue decreased 27.0% from $1,000M in 2022 to $730M in 2023.",
            metadata={"company": "ACME", "year": 2023, "kind": "comparison"},
            similarity=similarity,
        )
    ]


class _StubLLM:
    def __init__(self, response: str | None = None, raises: bool = False):
        self.response = response
        self.raises = raises
        self.calls: list[tuple[str, str]] = []

    def generate(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        if self.raises:
            raise LLMUnavailableError("simulated provider failure")
        return self.response or ""


def test_no_evidence_refuses_to_explain():
    explanation, confidence, grounded = generate_explanation(_flag(), [], llm_client=None)
    assert explanation == NO_EVIDENCE_AT_ALL_MESSAGE
    assert confidence == 0.0
    assert grounded is False


def test_no_evidence_refuses_even_with_llm_configured():
    # The LLM must never be asked to invent a cause when there's no evidence.
    llm = _StubLLM(response="Made up reason")
    explanation, confidence, grounded = generate_explanation(_flag(), [], llm_client=llm)
    assert explanation == NO_EVIDENCE_AT_ALL_MESSAGE
    assert grounded is False
    assert llm.calls == []  # never called


def test_evidence_without_llm_falls_back_to_evidence_text():
    explanation, confidence, grounded = generate_explanation(_flag(), _evidence(), llm_client=None)
    assert grounded is True
    assert confidence == pytest.approx(0.72)
    assert "ACME's revenue decreased 27.0%" in explanation
    assert "unavailable" in explanation.lower()


def test_evidence_with_working_llm_uses_llm_text():
    llm = _StubLLM(response="Grounded interpretation of the decline.")
    explanation, confidence, grounded = generate_explanation(_flag(), _evidence(0.8), llm_client=llm)
    assert explanation == "Grounded interpretation of the decline."
    assert grounded is True
    assert confidence == pytest.approx(0.8)
    assert len(llm.calls) == 1


def test_llm_failure_falls_back_gracefully_without_crashing():
    llm = _StubLLM(raises=True)
    explanation, confidence, grounded = generate_explanation(_flag(), _evidence(), llm_client=llm)
    assert grounded is True  # evidence still exists
    assert "unavailable" in explanation.lower()


def test_confidence_is_average_similarity_not_llm_self_rating():
    evidence = [
        RetrievedEvidence(text="a", metadata={}, similarity=0.4),
        RetrievedEvidence(text="b", metadata={}, similarity=0.6),
    ]
    llm = _StubLLM(response="some interpretation")
    _, confidence, _ = generate_explanation(_flag(), evidence, llm_client=llm)
    assert confidence == pytest.approx(0.5)

"""Structured Pydantic models for the Agent layer.

Every Agent output is validated through these models — the LLM's raw text
is never exposed directly to the API; it only ever fills the `explanation`
string field of a `Finding`, never the fact fields.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from app.agents.contracts import AgentName, AgentReport, Severity, SourceCitation

# Severity is defined in `app.agents.contracts` (the three specialists emit
# it before this layer ever sees a finding) and re-exported here so existing
# importers of `app.agent.schemas.Severity` keep working. The dependency
# runs one way: this module imports from `app.agents`, never the reverse.
__all__ = [
    "EvidenceItem",
    "Finding",
    "FindingFact",
    "ReviewDecision",
    "ReviewRequest",
    "ReviewResponse",
    "ReviewScorecard",
    "ReviewStatus",
    "Severity",
]


class ReviewStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class EvidenceItem(BaseModel):
    """Exactly what `app.rag.retrieval.RetrievedEvidence` returned — never
    augmented with page numbers, document names or citations that the RAG
    layer didn't actually supply."""

    text: str
    similarity: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class FindingFact(BaseModel):
    """The deterministic fact from a rule-based agent. The LLM never edits
    these values — they are copied verbatim from the `AgentFinding` the
    specialist produced.

    The year-over-year fields are optional because only the variance agent
    produces them; a correctness or consistency finding concerns a single
    year and carries `expected`/`actual` instead.
    """

    metric: str
    year: int
    value: float | None = None

    prior_year: int | None = None
    prior_value: float | None = None
    pct_change: float | None = None

    expected: float | None = Field(
        default=None, description="Value recomputed from source figures, where a rule computes one"
    )
    actual: float | None = Field(default=None, description="Value as reported by the source")
    difference: float | None = None


class Finding(BaseModel):
    id: str
    company: str
    year: int
    metric: str
    severity: Severity
    title: str

    source_agent: AgentName = Field(
        description="Which rule-based specialist produced this finding. The "
        "orchestrator produces none of its own."
    )
    check_code: str = Field(description="Stable rule identifier, e.g. 'ROE_MISMATCH'")
    weight: float = Field(
        description="Review weighting of the agent that produced this finding "
        "(correctness 0.50, consistency 0.30, variance 0.20)."
    )

    statement: str = Field(
        description="The rule's own deterministic claim, with the figures inline. "
        "Produced by the specialist agent, never by a language model, and the "
        "authoritative wording of the finding."
    )

    fact: FindingFact
    citations: list[SourceCitation] = Field(
        min_length=1,
        description="The exact source figures this finding is derived from — "
        "field, source column, value, and line in the uploaded file. A finding "
        "without at least one citation cannot be constructed.",
    )

    explanation: str = Field(
        description="AI interpretation grounded in retrieved evidence, or a "
        "refusal message if evidence was insufficient. Never alters `fact`."
    )
    evidence: list[EvidenceItem] = Field(default_factory=list)
    grounded: bool = Field(
        description="True only if at least one evidence item was retrieved."
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Derived from retrieved-evidence similarity, not an "
        "LLM self-rating.",
    )

    review_status: ReviewStatus = ReviewStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReviewRequest(BaseModel):
    company: str
    year: int | None = Field(default=None, description="Restrict to one fiscal year")
    instruction: str | None = Field(
        default=None, description="Optional free-text hint for the reviewer, e.g. 'focus on leverage'"
    )
    threshold_pct: float = Field(default=20.0, ge=0.0, description="YoY significance threshold, %")
    k: int = Field(default=3, ge=1, le=10, description="Evidence snippets to retrieve per finding")
    max_findings: int = Field(default=5, ge=1, le=25, description="Cap on findings generated per request")


class ReviewScorecard(BaseModel):
    """Per-agent pass rates plus their 50/30/20 weighted combination.

    `weighted_score` renormalizes over agents that could actually run a
    check, so an agent whose rules the source can't support lowers coverage
    rather than silently scoring zero.
    """

    weighted_score: float | None = Field(
        description="0.0-1.0 across the three agents, weighted 50/30/20. None if no rule ran."
    )
    agents: list[AgentReport]


class ReviewResponse(BaseModel):
    company: str
    year: int | None
    findings: list[Finding]
    scorecard: ReviewScorecard
    summary: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "COMPLETED"


class ReviewDecision(BaseModel):
    """Human-in-the-loop decision payload for POST /api/agent/review/{id}."""

    status: ReviewStatus

    def validate_decision(self) -> None:
        if self.status not in (ReviewStatus.APPROVED, ReviewStatus.REJECTED):
            raise ValueError("status must be APPROVED or REJECTED")

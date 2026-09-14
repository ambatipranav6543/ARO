"""Agent API: four-agent review generation + human-in-the-loop approval.

The three rule-based specialists and the orchestrator live in `app.agents`;
this module only translates HTTP to that call and errors to status codes.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.agent.schemas import Finding, ReviewDecision, ReviewRequest, ReviewResponse, ReviewStatus
from app.agent.store import FindingNotFoundError, get_finding_store
from app.agent.tools import CompanyNotFoundError
from app.agents.orchestrator import run_orchestrated_review

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def review_company(payload: ReviewRequest) -> ReviewResponse:
    """Run a full four-agent review for a company.

    Dispatches isolated data chunks to the mathematical-correctness,
    internal-consistency and variance agents, grounds each finding in
    retrieved evidence, and returns them with a 50/30/20 weighted
    scorecard. Every finding is stored PENDING for human review.
    """
    try:
        return run_orchestrated_review(
            company=payload.company,
            year=payload.year,
            instruction=payload.instruction,
            threshold_pct=payload.threshold_pct,
            k=payload.k,
            max_findings=payload.max_findings,
        )
    except CompanyNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/findings", response_model=list[Finding])
def list_findings(
    company: str | None = Query(default=None),
    year: int | None = Query(default=None),
    status_filter: ReviewStatus | None = Query(default=None, alias="status"),
) -> list[Finding]:
    """List previously generated findings, optionally filtered."""
    return get_finding_store().list(company=company, year=year, status=status_filter)


@router.get("/findings/{finding_id}", response_model=Finding)
def get_finding(finding_id: str) -> Finding:
    try:
        return get_finding_store().get(finding_id)
    except FindingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/review/{finding_id}", response_model=Finding)
def review_finding(finding_id: str, decision: ReviewDecision) -> Finding:
    """Human approve/reject a single finding. AI-generated findings are
    never auto-approved — every finding starts PENDING."""
    try:
        decision.validate_decision()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        return get_finding_store().update_status(finding_id, decision.status)
    except FindingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

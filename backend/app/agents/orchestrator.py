"""Agent 4 — the Orchestrator.

The only agent that talks to an LLM, and the only one that produces no
findings of its own. Its job is coordination:

    load records for one company
      -> build_bundle()              slice into three isolated chunks
      -> run the three specialists   (rule-based, no LLM, independent)
      -> rank by severity, then by the 50/30/20 agent weighting
      -> for each surviving finding:
             retrieve_financial_evidence()   [RAG]
             generate_explanation()          [LLM; refuses without evidence]
      -> weighted scorecard + findings stored PENDING for human review

Two properties are deliberate and worth stating:

- The three specialists never see each other's chunks and never see each
  other's output. They can be run, tested and replaced independently.
- The LLM narrates; it never decides. Severity, the figures, the citations
  and the score are all fixed before any prompt is built, and the narration
  is written into a separate field that cannot alter them.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.agent.interpret import generate_explanation
from app.agent.llm import LLMClient, get_llm_client
from app.agent.schemas import (
    EvidenceItem,
    Finding,
    FindingFact,
    ReviewResponse,
    ReviewScorecard,
    ReviewStatus,
)
from app.agent.store import get_finding_store
from app.agent.tools import CompanyNotFoundError, load_company_records, retrieve_financial_evidence
from app.agents.consistency import run_consistency_agent_batch
from app.agents.contracts import (
    FIELD_PROVENANCE,
    AgentFinding,
    AgentName,
    AgentReport,
    Severity,
    weighted_score,
)
from app.agents.correctness import run_correctness_agent_batch
from app.agents.dispatch import build_bundle
from app.agents.variance_agent import DEFAULT_THRESHOLD_PCT, run_variance_agent

DEFAULT_MAX_FINDINGS = 5
DEFAULT_K = 3

_SEVERITY_ORDER: dict[Severity, int] = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}

_AGENT_LABELS: dict[AgentName, str] = {
    AgentName.CORRECTNESS: "Mathematical correctness",
    AgentName.CONSISTENCY: "Internal consistency",
    AgentName.VARIANCE: "Variance",
}


def _magnitude(finding: AgentFinding) -> float:
    """How far off the finding is, for ordering within a severity band."""
    if finding.pct_change is not None:
        return abs(finding.pct_change)
    if finding.expected is not None and finding.actual is not None:
        return abs(finding.actual - finding.expected) / max(abs(finding.expected), 1e-9) * 100
    if finding.difference is not None:
        return abs(finding.difference)
    return 0.0


def rank_findings(
    findings: list[AgentFinding],
    weights: dict[AgentName, float],
    max_findings: int,
) -> list[AgentFinding]:
    """Order by severity first, then by the mentor's agent weighting, then
    by magnitude — so a HIGH correctness break outranks a HIGH variance
    swing, and the cap drops the least material items rather than an
    arbitrary slice."""
    ranked = sorted(
        findings,
        key=lambda f: (
            _SEVERITY_ORDER[f.severity],
            -weights.get(f.agent, 0.0),
            -_magnitude(f),
        ),
    )
    return ranked[:max_findings]


# Short title phrases per rule. Titles use the source column name so a
# reviewer reads "ROE", not "Roe", and reads the same label they'd find in
# the uploaded file.
_CHECK_TITLES: dict[str, str] = {
    "GROSS_PROFIT_EXCEEDS_REVENUE": "exceeds revenue",
    "ROE_SIGN_CONTRADICTS_NET_INCOME": "sign contradicts net income",
    "NET_MARGIN_SIGN_CONTRADICTS_NET_INCOME": "sign contradicts net income",
    "TANGIBLE_EQUITY_RETURN_BELOW_ROE": "is below ROE on a profitable year",
    "NEGATIVE_VALUE_WHERE_IMPOSSIBLE": "is negative where that is impossible",
    "NET_INCOME_EXCEEDS_GROSS_PROFIT": "exceeds gross profit",
    "EBITDA_EXCEEDS_GROSS_PROFIT": "exceeds gross profit",
}


def _metric_label(metric: str) -> str:
    column, _ = FIELD_PROVENANCE.get(metric, (metric.replace("_", " ").title(), None))
    return column


def _title_for(finding: AgentFinding) -> str:
    label = _metric_label(finding.metric)

    if finding.pct_change is not None and finding.prior_year is not None:
        direction = "increase" if finding.pct_change >= 0 else "decrease"
        return (
            f"{label} {direction} of {abs(finding.pct_change):.1f}% "
            f"({finding.prior_year} -> {finding.year})"
        )

    if finding.check_code.endswith("_MISMATCH") and finding.expected is not None:
        return (
            f"{label} reported {finding.actual:,.4f} vs recomputed "
            f"{finding.expected:,.4f} (FY{finding.year})"
        )

    phrase = _CHECK_TITLES.get(finding.check_code)
    if phrase:
        return f"{label} {phrase} (FY{finding.year})"
    return f"{label}: {finding.check_code.replace('_', ' ').lower()} (FY{finding.year})"


def _summarize(
    company: str,
    year: int | None,
    findings: list[Finding],
    reports: list[AgentReport],
    score: float | None,
) -> str:
    scope = f" ({year})" if year else ""
    parts: list[str] = []

    if findings:
        counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for f in findings:
            counts[f.severity.value] += 1
        parts.append(
            f"{len(findings)} finding(s) for {company}{scope}: "
            f"HIGH {counts['HIGH']}, MEDIUM {counts['MEDIUM']}, LOW {counts['LOW']}."
        )
    else:
        parts.append(f"No rule violations found for {company}{scope}.")

    for report in reports:
        label = _AGENT_LABELS[report.agent]
        if report.score is None:
            parts.append(
                f"{label} ({report.weight:.0%}): no check could run, "
                f"{report.checks_skipped} skipped."
            )
        else:
            parts.append(
                f"{label} ({report.weight:.0%}): {report.checks_passed}/{report.checks_run} "
                f"checks passed, {report.checks_skipped} skipped."
            )

    if score is not None:
        parts.append(f"Weighted review score: {score:.1%}.")
    parts.append("All findings are PENDING human review.")
    return " ".join(parts)


def run_orchestrated_review(
    company: str,
    year: int | None = None,
    instruction: str | None = None,
    threshold_pct: float = DEFAULT_THRESHOLD_PCT,
    k: int = DEFAULT_K,
    max_findings: int = DEFAULT_MAX_FINDINGS,
    records_path: str | Path | None = None,
    persist_path: str | Path | None = None,
    llm_client: LLMClient | None = None,
) -> ReviewResponse:
    """Run one full four-agent review pass for a company.

    Raises `CompanyNotFoundError` if the company isn't in the dataset —
    callers (API routes) turn this into a 404.
    """
    records = load_company_records(company, records_path=records_path)
    bundle = build_bundle(company, records)

    correctness_chunks = bundle.correctness
    consistency_chunks = bundle.consistency
    if year is not None:
        correctness_chunks = [c for c in correctness_chunks if c.year == year]
        consistency_chunks = [c for c in consistency_chunks if c.year == year]

    reports = [
        run_correctness_agent_batch(correctness_chunks),
        run_consistency_agent_batch(consistency_chunks),
        run_variance_agent(bundle.variance, threshold_pct=threshold_pct, year=year),
    ]

    weights = {report.agent: report.weight for report in reports}
    all_findings = [f for report in reports for f in report.findings]
    selected = rank_findings(all_findings, weights, max_findings)

    client = llm_client if llm_client is not None else get_llm_client()
    store = get_finding_store()

    findings: list[Finding] = []
    for agent_finding in selected:
        evidence = retrieve_financial_evidence(
            agent_finding.query_text,
            company=agent_finding.company,
            k=k,
            persist_path=persist_path,
        )
        explanation, confidence, grounded = generate_explanation(
            agent_finding, evidence, client, instruction=instruction
        )

        finding = Finding(
            id=uuid.uuid4().hex,
            company=agent_finding.company,
            year=agent_finding.year,
            metric=agent_finding.metric,
            severity=agent_finding.severity,
            title=_title_for(agent_finding),
            source_agent=agent_finding.agent,
            check_code=agent_finding.check_code,
            weight=weights[agent_finding.agent],
            statement=agent_finding.statement,
            fact=FindingFact(
                metric=agent_finding.metric,
                year=agent_finding.year,
                value=agent_finding.actual,
                prior_year=agent_finding.prior_year,
                prior_value=agent_finding.prior_value,
                pct_change=agent_finding.pct_change,
                expected=agent_finding.expected,
                actual=agent_finding.actual,
                difference=agent_finding.difference,
            ),
            citations=agent_finding.citations,
            explanation=explanation,
            evidence=[
                EvidenceItem(text=e.text, similarity=round(e.similarity, 3), metadata=e.metadata)
                for e in evidence
            ],
            grounded=grounded,
            confidence=confidence,
            review_status=ReviewStatus.PENDING,
            created_at=datetime.now(timezone.utc),
        )
        store.save(finding)
        findings.append(finding)

    score = weighted_score(reports)
    return ReviewResponse(
        company=company,
        year=year,
        findings=findings,
        scorecard=ReviewScorecard(weighted_score=score, agents=reports),
        summary=_summarize(company, year, findings, reports, score),
        generated_at=datetime.now(timezone.utc),
        status="COMPLETED",
    )


__all__ = [
    "DEFAULT_K",
    "DEFAULT_MAX_FINDINGS",
    "CompanyNotFoundError",
    "rank_findings",
    "run_orchestrated_review",
]

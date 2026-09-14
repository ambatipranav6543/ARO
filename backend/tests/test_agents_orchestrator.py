"""Tests for agent 4 — the orchestrator.

Runs against the real dataset for the three specialists, with RAG retrieval
and the LLM both stubbed, so no vector store, model download or network
call is involved.
"""

from __future__ import annotations

import pytest

import app.agents.orchestrator as orchestrator_module
from app.agent.schemas import ReviewStatus
from app.agent.store import get_finding_store
from app.agent.tools import CompanyNotFoundError
from app.agents.contracts import AgentFinding, AgentName, Severity, cite
from app.agents.orchestrator import rank_findings, run_orchestrated_review
from app.rag.retrieval import RetrievedEvidence


class _StubLLM:
    def __init__(self) -> None:
        self.prompts: list[tuple[str, str]] = []

    def generate(self, system: str, user: str) -> str:
        self.prompts.append((system, user))
        return "Stubbed grounded interpretation."


@pytest.fixture()
def with_evidence(monkeypatch):
    def _fake_retrieve(query, company=None, k=3, persist_path=None):
        return [
            RetrievedEvidence(
                text=f"Evidence for {company}: {query}",
                metadata={"company": company, "year": 2023, "kind": "comparison"},
                similarity=0.75,
            )
        ]

    monkeypatch.setattr(orchestrator_module, "retrieve_financial_evidence", _fake_retrieve)


@pytest.fixture()
def without_evidence(monkeypatch):
    monkeypatch.setattr(orchestrator_module, "retrieve_financial_evidence", lambda *a, **k: [])


def test_review_runs_all_three_agents_and_reports_each(with_evidence):
    response = run_orchestrated_review("AAPL", max_findings=5, llm_client=_StubLLM())

    assert response.status == "COMPLETED"
    reported = {report.agent for report in response.scorecard.agents}
    assert reported == {AgentName.CORRECTNESS, AgentName.CONSISTENCY, AgentName.VARIANCE}


def test_scorecard_weights_are_the_mentor_assigned_50_30_20(with_evidence):
    response = run_orchestrated_review("AAPL", max_findings=1, llm_client=_StubLLM())
    weights = {r.agent: r.weight for r in response.scorecard.agents}

    assert weights[AgentName.CORRECTNESS] == 0.50
    assert weights[AgentName.CONSISTENCY] == 0.30
    assert weights[AgentName.VARIANCE] == 0.20
    assert 0.0 <= response.scorecard.weighted_score <= 1.0


def test_every_finding_traces_back_to_source_figures(with_evidence):
    response = run_orchestrated_review("AIG", max_findings=5, llm_client=_StubLLM())
    assert response.findings

    for finding in response.findings:
        assert finding.citations, "a finding must cite the source data it came from"
        for citation in finding.citations:
            assert citation.company == "AIG"
            assert citation.source_row is not None
            assert citation.column  # the actual source CSV header
        # The claim itself states figures rather than characterizing them.
        assert any(ch.isdigit() for ch in finding.title + finding.explanation + finding.check_code)


def test_findings_are_attributed_to_the_agent_that_produced_them(with_evidence):
    response = run_orchestrated_review("AIG", max_findings=8, llm_client=_StubLLM())
    agents = {f.source_agent for f in response.findings}

    # AIG has real correctness breaks (reported ROE vs recomputed) in the
    # assigned dataset, so this is not a vacuous assertion.
    assert AgentName.CORRECTNESS in agents
    for finding in response.findings:
        assert finding.check_code
        assert finding.weight == {"mathematical_correctness": 0.5, "internal_consistency": 0.3, "variance": 0.2}[
            finding.source_agent.value
        ]


def test_findings_are_stored_pending_human_review(with_evidence):
    response = run_orchestrated_review("MSFT", max_findings=3, llm_client=_StubLLM())

    for finding in response.findings:
        assert finding.review_status is ReviewStatus.PENDING
    stored = get_finding_store().list(company="MSFT")
    assert len(stored) >= len(response.findings)


def test_the_rules_own_statement_reaches_the_api(with_evidence):
    # The deterministic claim is the authoritative wording of a finding, and
    # the client leads with it rather than the model's narration - so it has
    # to survive the trip out of the orchestrator.
    response = run_orchestrated_review("AIG", year=2018, max_findings=3, llm_client=_StubLLM())
    assert response.findings

    for finding in response.findings:
        assert finding.statement
        assert any(ch.isdigit() for ch in finding.statement)
        # Narration lives in its own field and never overwrites the claim.
        assert finding.statement != finding.explanation


def test_llm_narration_never_alters_the_deterministic_figures(with_evidence):
    llm = _StubLLM()
    response = run_orchestrated_review("AAPL", max_findings=3, llm_client=llm)

    for finding in response.findings:
        assert finding.explanation == "Stubbed grounded interpretation."
        # Facts and citations came from the rule, not from the model.
        assert finding.fact.metric == finding.metric
        assert finding.citations


def test_missing_evidence_refuses_to_explain_but_keeps_the_finding(without_evidence):
    response = run_orchestrated_review("AIG", max_findings=2, llm_client=_StubLLM())
    assert response.findings

    for finding in response.findings:
        assert finding.grounded is False
        assert finding.confidence == 0.0
        assert "insufficient evidence" in finding.explanation.lower()
        # The deterministic result stands on its own without narration.
        assert finding.citations


def test_year_filter_scopes_the_review(with_evidence):
    response = run_orchestrated_review("AAPL", year=2022, max_findings=10, llm_client=_StubLLM())
    assert all(f.year == 2022 for f in response.findings)
    assert response.year == 2022


def test_unknown_company_raises_for_the_route_to_turn_into_404():
    with pytest.raises(CompanyNotFoundError):
        run_orchestrated_review("NOT_A_REAL_TICKER_XYZ")


def test_summary_reports_each_agents_coverage(with_evidence):
    summary = run_orchestrated_review("AAPL", max_findings=2, llm_client=_StubLLM()).summary

    assert "Mathematical correctness (50%)" in summary
    assert "Internal consistency (30%)" in summary
    assert "Variance (20%)" in summary
    assert "skipped" in summary
    assert "PENDING human review" in summary


def _finding(agent: AgentName, severity: Severity, pct: float) -> AgentFinding:
    return AgentFinding(
        agent=agent,
        check_code="X",
        company="ACME",
        year=2023,
        severity=severity,
        metric="revenue",
        statement=f"Revenue moved {pct}%",
        citations=[cite("revenue", "ACME", 2023, 100.0)],
        pct_change=pct,
        prior_year=2022,
    )


def test_ranking_prefers_correctness_over_variance_at_equal_severity():
    # The 50/30/20 weighting is a priority order, not only a score input.
    weights = {AgentName.CORRECTNESS: 0.5, AgentName.CONSISTENCY: 0.3, AgentName.VARIANCE: 0.2}
    findings = [
        _finding(AgentName.VARIANCE, Severity.HIGH, 90.0),
        _finding(AgentName.CONSISTENCY, Severity.HIGH, 10.0),
        _finding(AgentName.CORRECTNESS, Severity.HIGH, 5.0),
    ]
    ranked = rank_findings(findings, weights, max_findings=3)

    assert [f.agent for f in ranked] == [
        AgentName.CORRECTNESS,
        AgentName.CONSISTENCY,
        AgentName.VARIANCE,
    ]


def test_ranking_puts_severity_before_agent_weight():
    weights = {AgentName.CORRECTNESS: 0.5, AgentName.VARIANCE: 0.2}
    findings = [
        _finding(AgentName.CORRECTNESS, Severity.LOW, 5.0),
        _finding(AgentName.VARIANCE, Severity.HIGH, 90.0),
    ]
    ranked = rank_findings(findings, weights, max_findings=2)
    assert ranked[0].agent is AgentName.VARIANCE


def test_ranking_cap_drops_the_least_material_items():
    weights = {AgentName.VARIANCE: 0.2}
    findings = [
        _finding(AgentName.VARIANCE, Severity.HIGH, 30.0),
        _finding(AgentName.VARIANCE, Severity.HIGH, 90.0),
        _finding(AgentName.VARIANCE, Severity.LOW, 5.0),
    ]
    ranked = rank_findings(findings, weights, max_findings=2)
    assert [f.pct_change for f in ranked] == [90.0, 30.0]

"""Tests for the shared agent contracts.

The most important test in this file is the first one: a finding that does
not cite source data must be impossible to construct. That is the mentor's
"every finding must trace back to source data" requirement enforced by the
type system rather than by reviewer discipline.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.agents.contracts import (
    AGENT_WEIGHTS,
    AgentFinding,
    AgentName,
    AgentReport,
    ReportBuilder,
    Severity,
    Unit,
    cite,
    merge_reports,
    weighted_score,
)


def _citation():
    return cite("revenue", "ACME", 2023, 1_200.0, source_row=5)


def test_finding_cannot_be_created_without_a_citation():
    with pytest.raises(ValidationError):
        AgentFinding(
            agent=AgentName.VARIANCE,
            check_code="VARIANCE_REVENUE",
            company="ACME",
            year=2023,
            severity=Severity.HIGH,
            metric="revenue",
            statement="Revenue rose 50.0% to 1,200.0",
            citations=[],
        )


def test_finding_statement_must_contain_actual_figures():
    with pytest.raises(ValidationError, match="must contain the actual figures"):
        AgentFinding(
            agent=AgentName.VARIANCE,
            check_code="VARIANCE_REVENUE",
            company="ACME",
            year=2023,
            severity=Severity.HIGH,
            metric="revenue",
            statement="Revenue is high",
            citations=[_citation()],
        )


def test_citation_renders_source_column_and_row():
    rendered = _citation().render()
    assert rendered == "Revenue (ACME FY2023, row 5) = $1,200.0M"


def test_cite_resolves_source_column_and_unit_from_provenance():
    citation = cite("net_profit_margin", "ACME", 2023, 25.31)
    assert citation.column == "Net Profit Margin"
    assert citation.unit is Unit.PERCENT
    assert "row" not in citation.render()


def test_citation_is_serialized_with_its_rendered_form():
    # The frontend displays the trace directly; it should not have to
    # reimplement unit formatting to do so.
    assert _citation().model_dump()["rendered"] == "Revenue (ACME FY2023, row 5) = $1,200.0M"


def test_report_score_is_pass_rate_over_rules_that_ran():
    report = AgentReport(
        agent=AgentName.CORRECTNESS,
        weight=0.5,
        checks_run=4,
        checks_passed=3,
        checks_skipped=9,
    )
    # Skipped rules do not dilute the score in either direction.
    assert report.score == 0.75


def test_report_score_is_none_when_no_rule_could_run():
    report = AgentReport(agent=AgentName.CORRECTNESS, weight=0.5, checks_skipped=7)
    assert report.score is None


def test_weighted_score_applies_the_50_30_20_weighting():
    reports = [
        AgentReport(agent=AgentName.CORRECTNESS, weight=0.5, checks_run=10, checks_passed=10),
        AgentReport(agent=AgentName.CONSISTENCY, weight=0.3, checks_run=10, checks_passed=5),
        AgentReport(agent=AgentName.VARIANCE, weight=0.2, checks_run=10, checks_passed=0),
    ]
    # 0.5*1.0 + 0.3*0.5 + 0.2*0.0 = 0.65
    assert weighted_score(reports) == pytest.approx(0.65)


def test_weighted_score_renormalizes_when_an_agent_could_not_run():
    reports = [
        AgentReport(agent=AgentName.CORRECTNESS, weight=0.5, checks_run=10, checks_passed=10),
        AgentReport(agent=AgentName.CONSISTENCY, weight=0.3, checks_skipped=4),
        AgentReport(agent=AgentName.VARIANCE, weight=0.2, checks_run=10, checks_passed=0),
    ]
    # Consistency is dropped, not scored zero: (0.5*1.0 + 0.2*0.0) / 0.7
    assert weighted_score(reports) == pytest.approx(0.7143, abs=1e-4)


def test_weighted_score_is_none_when_nothing_ran():
    assert weighted_score([AgentReport(agent=AgentName.VARIANCE, weight=0.2, checks_skipped=3)]) is None


def test_report_builder_separates_failures_from_skips():
    builder = ReportBuilder(AgentName.CONSISTENCY)
    builder.passed("A")
    builder.skipped("B", "source lacks the input")
    builder.failed(
        AgentFinding(
            agent=AgentName.CONSISTENCY,
            check_code="C",
            company="ACME",
            year=2023,
            severity=Severity.LOW,
            metric="revenue",
            statement="Revenue of 1,200.0 is odd",
            citations=[_citation()],
        )
    )
    report = builder.build()

    assert (report.checks_run, report.checks_passed, report.checks_skipped) == (2, 1, 1)
    assert report.score == 0.5
    assert report.weight == AGENT_WEIGHTS[AgentName.CONSISTENCY]
    assert report.skipped_reasons == {"B": "source lacks the input"}


def test_merge_reports_accumulates_counts_and_findings():
    def _one(passed: int, run: int, skipped: int) -> AgentReport:
        return AgentReport(
            agent=AgentName.CORRECTNESS,
            weight=0.5,
            checks_run=run,
            checks_passed=passed,
            checks_skipped=skipped,
            skipped_reasons={"X": "no total assets in source"},
        )

    merged = merge_reports(AgentName.CORRECTNESS, [_one(2, 2, 5), _one(1, 2, 5)])
    assert (merged.checks_run, merged.checks_passed, merged.checks_skipped) == (4, 3, 10)
    # One representative reason per rule, not one per year.
    assert merged.skipped_reasons == {"X": "no total assets in source"}


def test_variance_finding_query_text_asks_about_the_change():
    finding = AgentFinding(
        agent=AgentName.VARIANCE,
        check_code="VARIANCE_REVENUE",
        company="ACME",
        year=2023,
        severity=Severity.HIGH,
        metric="revenue",
        statement="Revenue rose 50.0% to 1,200.0",
        citations=[_citation()],
        prior_year=2022,
        pct_change=50.0,
    )
    assert finding.query_text == "Why did ACME's revenue increase 50.0% from 2022 to 2023?"


def test_point_in_time_finding_query_text_stays_short_for_retrieval():
    finding = AgentFinding(
        agent=AgentName.CORRECTNESS,
        check_code="ROE_MISMATCH",
        company="ACME",
        year=2023,
        severity=Severity.HIGH,
        metric="roe",
        statement="Reported ROE of 10.0% does not equal 5.0%",
        citations=[_citation()],
    )
    assert finding.query_text == "ACME roe reported in 2023"

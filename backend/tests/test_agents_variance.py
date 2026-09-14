"""Tests for agent 3 — variance (20%)."""

from __future__ import annotations

from app.agents.contracts import AgentName, Severity
from app.agents.dispatch import VarianceChunk, VariancePoint
from app.agents.variance_agent import classify_severity, run_variance_agent


def _chunk(*points: tuple[int, dict[str, float]]) -> VarianceChunk:
    return VarianceChunk(
        company="ACME",
        points=[
            VariancePoint(year=year, source_row=2000 + year, metrics=metrics)
            for year, metrics in points
        ],
    )


def _codes(report):
    return {f.check_code for f in report.findings}


def test_change_at_or_above_threshold_is_flagged():
    report = run_variance_agent(
        _chunk((2022, {"revenue": 1000.0}), (2023, {"revenue": 1500.0})), threshold_pct=20.0
    )
    assert _codes(report) == {"VARIANCE_REVENUE"}

    finding = report.findings[0]
    assert finding.agent is AgentName.VARIANCE
    assert finding.pct_change == 50.0
    assert finding.prior_year == 2022
    assert finding.prior_value == 1000.0


def test_change_below_threshold_passes_rather_than_flagging():
    report = run_variance_agent(
        _chunk((2022, {"revenue": 1000.0}), (2023, {"revenue": 1050.0})), threshold_pct=20.0
    )
    assert report.findings == []
    assert report.checks_run == 1
    assert report.checks_passed == 1


def test_finding_cites_both_years_at_their_own_source_rows():
    report = run_variance_agent(
        _chunk((2022, {"revenue": 1000.0}), (2023, {"revenue": 1500.0})), threshold_pct=20.0
    )
    citations = report.findings[0].citations

    assert [(c.year, c.value, c.source_row) for c in citations] == [
        (2023, 1500.0, 4023),
        (2022, 1000.0, 4022),
    ]


def test_statement_states_both_values_and_the_change():
    statement = run_variance_agent(
        _chunk((2022, {"revenue": 1000.0}), (2023, {"revenue": 1500.0})), threshold_pct=20.0
    ).findings[0].statement
    assert "1,000.0000 in FY2022" in statement
    assert "1,500.0000 in FY2023" in statement
    assert "50.0%" in statement


def test_sensitive_metrics_clear_high_at_a_lower_magnitude():
    assert classify_severity("net_income", 26) is Severity.HIGH
    assert classify_severity("net_income", 18) is Severity.MEDIUM
    assert classify_severity("net_income", 10) is Severity.LOW

    assert classify_severity("revenue", 45) is Severity.HIGH
    assert classify_severity("revenue", 30) is Severity.MEDIUM
    assert classify_severity("revenue", 21) is Severity.LOW


def test_severity_uses_magnitude_so_a_collapse_ranks_like_a_surge():
    assert classify_severity("net_income", -30) is Severity.HIGH


def test_non_consecutive_years_are_skipped_not_bridged():
    # Presenting a two-year move as a year-over-year figure would misstate
    # the source, so the pair is skipped with a reason.
    report = run_variance_agent(
        _chunk((2020, {"revenue": 1000.0}), (2023, {"revenue": 5000.0})), threshold_pct=20.0
    )
    assert report.findings == []
    assert "VARIANCE_SERIES_GAP" in report.skipped_reasons


def test_a_single_year_of_data_cannot_be_compared():
    report = run_variance_agent(_chunk((2023, {"revenue": 1000.0})))
    assert report.findings == []
    assert report.score is None
    assert "VARIANCE_SERIES" in report.skipped_reasons


def test_metric_absent_in_the_prior_year_is_skipped():
    report = run_variance_agent(
        _chunk((2022, {"revenue": 1000.0}), (2023, {"revenue": 1500.0, "net_income": 90.0})),
        threshold_pct=20.0,
    )
    assert "VARIANCE_NET_INCOME" in report.skipped_reasons
    assert "no base to compare against" in report.skipped_reasons["VARIANCE_NET_INCOME"]


def test_zero_prior_value_is_skipped_rather_than_dividing_by_zero():
    report = run_variance_agent(
        _chunk((2022, {"revenue": 0.0}), (2023, {"revenue": 1500.0})), threshold_pct=20.0
    )
    assert report.findings == []
    assert "undefined" in report.skipped_reasons["VARIANCE_REVENUE"]


def test_year_filter_scopes_the_score_to_the_same_period_as_the_findings():
    chunk = _chunk(
        (2021, {"revenue": 1000.0}),
        (2022, {"revenue": 2000.0}),
        (2023, {"revenue": 2100.0}),
    )
    report = run_variance_agent(chunk, threshold_pct=20.0, year=2023)

    # Only the 2022->2023 comparison is in scope, and it passed.
    assert report.findings == []
    assert report.checks_run == 1
    assert report.checks_passed == 1

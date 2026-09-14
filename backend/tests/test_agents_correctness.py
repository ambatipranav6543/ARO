"""Tests for agent 1 — mathematical correctness (50%).

Every test builds a `CorrectnessChunk` directly. No CSV, no dataset, no
other agent: that independence is what the isolated-chunk design buys.
"""

from __future__ import annotations

from app.agents.contracts import AgentName, Severity
from app.agents.correctness import run_correctness_agent, run_correctness_agent_batch
from app.agents.dispatch import CorrectnessChunk

# Rules that the assigned dataset's columns cannot support.
UNSUPPORTED_RULES = {
    "GROSS_PROFIT_IDENTITY",
    "BALANCE_SHEET_IDENTITY",
    "ROA_MISMATCH",
    "DEBT_TO_EQUITY_MISMATCH",
    "CURRENT_RATIO_MISMATCH",
}


def _chunk(**overrides) -> CorrectnessChunk:
    base = dict(
        company="ACME",
        year=2023,
        source_row=7,
        revenue=1000.0,
        gross_profit=400.0,
        net_income=100.0,
        shareholder_equity=500.0,
        reported_net_profit_margin=10.0,
        reported_roe=20.0,
    )
    base.update(overrides)
    return CorrectnessChunk(**base)


def _codes(report):
    return {f.check_code for f in report.findings}


def test_consistent_ratios_pass_both_verifiable_rules():
    report = run_correctness_agent(_chunk())
    assert report.findings == []
    assert report.checks_run == 2
    assert report.checks_passed == 2
    assert report.score == 1.0


def test_net_profit_margin_mismatch_is_flagged_with_recomputed_value():
    # Reported 18% against an actual 100/1000 = 10%.
    report = run_correctness_agent(_chunk(reported_net_profit_margin=18.0))
    assert _codes(report) == {"NET_PROFIT_MARGIN_MISMATCH"}

    finding = report.findings[0]
    assert finding.agent is AgentName.CORRECTNESS
    assert finding.expected == 10.0
    assert finding.actual == 18.0
    assert finding.severity is Severity.HIGH  # 80% relative error


def test_roe_mismatch_is_flagged():
    report = run_correctness_agent(_chunk(reported_roe=45.0))
    assert _codes(report) == {"ROE_MISMATCH"}
    assert report.findings[0].expected == 20.0


def test_finding_cites_the_reported_value_and_both_of_its_inputs():
    report = run_correctness_agent(_chunk(reported_roe=45.0))
    citations = report.findings[0].citations

    assert [c.field for c in citations] == ["roe", "net_income", "shareholder_equity"]
    assert [c.value for c in citations] == [45.0, 100.0, 500.0]
    # Every citation points back at the same line of the source file.
    assert {c.source_row for c in citations} == {7}
    assert citations[1].render() == "Net Income (ACME FY2023, row 7) = $100.0M"


def test_statement_states_both_figures_rather_than_characterizing_them():
    statement = run_correctness_agent(_chunk(reported_roe=45.0)).findings[0].statement
    assert "45.0000%" in statement
    assert "20.0000%" in statement
    assert "100.0 / 500.0" in statement


def test_rounding_noise_within_tolerance_passes():
    # 4dp source rounding is far below the 0.5% relative tolerance.
    report = run_correctness_agent(_chunk(reported_net_profit_margin=10.0001))
    assert report.findings == []
    assert report.checks_passed == 2


def test_mismatch_severity_is_graded_by_relative_error():
    assert run_correctness_agent(_chunk(reported_roe=21.0)).findings[0].severity is Severity.LOW
    assert run_correctness_agent(_chunk(reported_roe=25.0)).findings[0].severity is Severity.MEDIUM
    assert run_correctness_agent(_chunk(reported_roe=40.0)).findings[0].severity is Severity.HIGH


def test_missing_input_is_skipped_not_counted_as_a_pass():
    report = run_correctness_agent(_chunk(shareholder_equity=None))
    assert report.findings == []
    assert report.checks_run == 1  # only net profit margin could run
    assert report.checks_passed == 1
    assert "ROE_MISMATCH" in report.skipped_reasons
    assert "shareholder_equity" in report.skipped_reasons["ROE_MISMATCH"]


def test_zero_denominator_is_skipped_rather_than_dividing_by_zero():
    report = run_correctness_agent(_chunk(revenue=0.0))
    assert "NET_PROFIT_MARGIN_MISMATCH" in report.skipped_reasons
    assert "undefined" in report.skipped_reasons["NET_PROFIT_MARGIN_MISMATCH"]


def test_rules_the_source_cannot_support_are_reported_as_skipped():
    # The dataset reports no total assets, total debt, COGS or current
    # liabilities. Those checks must read as "not verified", never as clean.
    report = run_correctness_agent(_chunk())
    assert UNSUPPORTED_RULES <= set(report.skipped_reasons)
    assert report.checks_skipped == len(UNSUPPORTED_RULES)
    for code in UNSUPPORTED_RULES:
        assert "not treated as verified" in report.skipped_reasons[code]


def test_batch_folds_every_year_into_one_report():
    chunks = [
        _chunk(year=2021, reported_roe=20.0),
        _chunk(year=2022, reported_roe=45.0),
        _chunk(year=2023, reported_roe=20.0),
    ]
    report = run_correctness_agent_batch(chunks)

    assert report.checks_run == 6  # 2 verifiable rules x 3 years
    assert report.checks_passed == 5
    assert len(report.findings) == 1
    assert report.findings[0].year == 2022
    assert report.checks_skipped == 15  # 5 unsupported rules x 3 years

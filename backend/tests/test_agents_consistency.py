"""Tests for agent 2 — internal consistency (30%).

Several of these encode real breaks found in the assigned dataset, so the
suite fails loudly if a rule that currently catches them stops working.
"""

from __future__ import annotations

from app.agents.consistency import run_consistency_agent, run_consistency_agent_batch
from app.agents.contracts import AgentName, Severity
from app.agents.dispatch import ConsistencyChunk


def _chunk(**overrides) -> ConsistencyChunk:
    base = dict(
        company="ACME",
        year=2023,
        source_row=9,
        revenue=1000.0,
        gross_profit=400.0,
        net_income=100.0,
        ebitda=250.0,
        shareholder_equity=500.0,
        market_cap_b_usd=12.0,
        number_of_employees=1000,
        current_ratio=2.0,
        net_profit_margin=10.0,
        roe=20.0,
        return_on_tangible_equity=22.0,
        cash_flow_operating=200.0,
        cash_flow_investing=-80.0,
        cash_flow_financing=-50.0,
    )
    base.update(overrides)
    return ConsistencyChunk(**base)


def _codes(report):
    return {f.check_code for f in report.findings}


def test_coherent_figures_produce_no_findings():
    report = run_consistency_agent(_chunk())
    assert report.findings == []
    assert report.score == 1.0


def test_gross_profit_above_revenue_is_impossible_and_graded_high():
    report = run_consistency_agent(_chunk(gross_profit=1200.0))
    assert "GROSS_PROFIT_EXCEEDS_REVENUE" in _codes(report)

    finding = next(f for f in report.findings if f.check_code == "GROSS_PROFIT_EXCEEDS_REVENUE")
    assert finding.agent is AgentName.CONSISTENCY
    assert finding.severity is Severity.HIGH
    assert "negative cost of goods sold" in finding.statement
    assert [c.field for c in finding.citations] == ["gross_profit", "revenue"]


def test_positive_roe_on_a_loss_is_a_contradiction():
    # The real shape of AIG FY2018 in the dataset: a net loss reported
    # alongside a positive ROE on positive equity.
    report = run_consistency_agent(_chunk(net_income=-6.0, roe=0.1797, net_profit_margin=-0.6))
    assert "ROE_SIGN_CONTRADICTS_NET_INCOME" in _codes(report)

    finding = next(f for f in report.findings if f.check_code == "ROE_SIGN_CONTRADICTS_NET_INCOME")
    assert finding.severity is Severity.HIGH
    assert "one of these two reported figures is wrong" in finding.statement
    assert [c.field for c in finding.citations] == ["roe", "net_income", "shareholder_equity"]


def test_positive_margin_on_a_loss_is_a_contradiction():
    report = run_consistency_agent(_chunk(net_income=-50.0, roe=-10.0, net_profit_margin=5.0))
    assert "NET_MARGIN_SIGN_CONTRADICTS_NET_INCOME" in _codes(report)


def test_sign_rule_is_skipped_when_the_denominator_is_negative():
    # On negative equity the ratio's sign legitimately inverts, so the rule
    # does not apply and must not fire.
    report = run_consistency_agent(_chunk(net_income=-50.0, shareholder_equity=-200.0, roe=25.0))
    assert "ROE_SIGN_CONTRADICTS_NET_INCOME" not in _codes(report)
    assert "ROE_SIGN_CONTRADICTS_NET_INCOME" in report.skipped_reasons


def test_tangible_equity_return_below_roe_is_flagged_on_a_profit():
    report = run_consistency_agent(_chunk(return_on_tangible_equity=11.7, roe=32.1))
    assert "TANGIBLE_EQUITY_RETURN_BELOW_ROE" in _codes(report)

    finding = next(
        f for f in report.findings if f.check_code == "TANGIBLE_EQUITY_RETURN_BELOW_ROE"
    )
    assert finding.severity is Severity.MEDIUM


def test_tangible_equity_rule_is_skipped_on_a_loss():
    # The inequality legitimately flips when income is negative.
    report = run_consistency_agent(
        _chunk(net_income=-100.0, roe=-20.0, net_profit_margin=-10.0, return_on_tangible_equity=-25.0)
    )
    assert "TANGIBLE_EQUITY_RETURN_BELOW_ROE" not in _codes(report)
    assert "TANGIBLE_EQUITY_RETURN_BELOW_ROE" in report.skipped_reasons


def test_negative_value_where_impossible_is_flagged():
    report = run_consistency_agent(_chunk(current_ratio=-2.0))
    assert "NEGATIVE_VALUE_WHERE_IMPOSSIBLE" in _codes(report)

    finding = next(f for f in report.findings if f.check_code == "NEGATIVE_VALUE_WHERE_IMPOSSIBLE")
    assert finding.severity is Severity.HIGH
    assert finding.metric == "current_ratio"


def test_net_income_above_gross_profit_is_low_not_high():
    # Legitimate when a one-off gain lands below the gross-profit line, so
    # it must prompt a look rather than assert an error.
    report = run_consistency_agent(_chunk(net_income=500.0, net_profit_margin=50.0, roe=100.0))
    finding = next(f for f in report.findings if f.check_code == "NET_INCOME_EXCEEDS_GROSS_PROFIT")
    assert finding.severity is Severity.LOW
    assert "unusual enough to confirm" in finding.statement


def test_ebitda_above_gross_profit_is_low():
    report = run_consistency_agent(_chunk(ebitda=900.0))
    finding = next(f for f in report.findings if f.check_code == "EBITDA_EXCEEDS_GROSS_PROFIT")
    assert finding.severity is Severity.LOW


def test_missing_inputs_are_skipped_not_passed():
    report = run_consistency_agent(_chunk(gross_profit=None))
    for code in (
        "GROSS_PROFIT_EXCEEDS_REVENUE",
        "NET_INCOME_EXCEEDS_GROSS_PROFIT",
        "EBITDA_EXCEEDS_GROSS_PROFIT",
    ):
        assert code in report.skipped_reasons
        assert code not in _codes(report)


def test_every_finding_carries_at_least_one_citation():
    report = run_consistency_agent(
        _chunk(gross_profit=1200.0, net_income=-6.0, roe=0.18, current_ratio=-1.0)
    )
    assert report.findings
    for finding in report.findings:
        assert finding.citations
        assert all(c.source_row == 9 for c in finding.citations)


def test_batch_folds_every_year_into_one_report():
    report = run_consistency_agent_batch([_chunk(year=2022), _chunk(year=2023, gross_profit=1200.0)])
    assert len(report.findings) == 1
    assert report.findings[0].year == 2023
    assert report.checks_run > 0

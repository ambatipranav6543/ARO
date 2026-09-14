"""Unit tests for app.engine.anomaly."""

from app.engine.anomaly import detect_anomalies
from app.schemas.financial import BalanceSheet, FinancialStatement, IncomeStatement


def test_liquidity_and_leverage_flags_fire():
    statement = FinancialStatement(
        company="RiskyCo",
        fiscal_year=2023,
        income_statement=IncomeStatement(revenue=500.0, net_income=-50.0),
        balance_sheet=BalanceSheet(
            total_assets=660.0,
            current_assets=255.0,
            current_liabilities=300.0,  # current ratio 0.85 -> liquidity risk
            total_liabilities=560.0,
            total_debt=340.0,
            shareholder_equity=100.0,  # debt/equity 3.4 -> leverage risk
        ),
    )
    flags = detect_anomalies(statement)
    codes = {f.code for f in flags}
    assert "LIQUIDITY_RISK_CURRENT_RATIO" in codes
    assert "HIGH_LEVERAGE_DEBT_TO_EQUITY" in codes
    assert "NEGATIVE_NET_MARGIN" in codes


def test_clean_statement_has_no_ratio_flags():
    statement = FinancialStatement(
        company="CleanCo",
        fiscal_year=2023,
        income_statement=IncomeStatement(revenue=1000.0, net_income=100.0),
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            current_assets=500.0,
            current_liabilities=200.0,
            total_liabilities=600.0,
            total_debt=200.0,
            shareholder_equity=400.0,
        ),
    )
    flags = detect_anomalies(statement)
    codes = {f.code for f in flags}
    assert "LIQUIDITY_RISK_CURRENT_RATIO" not in codes
    assert "HIGH_LEVERAGE_DEBT_TO_EQUITY" not in codes
    assert "NEGATIVE_NET_MARGIN" not in codes

"""Unit tests for app.engine.ratios."""

from app.engine.ratios import compute_ratios
from app.schemas.financial import BalanceSheet, FinancialStatement, IncomeStatement


def test_compute_ratios_basic():
    statement = FinancialStatement(
        company="TestCo",
        fiscal_year=2023,
        income_statement=IncomeStatement(
            revenue=1000.0,
            cogs=600.0,
            operating_expenses=200.0,
            net_income=100.0,
        ),
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            current_assets=400.0,
            cash_and_equivalents=100.0,
            inventory=150.0,
            current_liabilities=200.0,
            total_liabilities=600.0,
            total_debt=300.0,
            shareholder_equity=400.0,
        ),
    )
    ratios = compute_ratios(statement)

    assert ratios.gross_margin == 0.4  # (1000-600)/1000
    assert ratios.operating_margin == 0.2  # (400-200)/1000
    assert ratios.net_margin == 0.1
    assert ratios.return_on_assets == 0.1
    assert ratios.return_on_equity == 0.25
    assert ratios.current_ratio == 2.0
    assert ratios.quick_ratio == (400 - 150) / 200
    assert ratios.cash_ratio == 0.5
    assert ratios.debt_to_equity == 0.75
    assert ratios.debt_to_assets == 0.3
    assert ratios.equity_ratio == 0.4
    assert ratios.asset_turnover == 1.0


def test_ratios_return_none_when_denominator_missing_or_zero():
    statement = FinancialStatement(
        company="TestCo",
        fiscal_year=2023,
        income_statement=IncomeStatement(revenue=1000.0, net_income=50.0),
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            total_liabilities=600.0,
            shareholder_equity=400.0,
        ),
    )
    ratios = compute_ratios(statement)
    assert ratios.current_ratio is None  # no current_liabilities supplied
    assert ratios.quick_ratio is None
    assert ratios.gross_margin is None  # no cogs supplied

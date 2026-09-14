"""Unit tests for app.engine.validation."""

from app.engine.validation import Severity, validate_statement
from app.schemas.financial import BalanceSheet, FinancialStatement, IncomeStatement


def _make_statement(**overrides) -> FinancialStatement:
    defaults = dict(
        company="TestCo",
        fiscal_year=2023,
        income_statement=IncomeStatement(
            revenue=1000.0,
            cogs=600.0,
            gross_profit=400.0,
            operating_expenses=200.0,
            operating_income=200.0,
            net_income=100.0,
        ),
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            current_assets=400.0,
            current_liabilities=200.0,
            total_liabilities=600.0,
            shareholder_equity=400.0,
        ),
    )
    defaults.update(overrides)
    return FinancialStatement(**defaults)


def test_balanced_statement_is_valid():
    statement = _make_statement()
    result = validate_statement(statement)
    assert result.is_valid
    assert result.error_count == 0


def test_unbalanced_balance_sheet_flagged():
    statement = _make_statement(
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            total_liabilities=600.0,
            shareholder_equity=300.0,  # 600 + 300 = 900 != 1000
        )
    )
    result = validate_statement(statement)
    assert not result.is_valid
    codes = [i.code for i in result.issues]
    assert "BALANCE_SHEET_DOES_NOT_BALANCE" in codes
    issue = next(i for i in result.issues if i.code == "BALANCE_SHEET_DOES_NOT_BALANCE")
    assert issue.severity == Severity.HIGH


def test_gross_profit_mismatch_flagged():
    statement = _make_statement(
        income_statement=IncomeStatement(
            revenue=1000.0,
            cogs=600.0,
            gross_profit=999.0,  # should be 400
            net_income=100.0,
        )
    )
    result = validate_statement(statement)
    codes = [i.code for i in result.issues]
    assert "GROSS_PROFIT_MISMATCH" in codes


def test_negative_shareholder_equity_flagged():
    statement = _make_statement(
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            total_liabilities=1100.0,
            shareholder_equity=-100.0,
        )
    )
    result = validate_statement(statement)
    codes = [i.code for i in result.issues]
    assert "NEGATIVE_SHAREHOLDER_EQUITY" in codes


def test_small_rounding_within_tolerance_does_not_flag():
    statement = _make_statement(
        balance_sheet=BalanceSheet(
            total_assets=1000.0,
            total_liabilities=600.0,
            shareholder_equity=401.0,  # 0.1% off, within default 0.5% tolerance
        )
    )
    result = validate_statement(statement)
    codes = [i.code for i in result.issues]
    assert "BALANCE_SHEET_DOES_NOT_BALANCE" not in codes

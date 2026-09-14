"""Unit tests for app.engine.variance (both the FinancialStatement-based
YoY analysis and the flat FinancialRecord-based flag detector)."""

import pytest

from app.documents.csv_loader import load_records
from app.engine.variance import compute_yoy_analysis, detect_variances
from app.schemas.financial import BalanceSheet, FinancialRecord, FinancialStatement, IncomeStatement


def _statement(year: int, revenue: float, net_income: float) -> FinancialStatement:
    return FinancialStatement(
        company="TestCo",
        fiscal_year=year,
        income_statement=IncomeStatement(revenue=revenue, net_income=net_income),
        balance_sheet=BalanceSheet(
            total_assets=1000.0 + year,
            total_liabilities=600.0,
            shareholder_equity=400.0 + year,
        ),
    )


def test_yoy_growth_and_significance_flag():
    prior = _statement(2022, revenue=1000.0, net_income=100.0)
    current = _statement(2023, revenue=1300.0, net_income=105.0)  # revenue +30%, net income +5%

    analysis = compute_yoy_analysis(current, prior, threshold=0.20)

    revenue_variance = next(li for li in analysis.line_items if li.field == "income_statement.revenue")
    assert revenue_variance.pct_change == pytest.approx(0.3, abs=1e-6)
    assert revenue_variance.is_significant is True

    net_income_variance = next(li for li in analysis.line_items if li.field == "income_statement.net_income")
    assert net_income_variance.is_significant is False

    assert any(li.field == "income_statement.revenue" for li in analysis.significant_changes)


def test_rejects_different_companies():
    prior = _statement(2022, revenue=1000.0, net_income=100.0)
    current = FinancialStatement(
        company="OtherCo",
        fiscal_year=2023,
        income_statement=IncomeStatement(revenue=1000.0, net_income=100.0),
        balance_sheet=BalanceSheet(total_assets=1000.0, total_liabilities=600.0, shareholder_equity=400.0),
    )
    with pytest.raises(ValueError):
        compute_yoy_analysis(current, prior)


def test_rejects_non_increasing_fiscal_year():
    prior = _statement(2023, revenue=1000.0, net_income=100.0)
    current = _statement(2022, revenue=1300.0, net_income=105.0)
    with pytest.raises(ValueError):
        compute_yoy_analysis(current, prior)


def test_detect_variances_flags_large_yoy_change():
    records = [
        FinancialRecord(year=2020, company="ACME", revenue=100.0),
        FinancialRecord(year=2021, company="ACME", revenue=200.0),  # +100%
    ]
    flags = detect_variances(records, threshold_pct=20.0)
    assert len(flags) == 1
    flag = flags[0]
    assert flag.company == "ACME"
    assert flag.metric == "revenue"
    assert flag.pct_change == 100.0


def test_detect_variances_ignores_small_change():
    records = [
        FinancialRecord(year=2020, company="ACME", revenue=100.0),
        FinancialRecord(year=2021, company="ACME", revenue=105.0),  # +5%
    ]
    assert detect_variances(records, threshold_pct=20.0) == []


def test_detect_variances_ignores_non_consecutive_years():
    records = [
        FinancialRecord(year=2018, company="ACME", revenue=100.0),
        FinancialRecord(year=2021, company="ACME", revenue=300.0),
    ]
    assert detect_variances(records, threshold_pct=20.0) == []


def test_real_dataset_produces_flags():
    records = load_records("data/financial_statements.csv")
    flags = detect_variances(records)
    assert len(records) == 161
    assert len(flags) > 0
    assert all(f.company for f in flags)

"""Compatibility with the actual dataset assigned for this project.

Kaggle: financial-statements-of-major-companies (2009-2023). Unlike the
flat CSV_TEMPLATE_COLUMNS format, this dataset reports equity and derived
ratios (ROE, ROA, Debt/Equity, ...) instead of raw total_assets /
total_liabilities, so it's routed through a separate column mapping
(`_kaggle_dataframe_to_statements`), auto-detected by column name.
"""

from pathlib import Path

from app.documents.loader import load_statements_from_csv
from app.engine import run_full_analysis

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "financial_statements.csv"


def test_real_dataset_loads_without_missing_column_error():
    data = DATASET_PATH.read_bytes()
    statements = load_statements_from_csv(data, file_name="financial_statements.csv")
    assert len(statements) == 161


def test_loaded_statement_has_no_fabricated_balance_sheet_totals():
    data = DATASET_PATH.read_bytes()
    statements = load_statements_from_csv(data, file_name="financial_statements.csv")
    aapl_2022 = next(s for s in statements if s.company == "AAPL" and s.fiscal_year == 2022)

    # The source dataset has no raw total_assets/total_liabilities columns —
    # they must stay unset rather than be derived from equity + ratios.
    assert aapl_2022.balance_sheet.total_assets is None
    assert aapl_2022.balance_sheet.total_liabilities is None
    assert aapl_2022.balance_sheet.shareholder_equity == 50672.0


def test_engine_runs_end_to_end_on_real_dataset_without_crashing():
    data = DATASET_PATH.read_bytes()
    statements = load_statements_from_csv(data, file_name="financial_statements.csv")

    for statement in statements:
        result = run_full_analysis(statement)
        # Balance-sheet identity check must be skipped (not silently
        # "passed"), not crash, when totals aren't in the source.
        codes = [i.code for i in result.validation.issues]
        assert "BALANCE_SHEET_DOES_NOT_BALANCE" not in codes


def test_ratios_fall_back_to_reported_values_when_line_items_are_missing():
    data = DATASET_PATH.read_bytes()
    statements = load_statements_from_csv(data, file_name="financial_statements.csv")
    aapl_2022 = next(s for s in statements if s.company == "AAPL" and s.fiscal_year == 2022)

    result = run_full_analysis(aapl_2022)
    # return_on_assets can't be computed (no total_assets) but was reported
    # directly in the source (ROA), so it should still be populated.
    assert result.ratios.return_on_assets is not None
    assert result.ratios.current_ratio is not None

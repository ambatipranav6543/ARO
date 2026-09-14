"""Structured document ingestion (Day 1).

Handles CSV/Excel input, where each row is one company/fiscal-year
statement in the flat template defined by ``CSV_TEMPLATE_COLUMNS``. This
covers the "PDF/Excel input structure" deliverable for tabular sources
(e.g. the Kaggle dummy balance sheet / P&L dataset).

PDF text/table extraction is out of scope here — that's the Day 3 RAG
milestone (chunking + embeddings need the same extraction step), so
``load_statements_from_pdf`` is left as a stub with the interface the
rest of the app expects, so app.api.routes.ingest can wire it up without
changes once it's implemented.
"""

from __future__ import annotations

import io

import pandas as pd

from app.schemas.financial import (
    BalanceSheet,
    CashFlowStatement,
    FinancialStatement,
    IncomeStatement,
    ReportedRatios,
    SourceMeta,
)

# Column -> nested field mapping. Only `company`, `fiscal_year`, `revenue`,
# `net_income`, `total_assets`, `total_liabilities` and `shareholder_equity`
# are required; everything else may be blank in the source file.
CSV_TEMPLATE_COLUMNS: list[str] = [
    "company",
    "ticker",
    "fiscal_year",
    "period",
    "currency",
    # income statement
    "revenue",
    "cogs",
    "operating_expenses",
    "interest_expense",
    "tax_expense",
    "net_income",
    # balance sheet
    "total_assets",
    "current_assets",
    "cash_and_equivalents",
    "inventory",
    "accounts_receivable",
    "total_liabilities",
    "current_liabilities",
    "total_debt",
    "shareholder_equity",
    # cash flow (optional)
    "operating_cash_flow",
    "investing_cash_flow",
    "financing_cash_flow",
    "capex",
]

_REQUIRED_COLUMNS = {
    "company",
    "fiscal_year",
    "revenue",
    "net_income",
    "total_assets",
    "total_liabilities",
    "shareholder_equity",
}


class TemplateValidationError(Exception):
    pass


def _clean(value):
    """Turn pandas NaN into None; leave everything else untouched."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


def _row_to_statement(row: pd.Series, source_file_name: str | None) -> FinancialStatement:
    cf_fields = ("operating_cash_flow", "investing_cash_flow", "financing_cash_flow", "capex")
    has_cash_flow = any(_clean(row.get(f)) is not None for f in cf_fields)

    return FinancialStatement(
        company=str(row["company"]).strip(),
        ticker=_clean(row.get("ticker")),
        fiscal_year=int(row["fiscal_year"]),
        period=_clean(row.get("period")) or "FY",
        currency=_clean(row.get("currency")) or "USD",
        income_statement=IncomeStatement(
            revenue=float(row["revenue"]),
            cogs=_clean(row.get("cogs")),
            operating_expenses=_clean(row.get("operating_expenses")),
            interest_expense=_clean(row.get("interest_expense")),
            tax_expense=_clean(row.get("tax_expense")),
            net_income=float(row["net_income"]),
        ),
        balance_sheet=BalanceSheet(
            total_assets=float(row["total_assets"]),
            current_assets=_clean(row.get("current_assets")),
            cash_and_equivalents=_clean(row.get("cash_and_equivalents")),
            inventory=_clean(row.get("inventory")),
            accounts_receivable=_clean(row.get("accounts_receivable")),
            total_liabilities=float(row["total_liabilities"]),
            current_liabilities=_clean(row.get("current_liabilities")),
            total_debt=_clean(row.get("total_debt")),
            shareholder_equity=float(row["shareholder_equity"]),
        ),
        cash_flow=(
            CashFlowStatement(
                operating_cash_flow=_clean(row.get("operating_cash_flow")),
                investing_cash_flow=_clean(row.get("investing_cash_flow")),
                financing_cash_flow=_clean(row.get("financing_cash_flow")),
                capex=_clean(row.get("capex")),
            )
            if has_cash_flow
            else None
        ),
        source=SourceMeta(origin="csv_upload", file_name=source_file_name),
    )


def _dataframe_to_statements(df: pd.DataFrame, source_file_name: str | None) -> list[FinancialStatement]:
    missing = _REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise TemplateValidationError(
            f"Missing required column(s): {', '.join(sorted(missing))}. "
            f"Expected columns (not all required): {', '.join(CSV_TEMPLATE_COLUMNS)}"
        )

    statements: list[FinancialStatement] = []
    errors: list[str] = []
    for idx, row in df.iterrows():
        try:
            statements.append(_row_to_statement(row, source_file_name))
        except Exception as exc:  # noqa: BLE001 - collect and report all row errors together
            errors.append(f"Row {idx + 2}: {exc}")  # +2 = 1-indexed + header row

    if errors:
        raise TemplateValidationError("Failed to parse some rows:\n" + "\n".join(errors))

    return statements


def load_statements_from_csv(file_bytes: bytes, file_name: str | None = None) -> list[FinancialStatement]:
    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig")
    if _looks_like_kaggle_format(df):
        return _kaggle_dataframe_to_statements(df, file_name)
    return _dataframe_to_statements(df, file_name)


def load_statements_from_excel(file_bytes: bytes, file_name: str | None = None, sheet_name: str | int = 0) -> list[FinancialStatement]:
    df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name)
    if _looks_like_kaggle_format(df):
        return _kaggle_dataframe_to_statements(df, file_name)
    return _dataframe_to_statements(df, file_name)


# --- Kaggle dataset format -------------------------------------------------
#
# The dataset this project actually ingests (Kaggle: financial-statements-
# of-major-companies, 2009-2023) reports equity and derived ratios rather
# than raw balance-sheet totals, so it needs its own column mapping instead
# of CSV_TEMPLATE_COLUMNS. Detected automatically so a plain CSV/Excel
# upload doesn't need a separate endpoint or a format flag from the caller.

_KAGGLE_COLUMNS = {
    "Year",
    "Company",
    "Revenue",
    "Gross Profit",
    "Net Income",
    "Share Holder Equity",
}


def _looks_like_kaggle_format(df: pd.DataFrame) -> bool:
    columns = {c.strip() for c in df.columns}
    return _KAGGLE_COLUMNS.issubset(columns)


def _kaggle_row_to_statement(row: pd.Series, source_file_name: str | None) -> FinancialStatement:
    revenue = float(row["Revenue"])
    gross_profit = float(row["Gross Profit"])
    return FinancialStatement(
        company=str(row["Company"]).strip(),
        ticker=str(row["Company"]).strip(),
        fiscal_year=int(row["Year"]),
        currency="USD",
        income_statement=IncomeStatement(
            revenue=revenue,
            cogs=round(revenue - gross_profit, 6),  # derived: revenue - reported gross profit
            gross_profit=gross_profit,
            net_income=float(row["Net Income"]),
        ),
        balance_sheet=BalanceSheet(
            # No raw total_assets/total_liabilities in this dataset — left
            # unset rather than backed out from equity + ratios.
            shareholder_equity=float(row["Share Holder Equity"]),
        ),
        cash_flow=CashFlowStatement(
            operating_cash_flow=_clean(row.get("Cash Flow from Operating")),
            investing_cash_flow=_clean(row.get("Cash Flow from Investing")),
            financing_cash_flow=_clean(row.get("Cash Flow from Financial Activities")),
        ),
        reported_ratios=ReportedRatios(
            current_ratio=_clean(row.get("Current Ratio")),
            debt_to_equity=_clean(row.get("Debt/Equity Ratio")),
            return_on_equity=_as_fraction(row.get("ROE")),
            return_on_assets=_as_fraction(row.get("ROA")),
            net_margin=_as_fraction(row.get("Net Profit Margin")),
        ),
        source=SourceMeta(
            origin="csv_upload_kaggle",
            file_name=source_file_name,
            notes=f"category={row.get('Category')}" if _clean(row.get("Category")) else None,
        ),
    )


def _as_fraction(value: object) -> float | None:
    """Kaggle ratio columns (ROE, ROA, Net Profit Margin) are reported as
    percentages (e.g. 26.03 meaning 26.03%); RatioResult stores fractions."""
    cleaned = _clean(value)
    if cleaned is None:
        return None
    return round(float(cleaned) / 100, 6)


def _kaggle_dataframe_to_statements(df: pd.DataFrame, source_file_name: str | None) -> list[FinancialStatement]:
    df = df.rename(columns=lambda c: c.strip())
    statements: list[FinancialStatement] = []
    errors: list[str] = []
    for idx, row in df.iterrows():
        try:
            statements.append(_kaggle_row_to_statement(row, source_file_name))
        except Exception as exc:  # noqa: BLE001 - collect and report all row errors together
            errors.append(f"Row {idx + 2}: {exc}")

    if errors:
        raise TemplateValidationError("Failed to parse some rows:\n" + "\n".join(errors))

    return statements


def load_statements_from_pdf(file_bytes: bytes, file_name: str | None = None) -> list[FinancialStatement]:
    """Stub for Day 3 (RAG teammate).

    PDF ingestion needs table/text extraction (e.g. PyMuPDF/pdfplumber) and
    should populate both a ``FinancialStatement`` (for the engine) and
    page-referenced text chunks (for the vector store). Implement here and
    wire into ``app.api.routes.ingest`` — the route already calls this
    function name, so no other changes should be needed.
    """
    raise NotImplementedError(
        "PDF ingestion is part of the Day 3 RAG milestone (document extraction + chunking). "
        "Use CSV/Excel upload or the JSON endpoint for now."
    )

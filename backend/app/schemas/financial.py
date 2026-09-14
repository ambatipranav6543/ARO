"""Normalized financial statement schemas.

This module carries two schemas, deliberately kept separate rather than
forced into one:

- ``FinancialStatement`` (below) is the rich, nested contract for the
  ingestion/persistence/validation/ratio/anomaly engine — company,
  fiscal_year, income statement, balance sheet, cash flow, and (for
  sources that don't report raw balance-sheet totals) reported ratios.
- ``FinancialRecord`` (bottom of file) is the flat, one-row-per-company-
  year shape the RAG layer builds evidence snippets from directly off the
  source CSV columns.

They describe the same underlying data from two different consumers'
point of view; unifying them into a single model is a real design
decision the team should make deliberately, not something to force via a
merge conflict resolution.

Design notes (``FinancialStatement``)
--------------------------------------
- Only ``company``, ``fiscal_year``, ``revenue`` and ``net_income`` are
  required on the income statement; ``shareholder_equity`` is the only
  required balance-sheet field. ``total_assets`` / ``total_liabilities``
  are optional because the dataset actually used by this project (Kaggle:
  financial-statements-of-major-companies) doesn't report them — only
  equity and derived ratios (ROE, ROA, Debt/Equity, ...).
- Derived subtotals (``gross_profit``, ``operating_income``,
  ``free_cash_flow``) can be supplied OR left blank and computed by the
  engine — never trust a supplied subtotal blindly, the validator
  cross-checks it against its components.
- All monetary fields are plain ``float`` in the statement's reporting
  currency (no unit scaling applied here — assume the source data is
  already in whatever unit the caller states, e.g. millions).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class Period(str, Enum):
    FY = "FY"
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class StatementType(str, Enum):
    INCOME_STATEMENT = "income_statement"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW = "cash_flow"


class SourceMeta(BaseModel):
    """Provenance for a statement. Extended by Day 3 (RAG) with page-level
    evidence pointers; kept here so the field exists from Day 1 onward."""

    origin: Optional[str] = Field(
        default=None, description="e.g. 'manual_json', 'csv_upload', 'pdf_upload'"
    )
    file_name: Optional[str] = None
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None


class IncomeStatement(BaseModel):
    revenue: float = Field(..., description="Total revenue / net sales")
    cogs: Optional[float] = Field(default=None, description="Cost of goods sold")
    gross_profit: Optional[float] = None
    operating_expenses: Optional[float] = None
    operating_income: Optional[float] = None
    interest_expense: Optional[float] = None
    other_income_expense: Optional[float] = None
    tax_expense: Optional[float] = None
    net_income: float = Field(..., description="Bottom-line net income")

    def derived_gross_profit(self) -> Optional[float]:
        if self.cogs is None:
            return None
        return round(self.revenue - self.cogs, 6)

    def derived_operating_income(self) -> Optional[float]:
        gp = self.gross_profit if self.gross_profit is not None else self.derived_gross_profit()
        if gp is None or self.operating_expenses is None:
            return None
        return round(gp - self.operating_expenses, 6)


class BalanceSheet(BaseModel):
    # total_assets / total_liabilities are optional: some sources (e.g. the
    # Kaggle dataset actually used by this project) report only equity and
    # derived ratios, not the raw totals. The balance-sheet identity check
    # in the validator is skipped when either is missing — it is never
    # backed out from the other fields, since that would just be checking
    # our own arithmetic instead of the source data.
    total_assets: Optional[float] = None
    current_assets: Optional[float] = None
    cash_and_equivalents: Optional[float] = None
    inventory: Optional[float] = None
    accounts_receivable: Optional[float] = None
    total_liabilities: Optional[float] = None
    current_liabilities: Optional[float] = None
    total_debt: Optional[float] = None
    shareholder_equity: float

    def derived_total_from_equation(self) -> Optional[float]:
        if self.total_liabilities is None:
            return None
        return round(self.total_liabilities + self.shareholder_equity, 6)


class CashFlowStatement(BaseModel):
    operating_cash_flow: Optional[float] = None
    investing_cash_flow: Optional[float] = None
    financing_cash_flow: Optional[float] = None
    capex: Optional[float] = Field(default=None, description="Capital expenditure (positive number)")

    def derived_free_cash_flow(self) -> Optional[float]:
        if self.operating_cash_flow is None or self.capex is None:
            return None
        return round(self.operating_cash_flow - self.capex, 6)

    def derived_net_change_in_cash(self) -> Optional[float]:
        parts = [self.operating_cash_flow, self.investing_cash_flow, self.financing_cash_flow]
        if any(p is None for p in parts):
            return None
        return round(sum(p for p in parts if p is not None), 6)


class ReportedRatios(BaseModel):
    """Ratios as directly reported by a source, for datasets (like the
    Kaggle dataset this project uses) that publish ratios but not the raw
    balance-sheet totals they'd otherwise be computed from. All values are
    fractions (e.g. 0.26 for 26%), matching ``engine.ratios.RatioResult``.

    ``compute_ratios`` prefers a value it can compute from line items and
    falls back to these only when the line items aren't available — a
    reported ratio is real source data, never a fabricated one.
    """

    current_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    return_on_equity: Optional[float] = None
    return_on_assets: Optional[float] = None
    net_margin: Optional[float] = None


class FinancialStatement(BaseModel):
    """A single company/fiscal-period bundle of statements."""

    id: Optional[int] = Field(default=None, description="Set by storage layer on save")
    company: str
    ticker: Optional[str] = None
    fiscal_year: int = Field(..., ge=1900, le=2100)
    period: Period = Period.FY
    currency: str = "USD"

    income_statement: IncomeStatement
    balance_sheet: BalanceSheet
    cash_flow: Optional[CashFlowStatement] = None
    reported_ratios: Optional[ReportedRatios] = None

    source: SourceMeta = Field(default_factory=SourceMeta)

    @model_validator(mode="after")
    def _check_required_bundles(self) -> "FinancialStatement":
        # Pydantic already enforces required sub-fields; this hook is the
        # extension point for Day 3+ cross-statement wiring if needed.
        return self

    def key(self) -> tuple[str, int, str]:
        """Identity used for lookups, comparisons and RAG evidence linking."""
        return (self.company.strip().lower(), self.fiscal_year, self.period.value)


class FinancialStatementCreate(FinancialStatement):
    """Payload shape for ingestion (id is never accepted from the client)."""

    id: None = None


class FinancialRecord(BaseModel):
    """Flat, one-row-per-company-year shape used by the RAG layer — built
    directly from the source CSV's own columns, independent of
    ``FinancialStatement`` above. See the module docstring."""

    year: int
    company: str
    category: str | None = None

    # 1-based line number this row was parsed from in the source file
    # (header is line 1), so a finding can cite an actual line a reviewer
    # can open and check. None when the record wasn't built from a file.
    source_row: int | None = None

    market_cap_b_usd: float | None = Field(default=None, description="USD, billions")
    revenue: float | None = Field(default=None, description="USD, millions")
    gross_profit: float | None = Field(default=None, description="USD, millions")
    net_income: float | None = Field(default=None, description="USD, millions")
    earning_per_share: float | None = None
    ebitda: float | None = Field(default=None, description="USD, millions")
    shareholder_equity: float | None = Field(default=None, description="USD, millions")
    cash_flow_operating: float | None = Field(default=None, description="USD, millions")
    cash_flow_investing: float | None = Field(default=None, description="USD, millions")
    cash_flow_financing: float | None = Field(default=None, description="USD, millions")
    current_ratio: float | None = None
    debt_equity_ratio: float | None = None
    roe: float | None = Field(default=None, description="Return on equity, %")
    roa: float | None = Field(default=None, description="Return on assets, %")
    roi: float | None = Field(default=None, description="Return on investment, %")
    net_profit_margin: float | None = Field(default=None, description="%")
    free_cash_flow_per_share: float | None = None
    return_on_tangible_equity: float | None = Field(default=None, description="%")
    number_of_employees: int | None = None
    inflation_rate_us: float | None = Field(default=None, description="%")

    @property
    def key(self) -> str:
        return f"{self.company}:{self.year}"

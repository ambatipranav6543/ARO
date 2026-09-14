"""Year-over-year variance analysis.

Two implementations coexist here, over the two schemas described in
``app.schemas.financial``:

- ``compute_yoy_analysis`` works over the rich, nested ``FinancialStatement``
  (validation/ratio/anomaly engine's line-item + ratio YoY comparison).
- ``detect_variances`` works over the flat ``FinancialRecord`` (RAG's
  threshold-based flag detector, which also generates the natural-language
  query text RAG uses to retrieve evidence for each flag).

Both are pure arithmetic — no LLM involved either way.
"""

from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel

from app.engine.ratios import RatioResult, compute_ratios
from app.schemas.financial import FinancialRecord, FinancialStatement

# Line items compared YoY, mapped to a human label and a "higher magnitude
# of change is worth flagging" default threshold (relative change).
_TRACKED_LINE_ITEMS: dict[str, str] = {
    "income_statement.revenue": "Revenue",
    "income_statement.cogs": "COGS",
    "income_statement.operating_expenses": "Operating expenses",
    "income_statement.net_income": "Net income",
    "balance_sheet.total_assets": "Total assets",
    "balance_sheet.total_liabilities": "Total liabilities",
    "balance_sheet.shareholder_equity": "Shareholder equity",
    "balance_sheet.total_debt": "Total debt",
    "balance_sheet.cash_and_equivalents": "Cash and equivalents",
}

DEFAULT_SIGNIFICANCE_THRESHOLD = 0.20  # 20% YoY move is "significant" by default


def _resolve(statement: FinancialStatement, dotted_path: str) -> float | None:
    obj: object = statement
    for part in dotted_path.split("."):
        obj = getattr(obj, part, None)
        if obj is None:
            return None
    return obj  # type: ignore[return-value]


class LineItemVariance(BaseModel):
    field: str
    label: str
    prior_value: float | None
    current_value: float | None
    absolute_change: float | None
    pct_change: float | None
    is_significant: bool


class RatioVariance(BaseModel):
    ratio: str
    prior_value: float | None
    current_value: float | None
    absolute_change: float | None


class YoYAnalysis(BaseModel):
    company: str
    prior_fiscal_year: int
    current_fiscal_year: int
    line_items: list[LineItemVariance]
    ratios: list[RatioVariance]
    significant_changes: list[LineItemVariance]


def _pct_change(prior: float | None, current: float | None) -> float | None:
    if prior is None or current is None or prior == 0:
        return None
    return round((current - prior) / abs(prior), 6)


def compute_yoy_analysis(
    current: FinancialStatement,
    prior: FinancialStatement,
    threshold: float = DEFAULT_SIGNIFICANCE_THRESHOLD,
) -> YoYAnalysis:
    if current.company.strip().lower() != prior.company.strip().lower():
        raise ValueError("Cannot compare statements from two different companies")
    if current.fiscal_year <= prior.fiscal_year:
        raise ValueError("`current` must be a later fiscal year than `prior`")

    line_items: list[LineItemVariance] = []
    for field, label in _TRACKED_LINE_ITEMS.items():
        prior_value = _resolve(prior, field)
        current_value = _resolve(current, field)
        pct = _pct_change(prior_value, current_value)
        abs_change = (
            round(current_value - prior_value, 6)
            if prior_value is not None and current_value is not None
            else None
        )
        line_items.append(
            LineItemVariance(
                field=field,
                label=label,
                prior_value=prior_value,
                current_value=current_value,
                absolute_change=abs_change,
                pct_change=pct,
                is_significant=(pct is not None and abs(pct) >= threshold),
            )
        )

    prior_ratios = compute_ratios(prior)
    current_ratios = compute_ratios(current)
    ratio_variances: list[RatioVariance] = []
    for ratio_name in RatioResult.model_fields:
        prior_value = getattr(prior_ratios, ratio_name)
        current_value = getattr(current_ratios, ratio_name)
        abs_change = (
            round(current_value - prior_value, 6)
            if prior_value is not None and current_value is not None
            else None
        )
        ratio_variances.append(
            RatioVariance(
                ratio=ratio_name,
                prior_value=prior_value,
                current_value=current_value,
                absolute_change=abs_change,
            )
        )

    significant = [li for li in line_items if li.is_significant]

    return YoYAnalysis(
        company=current.company,
        prior_fiscal_year=prior.fiscal_year,
        current_fiscal_year=current.fiscal_year,
        line_items=line_items,
        ratios=ratio_variances,
        significant_changes=significant,
    )


# --- Flat/RAG-facing flag detector -----------------------------------------

# Metrics worth flagging when they swing sharply YoY.
WATCHED_METRICS: tuple[str, ...] = (
    "revenue",
    "gross_profit",
    "net_income",
    "ebitda",
    "net_profit_margin",
    "debt_equity_ratio",
)

DEFAULT_THRESHOLD_PCT = 20.0


@dataclass(frozen=True)
class VarianceFlag:
    company: str
    metric: str
    year: int
    prior_year: int
    value: float
    prior_value: float
    pct_change: float

    @property
    def query_text(self) -> str:
        """Natural-language question for the RAG stage to find evidence for."""
        direction = "increase" if self.pct_change >= 0 else "decrease"
        return (
            f"Why did {self.company}'s {self.metric.replace('_', ' ')} {direction} "
            f"{abs(self.pct_change):.1f}% from {self.prior_year} to {self.year}?"
        )


def detect_variances(
    records: list[FinancialRecord],
    threshold_pct: float = DEFAULT_THRESHOLD_PCT,
) -> list[VarianceFlag]:
    by_company: dict[str, list[FinancialRecord]] = {}
    for rec in records:
        by_company.setdefault(rec.company, []).append(rec)

    flags: list[VarianceFlag] = []
    for company, rows in by_company.items():
        rows_sorted = sorted(rows, key=lambda r: r.year)
        for prev, curr in zip(rows_sorted, rows_sorted[1:]):
            if curr.year != prev.year + 1:
                continue  # not consecutive years, skip
            for metric in WATCHED_METRICS:
                prior_value = getattr(prev, metric)
                value = getattr(curr, metric)
                if prior_value in (None, 0) or value is None:
                    continue
                pct_change = (value - prior_value) / abs(prior_value) * 100
                if abs(pct_change) >= threshold_pct:
                    flags.append(
                        VarianceFlag(
                            company=company,
                            metric=metric,
                            year=curr.year,
                            prior_year=prev.year,
                            value=value,
                            prior_value=prior_value,
                            pct_change=pct_change,
                        )
                    )
    return flags

"""Row-to-text synthesis: turn structured `FinancialRecord`s into retrievable
evidence snippets.

The source dataset is tabular (no narrative filing text), so there is
nothing to "extract" — instead each company-year record, and each
consecutive-year comparison, is deterministically rendered into a short
factual sentence. Every number in a snippet traces directly back to the
dataset, so retrieval can never surface a claim that wasn't in the source
data (no hallucinated evidence).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.schemas.financial import FinancialRecord

_METRIC_LABELS: dict[str, str] = {
    "revenue": ("Revenue", "$M"),
    "gross_profit": ("Gross Profit", "$M"),
    "net_income": ("Net Income", "$M"),
    "ebitda": ("EBITDA", "$M"),
    "net_profit_margin": ("Net Profit Margin", "%"),
    "debt_equity_ratio": ("Debt/Equity Ratio", "x"),
    "roe": ("ROE", "%"),
    "roa": ("ROA", "%"),
    "current_ratio": ("Current Ratio", "x"),
}


@dataclass(frozen=True)
class EvidenceSnippet:
    id: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


def _fmt(value: float, unit: str) -> str:
    if unit == "$M":
        return f"${value:,.0f}M"
    if unit == "%":
        return f"{value:.2f}%"
    return f"{value:.2f}{unit if unit != 'x' else 'x'}"


def record_snippet(rec: FinancialRecord) -> EvidenceSnippet:
    """One snippet summarizing a single company-year's key figures."""
    parts = [f"{rec.company} fiscal year {rec.year} ({rec.category or 'n/a'})."]
    for field_name, (label, unit) in _METRIC_LABELS.items():
        value = getattr(rec, field_name)
        if value is not None:
            parts.append(f"{label}: {_fmt(value, unit)}.")
    if rec.number_of_employees is not None:
        parts.append(f"Employees: {rec.number_of_employees:,}.")
    text = " ".join(parts)
    return EvidenceSnippet(
        id=f"{rec.company}-{rec.year}-summary",
        text=text,
        metadata={"company": rec.company, "year": rec.year, "kind": "summary"},
    )


def comparison_snippet(prev: FinancialRecord, curr: FinancialRecord) -> EvidenceSnippet:
    """One snippet per watched metric describing its YoY change, for a
    consecutive pair of years of the same company."""
    lines = []
    for field_name, (label, unit) in _METRIC_LABELS.items():
        prior_value = getattr(prev, field_name)
        value = getattr(curr, field_name)
        if prior_value in (None, 0) or value is None:
            continue
        pct_change = (value - prior_value) / abs(prior_value) * 100
        direction = "increased" if pct_change >= 0 else "decreased"
        lines.append(
            f"{curr.company}'s {label} {direction} {abs(pct_change):.1f}% "
            f"from {_fmt(prior_value, unit)} in {prev.year} to "
            f"{_fmt(value, unit)} in {curr.year}."
        )
    text = " ".join(lines) if lines else (
        f"No comparable metrics available for {curr.company} between "
        f"{prev.year} and {curr.year}."
    )
    return EvidenceSnippet(
        id=f"{curr.company}-{prev.year}-{curr.year}-comparison",
        text=text,
        metadata={"company": curr.company, "year": curr.year, "kind": "comparison"},
    )


def build_snippets(records: list[FinancialRecord]) -> list[EvidenceSnippet]:
    """Build the full evidence corpus: one summary snippet per record, plus
    one comparison snippet per consecutive company-year pair."""
    snippets = [record_snippet(rec) for rec in records]

    by_company: dict[str, list[FinancialRecord]] = {}
    for rec in records:
        by_company.setdefault(rec.company, []).append(rec)

    for rows in by_company.values():
        rows_sorted = sorted(rows, key=lambda r: r.year)
        for prev, curr in zip(rows_sorted, rows_sorted[1:]):
            if curr.year == prev.year + 1:
                snippets.append(comparison_snippet(prev, curr))

    return snippets

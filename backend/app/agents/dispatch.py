"""Dispatch: slice the uploaded data into isolated, per-agent chunks.

This is the decentralization boundary. Each specialist agent receives a
narrow model containing **only the fields it needs to do its one job** —
not the full `FinancialRecord`. That has three consequences worth stating
plainly, because they are the point of the design:

1. An agent cannot reach for a field outside its remit, because the field
   is not present on the object it was handed.
2. Each agent is testable in isolation from a hand-built chunk, with no
   CSV, no dataset, and no other agent involved.
3. What each agent is allowed to see is declared in one place (here), so
   it can be reviewed as a policy rather than inferred from code paths.

Chunks carry `source_row` through from the loader so that every downstream
citation can point at an actual line in the uploaded file.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.financial import FinancialRecord

# Metrics the variance agent tracks across years. Deliberately narrower
# than "every numeric column": a variance flag on an incidental field is
# noise a human reviewer has to clear.
WATCHED_METRICS: tuple[str, ...] = (
    "revenue",
    "gross_profit",
    "net_income",
    "ebitda",
    "net_profit_margin",
    "debt_equity_ratio",
)


class CorrectnessChunk(BaseModel):
    """Agent 1's isolated view: raw figures, plus exactly those reported
    ratios that are definitionally recomputable from them.

    `roa`, `roi` and `current_ratio` are deliberately absent — the source
    reports no total assets, invested capital or current liabilities, so
    those ratios cannot be independently recomputed. Handing them to this
    agent would invite it to validate a number it has no basis to check.
    """

    company: str
    year: int
    source_row: int | None = None

    revenue: float | None = None
    gross_profit: float | None = None
    net_income: float | None = None
    shareholder_equity: float | None = None

    reported_net_profit_margin: float | None = None
    reported_roe: float | None = None


class ConsistencyChunk(BaseModel):
    """Agent 2's isolated view: the figures whose *mutual coherence* it
    checks. It never recomputes a ratio from its definition (that is agent
    1's job); it checks that separately reported figures don't contradict
    one another."""

    company: str
    year: int
    source_row: int | None = None

    revenue: float | None = None
    gross_profit: float | None = None
    net_income: float | None = None
    ebitda: float | None = None
    shareholder_equity: float | None = None

    market_cap_b_usd: float | None = None
    number_of_employees: int | None = None
    current_ratio: float | None = None

    net_profit_margin: float | None = None
    roe: float | None = None
    return_on_tangible_equity: float | None = None

    cash_flow_operating: float | None = None
    cash_flow_investing: float | None = None
    cash_flow_financing: float | None = None


class VariancePoint(BaseModel):
    """One year of watched metrics, for the variance agent's time series."""

    year: int
    source_row: int | None = None
    metrics: dict[str, float] = Field(default_factory=dict)


class VarianceChunk(BaseModel):
    """Agent 3's isolated view: one company's watched metrics over time,
    and nothing else. It sees no ratio it doesn't track and no
    point-in-time field, because it only ever reasons about movement
    between consecutive years."""

    company: str
    points: list[VariancePoint] = Field(default_factory=list)


class DispatchBundle(BaseModel):
    """Everything the orchestrator hands out for one company: one chunk per
    year for the two point-in-time agents, one time series for variance."""

    company: str
    correctness: list[CorrectnessChunk] = Field(default_factory=list)
    consistency: list[ConsistencyChunk] = Field(default_factory=list)
    variance: VarianceChunk


def slice_for_correctness(record: FinancialRecord) -> CorrectnessChunk:
    return CorrectnessChunk(
        company=record.company,
        year=record.year,
        source_row=record.source_row,
        revenue=record.revenue,
        gross_profit=record.gross_profit,
        net_income=record.net_income,
        shareholder_equity=record.shareholder_equity,
        reported_net_profit_margin=record.net_profit_margin,
        reported_roe=record.roe,
    )


def slice_for_consistency(record: FinancialRecord) -> ConsistencyChunk:
    return ConsistencyChunk(
        company=record.company,
        year=record.year,
        source_row=record.source_row,
        revenue=record.revenue,
        gross_profit=record.gross_profit,
        net_income=record.net_income,
        ebitda=record.ebitda,
        shareholder_equity=record.shareholder_equity,
        market_cap_b_usd=record.market_cap_b_usd,
        number_of_employees=record.number_of_employees,
        current_ratio=record.current_ratio,
        net_profit_margin=record.net_profit_margin,
        roe=record.roe,
        return_on_tangible_equity=record.return_on_tangible_equity,
        cash_flow_operating=record.cash_flow_operating,
        cash_flow_investing=record.cash_flow_investing,
        cash_flow_financing=record.cash_flow_financing,
    )


def slice_for_variance(company: str, records: list[FinancialRecord]) -> VarianceChunk:
    points: list[VariancePoint] = []
    for record in sorted(records, key=lambda r: r.year):
        metrics = {
            metric: value
            for metric in WATCHED_METRICS
            if (value := getattr(record, metric)) is not None
        }
        points.append(
            VariancePoint(year=record.year, source_row=record.source_row, metrics=metrics)
        )
    return VarianceChunk(company=company, points=points)


def build_bundle(company: str, records: list[FinancialRecord]) -> DispatchBundle:
    """Slice one company's records into the three isolated agent views."""
    ordered = sorted(records, key=lambda r: r.year)
    return DispatchBundle(
        company=company,
        correctness=[slice_for_correctness(r) for r in ordered],
        consistency=[slice_for_consistency(r) for r in ordered],
        variance=slice_for_variance(company, ordered),
    )


__all__ = [
    "WATCHED_METRICS",
    "ConsistencyChunk",
    "CorrectnessChunk",
    "DispatchBundle",
    "VarianceChunk",
    "VariancePoint",
    "build_bundle",
    "slice_for_consistency",
    "slice_for_correctness",
    "slice_for_variance",
]

"""Agent 3 — Variance (20% of the review weighting).

One job: **which figures moved materially between consecutive years?** This
agent reasons only about movement. It never recomputes a ratio (agent 1) and
never compares two figures within a single year (agent 2). Its isolated view
is a time series of watched metrics and nothing else.

Materiality is graded, not binary. A 30% swing in revenue is ordinary for a
growth company; a 30% swing in net margin or leverage is not. Sensitive
metrics therefore clear HIGH at a lower magnitude — the thresholds are
explicit constants below so that "why is this HIGH?" has a one-line answer
in a review.

Only consecutive years are compared. A gap in the series is skipped with a
stated reason rather than silently bridged, since a two-year jump presented
as a one-year change would misstate the source.

No LLM. Pure arithmetic, fixed thresholds, deterministic output.
"""

from __future__ import annotations

from app.agents.contracts import (
    AGENT_WEIGHTS,
    AgentFinding,
    AgentName,
    AgentReport,
    ReportBuilder,
    Severity,
    cite,
)
from app.agents.dispatch import VarianceChunk, VariancePoint

DEFAULT_THRESHOLD_PCT = 20.0

# Metrics where a smaller swing is still material: profitability and
# leverage deterioration matters at lower magnitudes than revenue noise.
SENSITIVE_METRICS = frozenset({"net_income", "debt_equity_ratio", "net_profit_margin", "ebitda"})

_SENSITIVE_HIGH = 25.0
_SENSITIVE_MEDIUM = 15.0
_STANDARD_HIGH = 40.0
_STANDARD_MEDIUM = 25.0

_METRIC_LABELS: dict[str, str] = {
    "revenue": "Revenue",
    "gross_profit": "Gross Profit",
    "net_income": "Net Income",
    "ebitda": "EBITDA",
    "net_profit_margin": "Net Profit Margin",
    "debt_equity_ratio": "Debt/Equity Ratio",
}


def classify_severity(metric: str, pct_change: float) -> Severity:
    magnitude = abs(pct_change)
    if metric in SENSITIVE_METRICS:
        if magnitude >= _SENSITIVE_HIGH:
            return Severity.HIGH
        if magnitude >= _SENSITIVE_MEDIUM:
            return Severity.MEDIUM
        return Severity.LOW
    if magnitude >= _STANDARD_HIGH:
        return Severity.HIGH
    if magnitude >= _STANDARD_MEDIUM:
        return Severity.MEDIUM
    return Severity.LOW


def _compare_pair(
    builder: ReportBuilder,
    company: str,
    prior: VariancePoint,
    current: VariancePoint,
    threshold_pct: float,
) -> None:
    for metric, value in current.metrics.items():
        code = f"VARIANCE_{metric.upper()}"
        prior_value = prior.metrics.get(metric)
        if prior_value is None:
            builder.skipped(
                code,
                f"{_METRIC_LABELS.get(metric, metric)} is not reported for "
                f"{company} FY{prior.year}, so there is no base to compare against",
            )
            continue
        if prior_value == 0:
            builder.skipped(
                code,
                f"{_METRIC_LABELS.get(metric, metric)} is zero for {company} FY{prior.year}, "
                "so a percentage change is undefined",
            )
            continue

        pct_change = (value - prior_value) / abs(prior_value) * 100
        if abs(pct_change) < threshold_pct:
            builder.passed(code)
            continue

        label = _METRIC_LABELS.get(metric, metric.replace("_", " ").title())
        direction = "increased" if pct_change >= 0 else "decreased"
        builder.failed(
            AgentFinding(
                agent=AgentName.VARIANCE,
                check_code=code,
                company=company,
                year=current.year,
                severity=classify_severity(metric, pct_change),
                metric=metric,
                statement=(
                    f"{label} {direction} {abs(pct_change):,.1f}% year over year, from "
                    f"{prior_value:,.4f} in FY{prior.year} to {value:,.4f} in FY{current.year} "
                    f"(a change of {value - prior_value:,.4f}). This is at or above the "
                    f"{threshold_pct:,.0f}% materiality threshold for review."
                ),
                citations=[
                    cite(metric, company, current.year, value, current.source_row),
                    cite(metric, company, prior.year, prior_value, prior.source_row),
                ],
                actual=round(value, 6),
                prior_year=prior.year,
                prior_value=round(prior_value, 6),
                difference=round(value - prior_value, 6),
                pct_change=round(pct_change, 4),
            )
        )


def run_variance_agent(
    chunk: VarianceChunk,
    threshold_pct: float = DEFAULT_THRESHOLD_PCT,
    year: int | None = None,
) -> AgentReport:
    """Compare consecutive years in one company's isolated time series.

    `year`, when given, scopes the review to changes *into* that fiscal
    year: earlier pairs are not compared and not counted, so the reported
    pass rate describes the same scope as the findings. The full series is
    still required as input, since the prior year supplies the base.
    """
    builder = ReportBuilder(AgentName.VARIANCE)
    points = sorted(chunk.points, key=lambda p: p.year)

    if len(points) < 2:
        return AgentReport(
            agent=AgentName.VARIANCE,
            weight=AGENT_WEIGHTS[AgentName.VARIANCE],
            checks_skipped=1,
            skipped_reasons={
                "VARIANCE_SERIES": (
                    f"{chunk.company} has {len(points)} year(s) of data in the source; "
                    "at least two consecutive years are needed to measure change"
                )
            },
        )

    for prior, current in zip(points, points[1:]):
        if year is not None and current.year != year:
            continue
        if current.year != prior.year + 1:
            builder.skipped(
                "VARIANCE_SERIES_GAP",
                f"{chunk.company} has a gap between FY{prior.year} and FY{current.year}; "
                "non-consecutive years are not compared, as the change would not be "
                "a year-over-year figure",
            )
            continue
        _compare_pair(builder, chunk.company, prior, current, threshold_pct)

    return builder.build()


__all__ = [
    "DEFAULT_THRESHOLD_PCT",
    "SENSITIVE_METRICS",
    "classify_severity",
    "run_variance_agent",
]

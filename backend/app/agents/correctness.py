"""Agent 1 — Mathematical Correctness (50% of the review weighting).

One job: **is each reported number computed correctly?** Every rule here
takes a figure the source reported, recomputes it from its own definitional
formula using other figures the same source reported, and compares. That is
the whole remit — relationships *between* figures that no formula defines
belong to agent 2 (internal consistency), and movement between years
belongs to agent 3 (variance).

No LLM. Pure arithmetic, fixed thresholds, deterministic output.

A rule whose inputs the source doesn't carry is recorded as **skipped with
a stated reason**, never as a pass. The assigned Kaggle dataset reports no
total assets, total debt, COGS or current assets/liabilities, so 5 of the 7
rules below cannot run against it — which the report says out loud rather
than quietly scoring as clean.
"""

from __future__ import annotations

from app.agents.contracts import (
    FIELD_PROVENANCE,
    AgentFinding,
    AgentName,
    AgentReport,
    ReportBuilder,
    Severity,
    cite,
    merge_reports,
)
from app.agents.dispatch import CorrectnessChunk

# Relative tolerance for a recomputed value vs. the reported one. Matches
# `app.engine.validation.DEFAULT_TOLERANCE` — 0.5% absorbs source rounding
# (the dataset reports ratios to 4dp, so genuine rounding error is ~1e-5)
# without hiding a real arithmetic break.
DEFAULT_TOLERANCE = 0.005

# Relative-error bands for grading a mismatch once it clears tolerance.
_HIGH_ERROR = 0.25
_MEDIUM_ERROR = 0.05


def _relative_error(reported: float, recomputed: float) -> float:
    return abs(reported - recomputed) / max(abs(reported), 1e-9)


def _grade(relative_error: float) -> Severity:
    if relative_error >= _HIGH_ERROR:
        return Severity.HIGH
    if relative_error >= _MEDIUM_ERROR:
        return Severity.MEDIUM
    return Severity.LOW


def _ratio_rule(
    builder: ReportBuilder,
    chunk: CorrectnessChunk,
    *,
    check_code: str,
    metric: str,
    label: str,
    reported: float | None,
    numerator: float | None,
    numerator_field: str,
    denominator: float | None,
    denominator_field: str,
    tolerance: float,
) -> None:
    """Recompute `reported` as numerator/denominator*100 and compare.

    Shared by every percentage ratio this agent verifies; the differences
    between those rules are only which fields feed it, so they are passed
    in rather than duplicated three times over.
    """
    missing = [
        name
        for name, value in (
            (f"reported {label}", reported),
            (numerator_field, numerator),
            (denominator_field, denominator),
        )
        if value is None
    ]
    if missing:
        builder.skipped(
            check_code,
            f"source does not report {', '.join(missing)} for {chunk.company} FY{chunk.year}",
        )
        return
    if denominator == 0:
        builder.skipped(
            check_code,
            f"{denominator_field} is zero for {chunk.company} FY{chunk.year}, "
            "so the ratio is undefined and cannot be verified",
        )
        return

    assert reported is not None and numerator is not None and denominator is not None
    recomputed = numerator / denominator * 100
    error = _relative_error(reported, recomputed)
    if error <= tolerance:
        builder.passed(check_code)
        return

    # Name the inputs the way the source file does. A reviewer reading
    # "Net Income / Share Holder Equity" can find those columns; the
    # internal field names are an implementation detail.
    numerator_label = FIELD_PROVENANCE.get(numerator_field, (numerator_field, None))[0].strip()
    denominator_label = FIELD_PROVENANCE.get(denominator_field, (denominator_field, None))[0].strip()

    builder.failed(
        AgentFinding(
            agent=AgentName.CORRECTNESS,
            check_code=check_code,
            company=chunk.company,
            year=chunk.year,
            severity=_grade(error),
            metric=metric,
            statement=(
                f"Reported {label} of {reported:,.4f}% does not equal "
                f"{numerator_label} / {denominator_label} recomputed from the same row "
                f"({numerator:,.1f} / {denominator:,.1f} = {recomputed:,.4f}%), "
                f"a difference of {reported - recomputed:,.4f} percentage points "
                f"({error * 100:,.1f}% relative error)."
            ),
            citations=[
                cite(metric, chunk.company, chunk.year, reported, chunk.source_row),
                cite(numerator_field, chunk.company, chunk.year, numerator, chunk.source_row),
                cite(denominator_field, chunk.company, chunk.year, denominator, chunk.source_row),
            ],
            expected=round(recomputed, 6),
            actual=round(reported, 6),
            difference=round(reported - recomputed, 6),
        )
    )


def run_correctness_agent(
    chunk: CorrectnessChunk,
    tolerance: float = DEFAULT_TOLERANCE,
) -> AgentReport:
    """Run every mathematical-correctness rule against one isolated chunk."""
    builder = ReportBuilder(AgentName.CORRECTNESS)

    _ratio_rule(
        builder,
        chunk,
        check_code="NET_PROFIT_MARGIN_MISMATCH",
        metric="net_profit_margin",
        label="Net Profit Margin",
        reported=chunk.reported_net_profit_margin,
        numerator=chunk.net_income,
        numerator_field="net_income",
        denominator=chunk.revenue,
        denominator_field="revenue",
        tolerance=tolerance,
    )

    _ratio_rule(
        builder,
        chunk,
        check_code="ROE_MISMATCH",
        metric="roe",
        label="ROE",
        reported=chunk.reported_roe,
        numerator=chunk.net_income,
        numerator_field="net_income",
        denominator=chunk.shareholder_equity,
        denominator_field="shareholder_equity",
        tolerance=tolerance,
    )

    # Rules that are real accounting checks but cannot run against a source
    # that doesn't carry their inputs. Declared explicitly so the report
    # states what was NOT verified — a silent omission here would let a
    # partially-checked statement read as a fully-checked one.
    for check_code, missing_field in (
        ("GROSS_PROFIT_IDENTITY", "cost of goods sold"),
        ("BALANCE_SHEET_IDENTITY", "total assets and total liabilities"),
        ("ROA_MISMATCH", "total assets"),
        ("DEBT_TO_EQUITY_MISMATCH", "total debt"),
        ("CURRENT_RATIO_MISMATCH", "current assets and current liabilities"),
    ):
        builder.skipped(
            check_code,
            f"source does not report {missing_field}, so this identity cannot be "
            "independently recomputed and is not treated as verified",
        )

    return builder.build()


def run_correctness_agent_batch(
    chunks: list[CorrectnessChunk],
    tolerance: float = DEFAULT_TOLERANCE,
) -> AgentReport:
    """Fold every year's chunk for one company into a single report."""
    return merge_reports(
        AgentName.CORRECTNESS,
        [run_correctness_agent(chunk, tolerance=tolerance) for chunk in chunks],
    )


__all__ = ["DEFAULT_TOLERANCE", "run_correctness_agent", "run_correctness_agent_batch"]

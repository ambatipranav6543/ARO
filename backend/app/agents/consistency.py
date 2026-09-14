"""Agent 2 — Internal Consistency (30% of the review weighting).

One job: **do the separately reported figures in a row agree with each
other?** Not "is this number computed right" (agent 1) and not "did it move
a lot" (agent 3) — this agent looks for pairs of figures that contradict
each other, where neither one is defined by the other.

Two kinds of rule live here:

- *Impossible* — a relation that cannot hold in valid accounting no matter
  the company or industry. Gross profit above revenue means COGS was
  negative. A positive ROE on a loss means one of the two figures is wrong.
  These are graded HIGH.
- *Implausible* — a relation that is very unusual but has legitimate
  exceptions (a large one-off gain can push net income above gross
  profit). These are graded LOW and worded as "worth a look", because a
  reviewer's time is the scarce resource and a false HIGH costs more than
  a missed LOW.

No LLM. Pure comparison, fixed thresholds, deterministic output.
"""

from __future__ import annotations

from app.agents.contracts import (
    AgentFinding,
    AgentName,
    AgentReport,
    ReportBuilder,
    Severity,
    cite,
    merge_reports,
)
from app.agents.dispatch import ConsistencyChunk

# Relative slack before two figures are called contradictory, for the rules
# that compare magnitudes. Matches the correctness agent's tolerance.
DEFAULT_TOLERANCE = 0.005


def _check_gross_profit_within_revenue(builder: ReportBuilder, chunk: ConsistencyChunk, tolerance: float) -> None:
    code = "GROSS_PROFIT_EXCEEDS_REVENUE"
    if chunk.gross_profit is None or chunk.revenue is None:
        builder.skipped(code, "source does not report both gross profit and revenue")
        return
    if chunk.revenue <= 0:
        builder.skipped(code, f"revenue is not positive ({chunk.revenue:,.1f}), comparison is not meaningful")
        return
    if chunk.gross_profit <= chunk.revenue * (1 + tolerance):
        builder.passed(code)
        return
    builder.failed(
        AgentFinding(
            agent=AgentName.CONSISTENCY,
            check_code=code,
            company=chunk.company,
            year=chunk.year,
            severity=Severity.HIGH,
            metric="gross_profit",
            statement=(
                f"Gross Profit of {chunk.gross_profit:,.1f} exceeds Revenue of "
                f"{chunk.revenue:,.1f} (by {chunk.gross_profit - chunk.revenue:,.1f}). "
                "Gross profit is revenue minus cost of goods sold, so this implies a "
                "negative cost of goods sold, which is not a valid accounting value."
            ),
            citations=[
                cite("gross_profit", chunk.company, chunk.year, chunk.gross_profit, chunk.source_row),
                cite("revenue", chunk.company, chunk.year, chunk.revenue, chunk.source_row),
            ],
            expected=round(chunk.revenue, 6),
            actual=round(chunk.gross_profit, 6),
            difference=round(chunk.gross_profit - chunk.revenue, 6),
        )
    )


def _check_sign_agreement(
    builder: ReportBuilder,
    chunk: ConsistencyChunk,
    *,
    code: str,
    ratio_field: str,
    ratio_label: str,
    ratio_value: float | None,
    denominator_field: str,
    denominator_label: str,
    denominator_value: float | None,
) -> None:
    """A profitability ratio must carry the same sign as net income when its
    denominator is positive. A profit ratio that reads positive on a loss is
    a contradiction between two reported figures, regardless of how either
    was calculated."""
    if chunk.net_income is None or ratio_value is None or denominator_value is None:
        builder.skipped(
            code,
            f"source does not report all of net income, {ratio_label} and {denominator_label}",
        )
        return
    if denominator_value <= 0:
        builder.skipped(
            code,
            f"{denominator_label} is not positive ({denominator_value:,.1f}), so the "
            "ratio's sign is legitimately inverted and cannot be checked this way",
        )
        return
    if (chunk.net_income < 0) == (ratio_value < 0):
        builder.passed(code)
        return

    income_word = "a net loss of" if chunk.net_income < 0 else "net income of"
    builder.failed(
        AgentFinding(
            agent=AgentName.CONSISTENCY,
            check_code=code,
            company=chunk.company,
            year=chunk.year,
            severity=Severity.HIGH,
            metric=ratio_field,
            statement=(
                f"{ratio_label} is reported as {ratio_value:,.4f}% while the company reported "
                f"{income_word} {abs(chunk.net_income):,.1f} on a positive {denominator_label} "
                f"of {denominator_value:,.1f}. A profitability ratio cannot have the opposite "
                "sign to net income when its denominator is positive, so one of these two "
                "reported figures is wrong."
            ),
            citations=[
                cite(ratio_field, chunk.company, chunk.year, ratio_value, chunk.source_row),
                cite("net_income", chunk.company, chunk.year, chunk.net_income, chunk.source_row),
                cite(denominator_field, chunk.company, chunk.year, denominator_value, chunk.source_row),
            ],
            actual=round(ratio_value, 6),
        )
    )


def _check_tangible_equity_return(builder: ReportBuilder, chunk: ConsistencyChunk) -> None:
    """Tangible equity excludes intangibles, so it is at most total equity.
    On a profit, dividing by the smaller base must give the larger return:
    RoTE >= ROE. Only checked on a profit, since the inequality legitimately
    flips on a loss."""
    code = "TANGIBLE_EQUITY_RETURN_BELOW_ROE"
    if chunk.return_on_tangible_equity is None or chunk.roe is None or chunk.net_income is None:
        builder.skipped(code, "source does not report all of ROE, return on tangible equity and net income")
        return
    if chunk.net_income <= 0:
        builder.skipped(
            code,
            "net income is not positive, so return on tangible equity is legitimately "
            "below ROE and the inequality does not apply",
        )
        return
    if chunk.return_on_tangible_equity >= chunk.roe:
        builder.passed(code)
        return
    builder.failed(
        AgentFinding(
            agent=AgentName.CONSISTENCY,
            check_code=code,
            company=chunk.company,
            year=chunk.year,
            severity=Severity.MEDIUM,
            metric="return_on_tangible_equity",
            statement=(
                f"Return on Tangible Equity of {chunk.return_on_tangible_equity:,.4f}% is below "
                f"ROE of {chunk.roe:,.4f}% on a profitable year (net income "
                f"{chunk.net_income:,.1f}). Tangible equity excludes intangible assets and so "
                "cannot exceed total equity, meaning the tangible-equity return should be the "
                f"higher of the two, a gap of {chunk.roe - chunk.return_on_tangible_equity:,.4f} "
                "percentage points in the wrong direction."
            ),
            citations=[
                cite(
                    "return_on_tangible_equity",
                    chunk.company,
                    chunk.year,
                    chunk.return_on_tangible_equity,
                    chunk.source_row,
                ),
                cite("roe", chunk.company, chunk.year, chunk.roe, chunk.source_row),
                cite("net_income", chunk.company, chunk.year, chunk.net_income, chunk.source_row),
            ],
            expected=round(chunk.roe, 6),
            actual=round(chunk.return_on_tangible_equity, 6),
            difference=round(chunk.return_on_tangible_equity - chunk.roe, 6),
        )
    )


def _check_non_negative(builder: ReportBuilder, chunk: ConsistencyChunk) -> None:
    """Fields that have no valid negative reading."""
    code = "NEGATIVE_VALUE_WHERE_IMPOSSIBLE"
    candidates = [
        ("revenue", "Revenue", chunk.revenue),
        ("market_cap_b_usd", "Market capitalisation", chunk.market_cap_b_usd),
        ("current_ratio", "Current Ratio", chunk.current_ratio),
        (
            "number_of_employees",
            "Number of employees",
            float(chunk.number_of_employees) if chunk.number_of_employees is not None else None,
        ),
    ]
    present = [(f, label, v) for f, label, v in candidates if v is not None]
    if not present:
        builder.skipped(code, "source reports none of revenue, market cap, current ratio or headcount")
        return

    negatives = [(f, label, v) for f, label, v in present if v < 0]
    if not negatives:
        builder.passed(code)
        return
    for field, label, value in negatives:
        builder.failed(
            AgentFinding(
                agent=AgentName.CONSISTENCY,
                check_code=code,
                company=chunk.company,
                year=chunk.year,
                severity=Severity.HIGH,
                metric=field,
                statement=(
                    f"{label} is reported as {value:,.4f}, a negative value. This field has no "
                    "valid negative reading, so the figure is either a data-entry error or a "
                    "sign-convention mismatch in the source."
                ),
                citations=[cite(field, chunk.company, chunk.year, value, chunk.source_row)],
                actual=round(value, 6),
            )
        )


def _check_earnings_within_gross_profit(builder: ReportBuilder, chunk: ConsistencyChunk) -> None:
    """Net income above gross profit is legitimate when a large one-off gain
    lands below the gross-profit line, so this is graded LOW and worded as a
    prompt to look rather than an assertion of error."""
    code = "NET_INCOME_EXCEEDS_GROSS_PROFIT"
    if chunk.net_income is None or chunk.gross_profit is None:
        builder.skipped(code, "source does not report both net income and gross profit")
        return
    if chunk.gross_profit <= 0:
        builder.skipped(code, f"gross profit is not positive ({chunk.gross_profit:,.1f})")
        return
    if chunk.net_income <= chunk.gross_profit:
        builder.passed(code)
        return
    builder.failed(
        AgentFinding(
            agent=AgentName.CONSISTENCY,
            check_code=code,
            company=chunk.company,
            year=chunk.year,
            severity=Severity.LOW,
            metric="net_income",
            statement=(
                f"Net Income of {chunk.net_income:,.1f} exceeds Gross Profit of "
                f"{chunk.gross_profit:,.1f} (by {chunk.net_income - chunk.gross_profit:,.1f}). "
                "This is possible when a large one-off gain falls below the gross-profit line, "
                "but it is unusual enough to confirm against the source."
            ),
            citations=[
                cite("net_income", chunk.company, chunk.year, chunk.net_income, chunk.source_row),
                cite("gross_profit", chunk.company, chunk.year, chunk.gross_profit, chunk.source_row),
            ],
            expected=round(chunk.gross_profit, 6),
            actual=round(chunk.net_income, 6),
            difference=round(chunk.net_income - chunk.gross_profit, 6),
        )
    )


def _check_ebitda_within_gross_profit(builder: ReportBuilder, chunk: ConsistencyChunk) -> None:
    """EBITDA is gross profit less operating expenses, so it normally sits
    below gross profit. Graded LOW: for financial and insurance companies
    'gross profit' is not a well-defined line, and the exception is real."""
    code = "EBITDA_EXCEEDS_GROSS_PROFIT"
    if chunk.ebitda is None or chunk.gross_profit is None:
        builder.skipped(code, "source does not report both EBITDA and gross profit")
        return
    if chunk.gross_profit <= 0:
        builder.skipped(code, f"gross profit is not positive ({chunk.gross_profit:,.1f})")
        return
    if chunk.ebitda <= chunk.gross_profit:
        builder.passed(code)
        return
    builder.failed(
        AgentFinding(
            agent=AgentName.CONSISTENCY,
            check_code=code,
            company=chunk.company,
            year=chunk.year,
            severity=Severity.LOW,
            metric="ebitda",
            statement=(
                f"EBITDA of {chunk.ebitda:,.1f} exceeds Gross Profit of {chunk.gross_profit:,.1f} "
                f"(by {chunk.ebitda - chunk.gross_profit:,.1f}). EBITDA is normally gross profit "
                "less operating expenses, so this suggests the two lines were derived on "
                "different bases, common for financial and insurance companies. Worth confirming."
            ),
            citations=[
                cite("ebitda", chunk.company, chunk.year, chunk.ebitda, chunk.source_row),
                cite("gross_profit", chunk.company, chunk.year, chunk.gross_profit, chunk.source_row),
            ],
            expected=round(chunk.gross_profit, 6),
            actual=round(chunk.ebitda, 6),
            difference=round(chunk.ebitda - chunk.gross_profit, 6),
        )
    )


def run_consistency_agent(
    chunk: ConsistencyChunk,
    tolerance: float = DEFAULT_TOLERANCE,
) -> AgentReport:
    """Run every internal-consistency rule against one isolated chunk."""
    builder = ReportBuilder(AgentName.CONSISTENCY)

    _check_gross_profit_within_revenue(builder, chunk, tolerance)
    _check_sign_agreement(
        builder,
        chunk,
        code="ROE_SIGN_CONTRADICTS_NET_INCOME",
        ratio_field="roe",
        ratio_label="ROE",
        ratio_value=chunk.roe,
        denominator_field="shareholder_equity",
        denominator_label="shareholder equity",
        denominator_value=chunk.shareholder_equity,
    )
    _check_sign_agreement(
        builder,
        chunk,
        code="NET_MARGIN_SIGN_CONTRADICTS_NET_INCOME",
        ratio_field="net_profit_margin",
        ratio_label="Net Profit Margin",
        ratio_value=chunk.net_profit_margin,
        denominator_field="revenue",
        denominator_label="revenue",
        denominator_value=chunk.revenue,
    )
    _check_tangible_equity_return(builder, chunk)
    _check_non_negative(builder, chunk)
    _check_earnings_within_gross_profit(builder, chunk)
    _check_ebitda_within_gross_profit(builder, chunk)

    return builder.build()


def run_consistency_agent_batch(
    chunks: list[ConsistencyChunk],
    tolerance: float = DEFAULT_TOLERANCE,
) -> AgentReport:
    """Fold every year's chunk for one company into a single report."""
    return merge_reports(
        AgentName.CONSISTENCY,
        [run_consistency_agent(chunk, tolerance=tolerance) for chunk in chunks],
    )


__all__ = ["DEFAULT_TOLERANCE", "run_consistency_agent", "run_consistency_agent_batch"]

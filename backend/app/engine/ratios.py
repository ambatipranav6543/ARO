"""Financial ratio calculations (Day 2).

Every function returns ``None`` instead of raising when an input line item
is missing or a denominator is zero — ratios are best-effort by nature, and
a missing ratio should surface as "not available" rather than crash the
request or silently show a wrong 0.0.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.financial import FinancialStatement


def _safe_div(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return round(numerator / denominator, 6)


class RatioResult(BaseModel):
    # Profitability
    gross_margin: float | None = None
    operating_margin: float | None = None
    net_margin: float | None = None
    return_on_assets: float | None = None
    return_on_equity: float | None = None

    # Liquidity
    current_ratio: float | None = None
    quick_ratio: float | None = None
    cash_ratio: float | None = None

    # Leverage / solvency
    debt_to_equity: float | None = None
    debt_to_assets: float | None = None
    equity_ratio: float | None = None

    # Efficiency
    asset_turnover: float | None = None
    receivables_turnover: float | None = None


def compute_ratios(statement: FinancialStatement) -> RatioResult:
    inc = statement.income_statement
    bs = statement.balance_sheet

    gross_profit = inc.gross_profit if inc.gross_profit is not None else inc.derived_gross_profit()
    operating_income = (
        inc.operating_income if inc.operating_income is not None else inc.derived_operating_income()
    )

    current_assets = bs.current_assets
    quick_assets = None
    if current_assets is not None:
        quick_assets = current_assets - (bs.inventory or 0)

    reported = statement.reported_ratios

    def _computed_or_reported(computed: float | None, reported_value: float | None) -> float | None:
        # Prefer a value computed from actual line items; fall back to a
        # ratio the source reported directly only when we lack the line
        # items to compute it ourselves. Both are real numbers from the
        # source — never a fabricated one.
        return computed if computed is not None else reported_value

    return RatioResult(
        gross_margin=_safe_div(gross_profit, inc.revenue),
        operating_margin=_safe_div(operating_income, inc.revenue),
        net_margin=_computed_or_reported(
            _safe_div(inc.net_income, inc.revenue), reported.net_margin if reported else None
        ),
        return_on_assets=_computed_or_reported(
            _safe_div(inc.net_income, bs.total_assets), reported.return_on_assets if reported else None
        ),
        return_on_equity=_computed_or_reported(
            _safe_div(inc.net_income, bs.shareholder_equity), reported.return_on_equity if reported else None
        ),
        current_ratio=_computed_or_reported(
            _safe_div(current_assets, bs.current_liabilities), reported.current_ratio if reported else None
        ),
        quick_ratio=_safe_div(quick_assets, bs.current_liabilities),
        cash_ratio=_safe_div(bs.cash_and_equivalents, bs.current_liabilities),
        debt_to_equity=_computed_or_reported(
            _safe_div(bs.total_debt, bs.shareholder_equity), reported.debt_to_equity if reported else None
        ),
        debt_to_assets=_safe_div(bs.total_debt, bs.total_assets),
        equity_ratio=_safe_div(bs.shareholder_equity, bs.total_assets),
        asset_turnover=_safe_div(inc.revenue, bs.total_assets),
        receivables_turnover=_safe_div(inc.revenue, bs.accounts_receivable),
    )

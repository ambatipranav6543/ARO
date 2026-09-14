"""Anomaly / risk-flag detection (Day 2).

Combines validation issues, ratio thresholds and (when available) YoY
variance into a single ranked list of risk flags. This is deliberately
rule-based and deterministic — the agent (Day 4) explains *why* a flag
fired using retrieved evidence, it does not decide *whether* it fires.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.engine.ratios import RatioResult, compute_ratios
from app.engine.validation import Severity, ValidationResult, validate_statement
from app.engine.variance import YoYAnalysis
from app.schemas.financial import FinancialStatement


class RiskFlag(BaseModel):
    code: str
    message: str
    severity: Severity
    category: str  # "accounting" | "liquidity" | "leverage" | "profitability" | "variance"


# Thresholds are intentionally simple/explicit so they're easy to defend in
# a demo Q&A ("why did this fire?").
LOW_CURRENT_RATIO = 1.0
HIGH_DEBT_TO_EQUITY = 2.0
NEGATIVE_MARGIN_FLAG = 0.0


def _ratio_flags(ratios: RatioResult) -> list[RiskFlag]:
    flags: list[RiskFlag] = []

    if ratios.current_ratio is not None and ratios.current_ratio < LOW_CURRENT_RATIO:
        flags.append(
            RiskFlag(
                code="LIQUIDITY_RISK_CURRENT_RATIO",
                message=(
                    f"Current ratio is {ratios.current_ratio:.2f} (below {LOW_CURRENT_RATIO:.1f}), "
                    "indicating current liabilities exceed current assets"
                ),
                severity=Severity.MEDIUM,
                category="liquidity",
            )
        )

    if ratios.debt_to_equity is not None and ratios.debt_to_equity > HIGH_DEBT_TO_EQUITY:
        flags.append(
            RiskFlag(
                code="HIGH_LEVERAGE_DEBT_TO_EQUITY",
                message=(
                    f"Debt-to-equity is {ratios.debt_to_equity:.2f} (above {HIGH_DEBT_TO_EQUITY:.1f}), "
                    "indicating high reliance on debt financing"
                ),
                severity=Severity.MEDIUM,
                category="leverage",
            )
        )

    if ratios.net_margin is not None and ratios.net_margin < NEGATIVE_MARGIN_FLAG:
        flags.append(
            RiskFlag(
                code="NEGATIVE_NET_MARGIN",
                message=f"Net margin is negative ({ratios.net_margin:.2%}) — the company reported a net loss",
                severity=Severity.MEDIUM,
                category="profitability",
            )
        )

    if ratios.equity_ratio is not None and ratios.equity_ratio < 0:
        flags.append(
            RiskFlag(
                code="NEGATIVE_EQUITY_RATIO",
                message="Equity ratio is negative, consistent with negative shareholder equity",
                severity=Severity.HIGH,
                category="leverage",
            )
        )

    return flags


def _validation_flags(validation: ValidationResult) -> list[RiskFlag]:
    return [
        RiskFlag(
            code=issue.code,
            message=issue.message,
            severity=issue.severity,
            category="accounting",
        )
        for issue in validation.issues
        if issue.severity in (Severity.MEDIUM, Severity.HIGH)
    ]


def _variance_flags(yoy: YoYAnalysis | None) -> list[RiskFlag]:
    if yoy is None:
        return []
    flags: list[RiskFlag] = []
    for change in yoy.significant_changes:
        direction = "increased" if (change.pct_change or 0) > 0 else "decreased"
        flags.append(
            RiskFlag(
                code="SIGNIFICANT_YOY_CHANGE",
                message=(
                    f"{change.label} {direction} {abs(change.pct_change or 0):.1%} YoY "
                    f"({change.prior_value:,.2f} -> {change.current_value:,.2f})"
                ),
                severity=Severity.LOW,
                category="variance",
            )
        )
    return flags


def detect_anomalies(
    statement: FinancialStatement,
    yoy: YoYAnalysis | None = None,
) -> list[RiskFlag]:
    validation = validate_statement(statement)
    ratios = compute_ratios(statement)

    flags = [
        *_validation_flags(validation),
        *_ratio_flags(ratios),
        *_variance_flags(yoy),
    ]

    severity_order = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2, Severity.INFO: 3}
    flags.sort(key=lambda f: severity_order[f.severity])
    return flags

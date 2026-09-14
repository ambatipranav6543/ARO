"""Deterministic accounting validation (Day 2).

Pure arithmetic — no LLM involved. Every check returns a structured
``ValidationIssue`` so the API/agent can explain *why* something failed,
not just that it did.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel

from app.schemas.financial import FinancialStatement

# Relative tolerance for "should be exactly equal" accounting identities.
# 0.5% absorbs rounding in source data without hiding real breaks.
DEFAULT_TOLERANCE = 0.005


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ValidationIssue(BaseModel):
    code: str
    message: str
    severity: Severity
    expected: float | None = None
    actual: float | None = None
    difference: float | None = None


class ValidationResult(BaseModel):
    is_valid: bool
    issues: list[ValidationIssue] = []

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity in (Severity.MEDIUM, Severity.HIGH))


def _within_tolerance(expected: float, actual: float, tolerance: float = DEFAULT_TOLERANCE) -> bool:
    denom = max(abs(expected), 1.0)
    return abs(expected - actual) / denom <= tolerance


def _pct_diff(expected: float, actual: float) -> float:
    denom = max(abs(expected), 1.0)
    return round((actual - expected) / denom, 6)


def validate_balance_sheet(statement: FinancialStatement, tolerance: float = DEFAULT_TOLERANCE) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    bs = statement.balance_sheet

    # Identity and total-vs-subtotal checks only make sense when the raw
    # totals are actually present in the source — skipped (not defaulted
    # or derived) otherwise, since deriving them here would just validate
    # our own arithmetic instead of the reported data.
    expected_assets = bs.derived_total_from_equation()
    if (
        bs.total_assets is not None
        and expected_assets is not None
        and not _within_tolerance(expected_assets, bs.total_assets, tolerance)
    ):
        issues.append(
            ValidationIssue(
                code="BALANCE_SHEET_DOES_NOT_BALANCE",
                message=(
                    "Assets != Liabilities + Equity: "
                    f"reported assets {bs.total_assets:,.2f} vs "
                    f"liabilities + equity {expected_assets:,.2f}"
                ),
                severity=Severity.HIGH,
                expected=expected_assets,
                actual=bs.total_assets,
                difference=round(bs.total_assets - expected_assets, 6),
            )
        )

    if (
        bs.current_assets is not None
        and bs.total_assets is not None
        and bs.current_assets > bs.total_assets * (1 + tolerance)
    ):
        issues.append(
            ValidationIssue(
                code="CURRENT_ASSETS_EXCEED_TOTAL_ASSETS",
                message=(
                    f"Current assets {bs.current_assets:,.2f} exceed total assets {bs.total_assets:,.2f}"
                ),
                severity=Severity.HIGH,
                expected=bs.total_assets,
                actual=bs.current_assets,
            )
        )

    if (
        bs.current_liabilities is not None
        and bs.total_liabilities is not None
        and bs.current_liabilities > bs.total_liabilities * (1 + tolerance)
    ):
        issues.append(
            ValidationIssue(
                code="CURRENT_LIABILITIES_EXCEED_TOTAL_LIABILITIES",
                message=(
                    f"Current liabilities {bs.current_liabilities:,.2f} exceed "
                    f"total liabilities {bs.total_liabilities:,.2f}"
                ),
                severity=Severity.HIGH,
                expected=bs.total_liabilities,
                actual=bs.current_liabilities,
            )
        )

    if bs.shareholder_equity < 0:
        issues.append(
            ValidationIssue(
                code="NEGATIVE_SHAREHOLDER_EQUITY",
                message=f"Shareholder equity is negative ({bs.shareholder_equity:,.2f})",
                severity=Severity.MEDIUM,
                actual=bs.shareholder_equity,
            )
        )

    for field_name, value in (
        ("total_assets", bs.total_assets),
        ("total_liabilities", bs.total_liabilities),
        ("cash_and_equivalents", bs.cash_and_equivalents),
        ("inventory", bs.inventory),
        ("accounts_receivable", bs.accounts_receivable),
    ):
        if value is not None and value < 0:
            issues.append(
                ValidationIssue(
                    code="NEGATIVE_VALUE_WHERE_UNEXPECTED",
                    message=f"Balance sheet field '{field_name}' is negative ({value:,.2f})",
                    severity=Severity.MEDIUM,
                    actual=value,
                )
            )

    return issues


def validate_income_statement(statement: FinancialStatement, tolerance: float = DEFAULT_TOLERANCE) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    inc = statement.income_statement

    if inc.cogs is not None:
        expected_gp = inc.derived_gross_profit()
        if inc.gross_profit is not None and not _within_tolerance(expected_gp, inc.gross_profit, tolerance):
            issues.append(
                ValidationIssue(
                    code="GROSS_PROFIT_MISMATCH",
                    message=(
                        f"Reported gross profit {inc.gross_profit:,.2f} does not equal "
                        f"revenue - COGS ({expected_gp:,.2f})"
                    ),
                    severity=Severity.MEDIUM,
                    expected=expected_gp,
                    actual=inc.gross_profit,
                    difference=round(inc.gross_profit - expected_gp, 6),
                )
            )

    if inc.operating_expenses is not None:
        expected_oi = inc.derived_operating_income()
        if expected_oi is not None and inc.operating_income is not None:
            if not _within_tolerance(expected_oi, inc.operating_income, tolerance):
                issues.append(
                    ValidationIssue(
                        code="OPERATING_INCOME_MISMATCH",
                        message=(
                            f"Reported operating income {inc.operating_income:,.2f} does not equal "
                            f"gross profit - operating expenses ({expected_oi:,.2f})"
                        ),
                        severity=Severity.MEDIUM,
                        expected=expected_oi,
                        actual=inc.operating_income,
                        difference=round(inc.operating_income - expected_oi, 6),
                    )
                )

    if inc.revenue < 0:
        issues.append(
            ValidationIssue(
                code="NEGATIVE_REVENUE",
                message=f"Revenue is negative ({inc.revenue:,.2f}), which is not a valid accounting value",
                severity=Severity.HIGH,
                actual=inc.revenue,
            )
        )

    if inc.cogs is not None and inc.cogs > inc.revenue * (1 + tolerance) and inc.revenue > 0:
        issues.append(
            ValidationIssue(
                code="COGS_EXCEEDS_REVENUE",
                message=f"COGS {inc.cogs:,.2f} exceeds revenue {inc.revenue:,.2f}",
                severity=Severity.LOW,
                expected=inc.revenue,
                actual=inc.cogs,
            )
        )

    return issues


def validate_cash_flow(statement: FinancialStatement, tolerance: float = DEFAULT_TOLERANCE) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    cf = statement.cash_flow
    if cf is None:
        return issues

    if cf.capex is not None and cf.capex < 0:
        issues.append(
            ValidationIssue(
                code="CAPEX_SIGN_CONVENTION",
                message=(
                    "Capex is reported as negative; this schema expects capex as a positive "
                    "spend amount (free cash flow = operating cash flow - capex)"
                ),
                severity=Severity.INFO,
                actual=cf.capex,
            )
        )

    return issues


def validate_statement(statement: FinancialStatement, tolerance: float = DEFAULT_TOLERANCE) -> ValidationResult:
    issues = [
        *validate_balance_sheet(statement, tolerance),
        *validate_income_statement(statement, tolerance),
        *validate_cash_flow(statement, tolerance),
    ]
    is_valid = all(i.severity not in (Severity.MEDIUM, Severity.HIGH) for i in issues)
    return ValidationResult(is_valid=is_valid, issues=issues)

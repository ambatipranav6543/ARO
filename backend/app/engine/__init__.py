"""Deterministic financial engine (Day 2).

Everything in this package is pure Python arithmetic — no LLM calls. The
agent (Day 4) is expected to call ``run_full_analysis`` as a *tool* and
reason over its structured output; it must never recompute or override
these numbers itself.

Public entry point: ``run_full_analysis``.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.engine.anomaly import RiskFlag, detect_anomalies
from app.engine.ratios import RatioResult, compute_ratios
from app.engine.validation import ValidationResult, validate_statement
from app.engine.variance import YoYAnalysis, compute_yoy_analysis
from app.schemas.financial import FinancialStatement

__all__ = [
    "AnalysisResult",
    "run_full_analysis",
    "validate_statement",
    "compute_ratios",
    "compute_yoy_analysis",
    "detect_anomalies",
    "ValidationResult",
    "RatioResult",
    "YoYAnalysis",
    "RiskFlag",
]


class AnalysisResult(BaseModel):
    company: str
    fiscal_year: int
    validation: ValidationResult
    ratios: RatioResult
    yoy: YoYAnalysis | None = None
    risk_flags: list[RiskFlag]


def run_full_analysis(
    statement: FinancialStatement,
    prior_statement: FinancialStatement | None = None,
) -> AnalysisResult:
    """Run every deterministic check available for one statement.

    If ``prior_statement`` is supplied (same company, prior fiscal year),
    YoY variance and significant-change detection are included too.
    """
    validation = validate_statement(statement)
    ratios = compute_ratios(statement)

    yoy = None
    if prior_statement is not None:
        yoy = compute_yoy_analysis(statement, prior_statement)

    risk_flags = detect_anomalies(statement, yoy)

    return AnalysisResult(
        company=statement.company,
        fiscal_year=statement.fiscal_year,
        validation=validation,
        ratios=ratios,
        yoy=yoy,
        risk_flags=risk_flags,
    )

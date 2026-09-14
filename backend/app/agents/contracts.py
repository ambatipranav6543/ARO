"""Shared contracts for the four-agent review architecture.

The central rule this module enforces, in the type system rather than by
convention: **a finding cannot exist without the source figures it was
derived from.** `AgentFinding.citations` has `min_length=1`, so a
specialist agent is structurally incapable of emitting "revenue is high" —
it can only emit a claim with the exact figures, their source column, and
their row in the source file attached.

Severity lives here (not in `app.agent.schemas`) so that the dependency
runs one way: `app.agent.schemas` imports from `app.agents.contracts`,
never the reverse.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, computed_field, field_validator


class Severity(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AgentName(str, Enum):
    """The three rule-based specialists. The orchestrator is not listed
    here — it produces no findings of its own, it only routes, grounds and
    narrates the findings these three produce."""

    CORRECTNESS = "mathematical_correctness"
    CONSISTENCY = "internal_consistency"
    VARIANCE = "variance"


# The mentor-assigned review weighting. Used to combine the three agents'
# pass rates into one review score; see `weighted_score`.
AGENT_WEIGHTS: dict[AgentName, float] = {
    AgentName.CORRECTNESS: 0.50,
    AgentName.CONSISTENCY: 0.30,
    AgentName.VARIANCE: 0.20,
}


class Unit(str, Enum):
    USD_MILLIONS = "USD millions"
    USD_BILLIONS = "USD billions"
    USD_PER_SHARE = "USD per share"
    PERCENT = "%"
    RATIO = "x"
    COUNT = "count"


# Maps a `FinancialRecord` field to the column header it was parsed from in
# the source CSV, plus its unit. This is what makes a citation traceable to
# an actual cell in the uploaded file rather than to an internal variable
# name. Kept in sync with `app.documents.csv_loader._COLUMN_MAP`.
FIELD_PROVENANCE: dict[str, tuple[str, Unit]] = {
    "year": ("Year", Unit.COUNT),
    "company": ("Company ", Unit.COUNT),
    "market_cap_b_usd": ("Market Cap(in B USD)", Unit.USD_BILLIONS),
    "revenue": ("Revenue", Unit.USD_MILLIONS),
    "gross_profit": ("Gross Profit", Unit.USD_MILLIONS),
    "net_income": ("Net Income", Unit.USD_MILLIONS),
    "earning_per_share": ("Earning Per Share", Unit.USD_PER_SHARE),
    "ebitda": ("EBITDA", Unit.USD_MILLIONS),
    "shareholder_equity": ("Share Holder Equity", Unit.USD_MILLIONS),
    "cash_flow_operating": ("Cash Flow from Operating", Unit.USD_MILLIONS),
    "cash_flow_investing": ("Cash Flow from Investing", Unit.USD_MILLIONS),
    "cash_flow_financing": ("Cash Flow from Financial Activities", Unit.USD_MILLIONS),
    "current_ratio": ("Current Ratio", Unit.RATIO),
    "debt_equity_ratio": ("Debt/Equity Ratio", Unit.RATIO),
    "roe": ("ROE", Unit.PERCENT),
    "roa": ("ROA", Unit.PERCENT),
    "roi": ("ROI", Unit.PERCENT),
    "net_profit_margin": ("Net Profit Margin", Unit.PERCENT),
    "free_cash_flow_per_share": ("Free Cash Flow per Share", Unit.USD_PER_SHARE),
    "return_on_tangible_equity": ("Return on Tangible Equity", Unit.PERCENT),
    "number_of_employees": ("Number of Employees", Unit.COUNT),
    "inflation_rate_us": ("Inflation Rate(in US)", Unit.PERCENT),
}


def _format_value(value: float, unit: Unit) -> str:
    if unit is Unit.USD_MILLIONS:
        return f"${value:,.1f}M"
    if unit is Unit.USD_BILLIONS:
        return f"${value:,.2f}B"
    if unit is Unit.USD_PER_SHARE:
        return f"${value:,.2f}"
    if unit is Unit.PERCENT:
        return f"{value:,.4f}%"
    if unit is Unit.RATIO:
        return f"{value:,.4f}x"
    return f"{value:,.0f}"


class SourceCitation(BaseModel):
    """One exact figure, as it appears in the uploaded source file.

    `value` is copied verbatim from the parsed row — never rounded,
    rescaled or recomputed on the way in. A recomputed number is a
    *derivation* and belongs in `AgentFinding.expected`, not here.
    """

    field: str = Field(description="FinancialRecord field name, e.g. 'revenue'")
    column: str = Field(description="Source CSV column header this value was parsed from")
    company: str
    year: int
    value: float
    unit: Unit
    source_row: int | None = Field(
        default=None, description="1-based line number in the source file (header is line 1)"
    )

    @computed_field
    @property
    def rendered(self) -> str:
        """Human-readable citation, e.g.
        `Revenue (AAPL FY2022, row 2) = $394,328.0M`. Serialized with the
        model so a client can display the trace without reformatting it."""
        where = f"{self.company} FY{self.year}"
        if self.source_row is not None:
            where += f", row {self.source_row}"
        return f"{self.column} ({where}) = {_format_value(self.value, self.unit)}"

    def render(self) -> str:
        return self.rendered


def cite(
    field: str,
    company: str,
    year: int,
    value: float,
    source_row: int | None = None,
) -> SourceCitation:
    """Build a citation for a known `FinancialRecord` field, filling the
    source column header and unit from `FIELD_PROVENANCE`."""
    column, unit = FIELD_PROVENANCE.get(field, (field, Unit.COUNT))
    return SourceCitation(
        field=field,
        column=column,
        company=company,
        year=year,
        value=value,
        unit=unit,
        source_row=source_row,
    )


class AgentFinding(BaseModel):
    """A single deterministic finding from one rule-based specialist.

    No LLM writes any part of this model. The orchestrator may attach a
    narration alongside it, but never edits these fields.
    """

    agent: AgentName
    check_code: str = Field(description="Stable rule identifier, e.g. 'ROE_MISMATCH'")
    company: str
    year: int
    severity: Severity
    statement: str = Field(
        description="The deterministic claim, with the actual figures inline — "
        "never a vague characterization like 'revenue is high'."
    )
    citations: list[SourceCitation] = Field(
        min_length=1,
        description="Source figures this finding is derived from. A finding "
        "with no citation cannot be constructed.",
    )

    expected: float | None = Field(
        default=None, description="Recomputed/derived value, where the rule computes one"
    )
    actual: float | None = Field(default=None, description="Value as reported by the source")
    difference: float | None = None
    pct_change: float | None = Field(
        default=None, description="Set by the variance agent; None for point-in-time rules"
    )
    prior_year: int | None = None
    prior_value: float | None = None
    metric: str = Field(description="Primary field this finding concerns")

    @field_validator("statement")
    @classmethod
    def _statement_must_be_specific(cls, v: str) -> str:
        if not any(ch.isdigit() for ch in v):
            raise ValueError(
                "A finding statement must contain the actual figures it is about; "
                f"got a claim with no numbers in it: {v!r}"
            )
        return v

    @property
    def query_text(self) -> str:
        """Natural-language question the orchestrator hands to RAG to look
        for supporting evidence for this finding."""
        if self.pct_change is not None and self.prior_year is not None:
            direction = "increase" if self.pct_change >= 0 else "decrease"
            return (
                f"Why did {self.company}'s {self.metric.replace('_', ' ')} {direction} "
                f"{abs(self.pct_change):.1f}% from {self.prior_year} to {self.year}?"
            )
        # Kept short and topical on purpose: this string is embedded and
        # matched against the snippet corpus, and pasting the full finding
        # text in here retrieves worse than a plain subject line does.
        return f"{self.company} {self.metric.replace('_', ' ')} reported in {self.year}"

    def render_citations(self) -> str:
        return "; ".join(c.render() for c in self.citations)


class AgentReport(BaseModel):
    """What one specialist returns for one company.

    `checks_run` / `checks_skipped` are reported honestly: a rule whose
    inputs are absent from the source is *skipped*, never silently passed.
    A skipped rule is excluded from the score rather than counted as a win.
    """

    agent: AgentName
    weight: float
    checks_run: int = 0
    checks_passed: int = 0
    checks_skipped: int = 0
    skipped_reasons: dict[str, str] = Field(default_factory=dict)
    findings: list[AgentFinding] = Field(default_factory=list)

    @computed_field
    @property
    def score(self) -> float | None:
        """Pass rate over rules that actually ran. `None` when the source
        data supported no rule in this agent's remit at all."""
        if self.checks_run == 0:
            return None
        return round(self.checks_passed / self.checks_run, 4)


class ReportBuilder:
    """Accumulates one agent's rule outcomes so all three count identically.

    A rule ends in exactly one of three states: it passed, it produced a
    finding, or it was skipped because the source lacked its inputs. The
    distinction between "failed" and "skipped" is the one that keeps the
    score honest, so it is recorded explicitly rather than inferred from
    whether a finding came back.
    """

    def __init__(self, agent: AgentName) -> None:
        self._agent = agent
        self._run = 0
        self._passed = 0
        self._skipped = 0
        self._skip_reasons: dict[str, str] = {}
        self._findings: list[AgentFinding] = []

    def passed(self, check_code: str) -> None:
        self._run += 1
        self._passed += 1

    def skipped(self, check_code: str, reason: str) -> None:
        self._skipped += 1
        self._skip_reasons[check_code] = reason

    def failed(self, finding: AgentFinding) -> None:
        self._run += 1
        self._findings.append(finding)

    def build(self) -> AgentReport:
        return AgentReport(
            agent=self._agent,
            weight=AGENT_WEIGHTS[self._agent],
            checks_run=self._run,
            checks_passed=self._passed,
            checks_skipped=self._skipped,
            skipped_reasons=self._skip_reasons,
            findings=self._findings,
        )


def merge_reports(agent: AgentName, reports: list[AgentReport]) -> AgentReport:
    """Fold many per-year reports from one agent into a single report.

    Counts accumulate exactly. `skipped_reasons` keeps one representative
    reason per check code rather than one per year, since the reason a rule
    can't run is a property of the source's columns, not of a given row.
    """
    skipped_reasons: dict[str, str] = {}
    for report in reports:
        skipped_reasons.update(report.skipped_reasons)
    return AgentReport(
        agent=agent,
        weight=AGENT_WEIGHTS[agent],
        checks_run=sum(r.checks_run for r in reports),
        checks_passed=sum(r.checks_passed for r in reports),
        checks_skipped=sum(r.checks_skipped for r in reports),
        skipped_reasons=skipped_reasons,
        findings=[f for r in reports for f in r.findings],
    )


def weighted_score(reports: list[AgentReport]) -> float | None:
    """Combine agent pass rates using the mentor's 50/30/20 weighting.

    Agents that could run no checks are dropped and the remaining weights
    are renormalized, so a dataset that can't support (say) balance-sheet
    correctness doesn't silently score 0 for it.
    """
    scored = [(r.weight, r.score) for r in reports if r.score is not None]
    if not scored:
        return None
    total_weight = sum(w for w, _ in scored)
    if total_weight == 0:
        return None
    return round(sum(w * s for w, s in scored) / total_weight, 4)


__all__ = [
    "AGENT_WEIGHTS",
    "AgentFinding",
    "AgentName",
    "AgentReport",
    "FIELD_PROVENANCE",
    "ReportBuilder",
    "Severity",
    "SourceCitation",
    "Unit",
    "cite",
    "merge_reports",
    "weighted_score",
]

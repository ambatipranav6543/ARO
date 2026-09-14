"""Repository: the only place that translates between the Pydantic
``FinancialStatement`` schema and the SQLAlchemy storage row.

Keeping this translation in one place means the engine, API routes and
(later) the agent's tools never touch the ORM directly.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import FinancialStatementRecord
from app.schemas.financial import FinancialStatement


class DuplicateStatementError(Exception):
    """Raised when a (company, fiscal_year, period) triple already exists."""


class StatementNotFoundError(Exception):
    pass


def _record_to_model(record: FinancialStatementRecord) -> FinancialStatement:
    data = dict(record.payload)
    data["id"] = record.id
    return FinancialStatement.model_validate(data)


def save_statement(db: Session, statement: FinancialStatement) -> FinancialStatement:
    company, fiscal_year, period = statement.key()[0], statement.fiscal_year, statement.period.value

    existing = db.execute(
        select(FinancialStatementRecord).where(
            FinancialStatementRecord.company == statement.company,
            FinancialStatementRecord.fiscal_year == fiscal_year,
            FinancialStatementRecord.period == period,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise DuplicateStatementError(
            f"A statement for {statement.company} FY{fiscal_year} {period} already exists (id={existing.id})"
        )

    payload = statement.model_dump(mode="json", exclude={"id"})
    record = FinancialStatementRecord(
        company=statement.company,
        ticker=statement.ticker,
        fiscal_year=fiscal_year,
        period=period,
        payload=payload,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _record_to_model(record)


def get_statement(db: Session, statement_id: int) -> FinancialStatement:
    record = db.get(FinancialStatementRecord, statement_id)
    if record is None:
        raise StatementNotFoundError(f"No statement with id={statement_id}")
    return _record_to_model(record)


def list_statements(
    db: Session,
    company: str | None = None,
    fiscal_year: int | None = None,
) -> list[FinancialStatement]:
    stmt = select(FinancialStatementRecord)
    if company:
        stmt = stmt.where(FinancialStatementRecord.company.ilike(f"%{company}%"))
    if fiscal_year:
        stmt = stmt.where(FinancialStatementRecord.fiscal_year == fiscal_year)
    stmt = stmt.order_by(FinancialStatementRecord.company, FinancialStatementRecord.fiscal_year)
    records = db.execute(stmt).scalars().all()
    return [_record_to_model(r) for r in records]


def get_prior_year_statement(db: Session, statement: FinancialStatement) -> FinancialStatement | None:
    """Find the same company/period one fiscal year earlier, for YoY analysis."""
    record = db.execute(
        select(FinancialStatementRecord).where(
            FinancialStatementRecord.company == statement.company,
            FinancialStatementRecord.fiscal_year == statement.fiscal_year - 1,
            FinancialStatementRecord.period == statement.period.value,
        )
    ).scalar_one_or_none()
    return _record_to_model(record) if record else None


def delete_statement(db: Session, statement_id: int) -> None:
    record = db.get(FinancialStatementRecord, statement_id)
    if record is None:
        raise StatementNotFoundError(f"No statement with id={statement_id}")
    db.delete(record)
    db.commit()

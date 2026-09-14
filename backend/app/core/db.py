"""SQLite persistence for the MVP (Day 1).

We store each ``FinancialStatement`` as a JSON payload alongside indexed
columns (company, ticker, fiscal_year, period) so lookups and YoY pairing
are fast without needing a full relational schema this early. The engine
and agent always work with the Pydantic model, never the ORM row directly.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import JSON, Integer, String, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class FinancialStatementRecord(Base):
    __tablename__ = "financial_statements"
    __table_args__ = (
        UniqueConstraint("company", "fiscal_year", "period", name="uq_company_year_period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    ticker: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    fiscal_year: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    period: Mapped[str] = mapped_column(String(8), index=True, nullable=False, default="FY")
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

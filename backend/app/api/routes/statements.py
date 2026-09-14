"""Read/list/delete endpoints for stored financial statements (Day 1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.repository import StatementNotFoundError, delete_statement, get_statement, list_statements
from app.schemas.financial import FinancialStatement

router = APIRouter(prefix="/statements", tags=["statements"])


@router.get("", response_model=list[FinancialStatement])
def get_statements(
    company: str | None = Query(default=None, description="Case-insensitive partial match"),
    fiscal_year: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[FinancialStatement]:
    return list_statements(db, company=company, fiscal_year=fiscal_year)


@router.get("/{statement_id}", response_model=FinancialStatement)
def get_statement_by_id(statement_id: int, db: Session = Depends(get_db)) -> FinancialStatement:
    try:
        return get_statement(db, statement_id)
    except StatementNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{statement_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_statement(statement_id: int, db: Session = Depends(get_db)) -> None:
    try:
        delete_statement(db, statement_id)
    except StatementNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

"""Ingestion endpoints (Day 1).

Accepts financial statements as JSON, CSV or Excel and stores them via the
repository layer. Every successful ingest also runs deterministic
validation (Day 2 engine) immediately so bad data is caught at the door
rather than surfacing later during analysis.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.repository import DuplicateStatementError, save_statement
from app.documents.loader import (
    TemplateValidationError,
    load_statements_from_csv,
    load_statements_from_excel,
)
from app.engine.validation import ValidationResult, validate_statement
from app.schemas.financial import FinancialStatement, FinancialStatementCreate

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestResult(BaseModel):
    statement: FinancialStatement
    validation: ValidationResult


class BulkIngestResult(BaseModel):
    ingested: list[IngestResult]
    skipped: list[str]  # human-readable reasons (e.g. duplicates)


@router.post("/statement", response_model=IngestResult, status_code=status.HTTP_201_CREATED)
def ingest_statement(payload: FinancialStatementCreate, db: Session = Depends(get_db)) -> IngestResult:
    """Ingest a single statement as JSON. Runs validation and stores it."""
    statement = FinancialStatement.model_validate(payload.model_dump(exclude={"id"}))
    validation = validate_statement(statement)

    try:
        saved = save_statement(db, statement)
    except DuplicateStatementError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return IngestResult(statement=saved, validation=validation)


def _bulk_store(statements: list[FinancialStatement], db: Session) -> BulkIngestResult:
    ingested: list[IngestResult] = []
    skipped: list[str] = []
    for statement in statements:
        validation = validate_statement(statement)
        try:
            saved = save_statement(db, statement)
        except DuplicateStatementError as exc:
            skipped.append(str(exc))
            continue
        ingested.append(IngestResult(statement=saved, validation=validation))
    return BulkIngestResult(ingested=ingested, skipped=skipped)


@router.post("/csv", response_model=BulkIngestResult, status_code=status.HTTP_201_CREATED)
async def ingest_csv(file: UploadFile = File(...), db: Session = Depends(get_db)) -> BulkIngestResult:
    """Bulk ingest from a CSV file matching CSV_TEMPLATE_COLUMNS."""
    content = await file.read()
    try:
        statements = load_statements_from_csv(content, file_name=file.filename)
    except TemplateValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return _bulk_store(statements, db)


@router.post("/excel", response_model=BulkIngestResult, status_code=status.HTTP_201_CREATED)
async def ingest_excel(file: UploadFile = File(...), db: Session = Depends(get_db)) -> BulkIngestResult:
    """Bulk ingest from an Excel (.xlsx) file matching CSV_TEMPLATE_COLUMNS."""
    content = await file.read()
    try:
        statements = load_statements_from_excel(content, file_name=file.filename)
    except TemplateValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return _bulk_store(statements, db)

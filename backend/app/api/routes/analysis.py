"""Analysis endpoints: the deterministic engine (validate/analyze stored
statements) plus the RAG-backed flat pipeline (variance flags on the
Kaggle dataset, paired with retrieved evidence).

These are also the endpoints the Day 4 agent's tools should call — the
agent should never reimplement validation/ratio/variance math itself, it
should call these (or the underlying ``app.engine`` / ``app.rag``
functions directly in process) and reason over the structured result.

Static-path routes are registered before the dynamic ``/{statement_id}``
route so e.g. ``/analysis/flags`` can never be shadowed by it.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.repository import StatementNotFoundError, get_statement, get_prior_year_statement, list_statements
from app.documents.csv_loader import load_records
from app.engine import AnalysisResult, run_full_analysis
from app.engine.validation import ValidationResult, validate_statement
from app.engine.variance import detect_variances
from app.rag.retrieval import retrieve_evidence
from app.rag.snippets import build_snippets
from app.rag.store import build_index
from app.schemas.financial import FinancialStatement

router = APIRouter(prefix="/analysis", tags=["analysis"])

_DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "financial_statements.csv"


@router.post("/validate", response_model=ValidationResult)
def validate_payload(statement: FinancialStatement) -> ValidationResult:
    """Validate a statement without storing it — useful as a pre-ingest check."""
    return validate_statement(statement)


@router.post("/index")
def index_evidence() -> dict[str, int]:
    """Build (or rebuild) the RAG vector index from the source dataset."""
    settings = get_settings()
    records = load_records(_DATA_PATH)
    snippets = build_snippets(records)
    count = build_index(snippets, settings.vector_store_path)
    return {"records": len(records), "snippets_indexed": count}


@router.get("/flags")
def get_flags(threshold_pct: float = 20.0) -> list[dict]:
    """Deterministic YoY variance flags (flat engine stage, no RAG/LLM)."""
    records = load_records(_DATA_PATH)
    flags = detect_variances(records, threshold_pct=threshold_pct)
    return [
        {
            "company": f.company,
            "metric": f.metric,
            "year": f.year,
            "prior_year": f.prior_year,
            "value": f.value,
            "prior_value": f.prior_value,
            "pct_change": round(f.pct_change, 2),
            "query": f.query_text,
        }
        for f in flags
    ]


@router.get("/findings")
def get_findings(threshold_pct: float = 20.0, k: int = 3) -> list[dict]:
    """Each engine flag paired with its retrieved evidence (or none)."""
    settings = get_settings()
    records = load_records(_DATA_PATH)
    flags = detect_variances(records, threshold_pct=threshold_pct)

    findings = []
    for f in flags:
        evidence = retrieve_evidence(
            f.query_text,
            settings.vector_store_path,
            k=k,
            company=f.company,
        )
        grounded = len(evidence) > 0
        findings.append(
            {
                "fact": {
                    "company": f.company,
                    "metric": f.metric,
                    "year": f.year,
                    "prior_year": f.prior_year,
                    "pct_change": round(f.pct_change, 2),
                },
                "query": f.query_text,
                "evidence": [
                    {
                        "text": e.text,
                        "similarity": round(e.similarity, 3),
                        "metadata": e.metadata,
                    }
                    for e in evidence
                ],
                "grounded": grounded,
                "explanation": None,
                "explanation_pending": True,
            }
        )
    return findings


@router.get("/evidence")
def query_evidence(query: str, company: str | None = None, k: int = 3) -> list[dict]:
    """Ad-hoc retrieval, for testing the RAG layer directly."""
    settings = get_settings()
    if not Path(settings.vector_store_path).exists():
        raise HTTPException(
            status_code=409,
            detail="Vector index not built yet. Call POST /api/analysis/index first.",
        )
    evidence = retrieve_evidence(query, settings.vector_store_path, k=k, company=company)
    return [
        {"text": e.text, "similarity": round(e.similarity, 3), "metadata": e.metadata}
        for e in evidence
    ]


@router.get("/compare/by-year", response_model=AnalysisResult)
def compare_by_year(
    company: str = Query(..., description="Exact company name as stored"),
    current_year: int = Query(...),
    prior_year: int = Query(...),
    db: Session = Depends(get_db),
) -> AnalysisResult:
    """Explicit YoY comparison between two chosen fiscal years for a stored FinancialStatement."""
    if current_year <= prior_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="current_year must be greater than prior_year",
        )

    current_matches = [s for s in list_statements(db, company=company, fiscal_year=current_year) if s.company.lower() == company.lower()]
    prior_matches = [s for s in list_statements(db, company=company, fiscal_year=prior_year) if s.company.lower() == company.lower()]

    if not current_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No statement found for '{company}' FY{current_year}",
        )
    if not prior_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No statement found for '{company}' FY{prior_year}",
        )

    return run_full_analysis(current_matches[0], prior_statement=prior_matches[0])


@router.get("/{statement_id}", response_model=AnalysisResult)
def analyze_statement(statement_id: int, db: Session = Depends(get_db)) -> AnalysisResult:
    """Full analysis for one stored FinancialStatement.

    Automatically includes YoY variance if a statement for the same
    company/period one fiscal year earlier is also stored.
    """
    try:
        statement = get_statement(db, statement_id)
    except StatementNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    prior = get_prior_year_statement(db, statement)
    return run_full_analysis(statement, prior_statement=prior)

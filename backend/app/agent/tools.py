"""Data and retrieval access for the orchestrator.

Thin wrappers that adapt calling conventions (baking in the configured
dataset and vector-store paths); no financial math and no vector-store
logic is reimplemented here.

Variance detection used to live behind a wrapper in this module. It now
belongs to `app.agents.variance_agent`, which owns that job outright.
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings
from app.documents.csv_loader import load_records
from app.rag.retrieval import RetrievedEvidence, retrieve_evidence
from app.schemas.financial import FinancialRecord

# Same dataset location the existing /api/analysis routes already use
# (backend/data/financial_statements.csv) — the real Kaggle dataset, not a
# placeholder. backend/app/agent/tools.py -> parents[2] == backend/.
DEFAULT_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "financial_statements.csv"


class CompanyNotFoundError(ValueError):
    pass


def load_company_records(
    company: str,
    records_path: str | Path | None = None,
) -> list[FinancialRecord]:
    """Load the dataset and filter to one company (case-insensitive)."""
    path = records_path or DEFAULT_DATA_PATH
    records = load_records(path)
    matches = [r for r in records if r.company.strip().lower() == company.strip().lower()]
    if not matches:
        raise CompanyNotFoundError(f"No records found for company '{company}' in {path}")
    return matches


def retrieve_financial_evidence(
    query: str,
    company: str | None = None,
    k: int = 3,
    persist_path: str | Path | None = None,
    min_similarity: float | None = None,
) -> list[RetrievedEvidence]:
    """Agent tool #2: thin wrapper over `app.rag.retrieval.retrieve_evidence`.

    Bakes in the configured vector store path so callers only need to
    supply the query/company/k. Does not touch the embedding or Chroma
    logic — that stays entirely inside `app.rag`.
    """
    settings = get_settings()
    path = persist_path or settings.vector_store_path
    kwargs = {}
    if min_similarity is not None:
        kwargs["min_similarity"] = min_similarity
    return retrieve_evidence(query, path, k=k, company=company, **kwargs)

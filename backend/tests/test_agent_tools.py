"""Tests for app.agent.tools: data loading and the RAG wrapper.

`load_company_records` is exercised against the REAL dataset
(backend/data/financial_statements.csv) — the same Kaggle data the rest of
the app uses — so this also proves the agents are wired to the actual
project dataset, not a placeholder.
"""

from __future__ import annotations

import pytest

import app.agent.tools as tools
from app.agent.tools import CompanyNotFoundError, load_company_records, retrieve_financial_evidence
from app.rag.retrieval import RetrievedEvidence


def test_default_data_path_points_at_real_dataset():
    assert tools.DEFAULT_DATA_PATH.name == "financial_statements.csv"
    assert tools.DEFAULT_DATA_PATH.exists()


def test_load_company_records_reads_the_real_dataset():
    records = load_company_records("AAPL")
    assert len(records) > 1
    assert all(r.company == "AAPL" for r in records)
    # Source line numbers survive ingestion so findings can cite them.
    assert all(r.source_row is not None for r in records)


def test_load_company_records_is_case_insensitive():
    assert len(load_company_records("aapl")) == len(load_company_records("AAPL"))


def test_load_company_records_unknown_company_raises():
    with pytest.raises(CompanyNotFoundError):
        load_company_records("NOT_A_REAL_TICKER_XYZ")


def test_retrieve_financial_evidence_delegates_to_rag_layer(monkeypatch):
    captured = {}

    def _fake_retrieve_evidence(query, persist_path, k=3, company=None, min_similarity=0.3):
        captured.update(
            query=query, persist_path=persist_path, k=k, company=company, min_similarity=min_similarity
        )
        return [RetrievedEvidence(text="stub", metadata={}, similarity=0.9)]

    monkeypatch.setattr(tools, "retrieve_evidence", _fake_retrieve_evidence)

    results = retrieve_financial_evidence("why did revenue change?", company="AAPL", k=2)

    assert captured["query"] == "why did revenue change?"
    assert captured["company"] == "AAPL"
    assert captured["k"] == 2
    assert len(results) == 1

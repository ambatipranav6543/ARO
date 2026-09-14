"""RAG stage: snippet synthesis, indexing, and grounded retrieval."""

import pytest

from app.rag.retrieval import retrieve_evidence
from app.rag.snippets import build_snippets, comparison_snippet, record_snippet
from app.rag.store import build_index
from app.schemas.financial import FinancialRecord


@pytest.fixture
def sample_records():
    return [
        FinancialRecord(year=2020, company="ACME", revenue=100.0, net_income=10.0),
        FinancialRecord(year=2021, company="ACME", revenue=250.0, net_income=12.0),
        FinancialRecord(year=2020, company="ZETA", revenue=500.0, net_income=50.0),
        FinancialRecord(year=2021, company="ZETA", revenue=520.0, net_income=52.0),
    ]


def test_record_snippet_contains_traceable_values():
    rec = FinancialRecord(year=2022, company="ACME", revenue=394328.0)
    snippet = record_snippet(rec)
    assert "ACME" in snippet.text
    assert "2022" in snippet.text
    assert "394,328" in snippet.text
    assert snippet.metadata == {"company": "ACME", "year": 2022, "kind": "summary"}


def test_comparison_snippet_states_direction_and_magnitude():
    prev = FinancialRecord(year=2020, company="ACME", revenue=100.0)
    curr = FinancialRecord(year=2021, company="ACME", revenue=200.0)
    snippet = comparison_snippet(prev, curr)
    assert "increased" in snippet.text
    assert "100.0%" in snippet.text


def test_build_snippets_includes_summaries_and_comparisons(sample_records):
    snippets = build_snippets(sample_records)
    kinds = {s.metadata["kind"] for s in snippets}
    assert kinds == {"summary", "comparison"}
    # 4 summaries + 2 comparisons (one per company, one consecutive pair each)
    assert len(snippets) == 6


def test_retrieval_finds_relevant_company_evidence(tmp_path, sample_records):
    snippets = build_snippets(sample_records)
    build_index(snippets, tmp_path)

    results = retrieve_evidence(
        "Why did ACME's revenue increase from 2020 to 2021?",
        tmp_path,
        k=3,
        company="ACME",
    )

    assert len(results) > 0
    assert all(r.metadata["company"] == "ACME" for r in results)
    assert any("revenue" in r.text.lower() for r in results)


def test_retrieval_respects_similarity_floor(tmp_path, sample_records):
    snippets = build_snippets(sample_records)
    build_index(snippets, tmp_path)

    # An unrelated, nonsense query should not force a match above a high floor.
    results = retrieve_evidence(
        "banana spaceship weather forecast",
        tmp_path,
        k=3,
        min_similarity=0.9,
    )
    assert results == []

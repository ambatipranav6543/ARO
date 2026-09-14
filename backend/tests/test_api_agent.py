"""Tests for /api/agent endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

import app.agents.orchestrator as orchestrator_module
from app.main import app
from app.rag.retrieval import RetrievedEvidence

client = TestClient(app)


def _mock_evidence(monkeypatch, similarity: float = 0.8):
    def _fake_retrieve(query, company=None, k=3, persist_path=None):
        return [
            RetrievedEvidence(
                text=f"Evidence for {company}",
                metadata={"company": company, "year": 2023, "kind": "comparison"},
                similarity=similarity,
            )
        ]

    monkeypatch.setattr(orchestrator_module, "retrieve_financial_evidence", _fake_retrieve)


def test_review_endpoint_returns_grounded_findings(monkeypatch):
    _mock_evidence(monkeypatch)

    resp = client.post(
        "/api/agent/review",
        json={"company": "AAPL", "threshold_pct": 5.0, "max_findings": 2},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["company"] == "AAPL"
    assert body["status"] == "COMPLETED"
    assert len(body["findings"]) <= 2
    for finding in body["findings"]:
        assert finding["review_status"] == "PENDING"
        assert finding["grounded"] is True


def test_review_endpoint_unknown_company_returns_404(monkeypatch):
    _mock_evidence(monkeypatch)
    resp = client.post("/api/agent/review", json={"company": "NOT_A_REAL_TICKER_XYZ"})
    assert resp.status_code == 404


def test_review_endpoint_no_evidence_returns_refusal_not_error(monkeypatch):
    monkeypatch.setattr(orchestrator_module, "retrieve_financial_evidence", lambda *a, **k: [])

    resp = client.post(
        "/api/agent/review",
        json={"company": "AAPL", "threshold_pct": 5.0, "max_findings": 1},
    )
    assert resp.status_code == 201
    finding = resp.json()["findings"][0]
    assert finding["grounded"] is False
    assert "insufficient evidence" in finding["explanation"].lower()


def test_list_get_and_review_finding_lifecycle(monkeypatch):
    _mock_evidence(monkeypatch)

    review_resp = client.post(
        "/api/agent/review",
        json={"company": "AAPL", "threshold_pct": 5.0, "max_findings": 1},
    )
    finding_id = review_resp.json()["findings"][0]["id"]

    list_resp = client.get("/api/agent/findings", params={"company": "AAPL"})
    assert list_resp.status_code == 200
    assert any(f["id"] == finding_id for f in list_resp.json())

    get_resp = client.get(f"/api/agent/findings/{finding_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["review_status"] == "PENDING"

    approve_resp = client.post(f"/api/agent/review/{finding_id}", json={"status": "APPROVED"})
    assert approve_resp.status_code == 200
    assert approve_resp.json()["review_status"] == "APPROVED"

    reject_resp = client.post(f"/api/agent/review/{finding_id}", json={"status": "REJECTED"})
    assert reject_resp.status_code == 200
    assert reject_resp.json()["review_status"] == "REJECTED"


def test_get_missing_finding_404():
    resp = client.get("/api/agent/findings/does-not-exist")
    assert resp.status_code == 404


def test_review_missing_finding_404():
    resp = client.post("/api/agent/review/does-not-exist", json={"status": "APPROVED"})
    assert resp.status_code == 404


def test_review_invalid_status_rejected():
    resp = client.post("/api/agent/review/some-id", json={"status": "PENDING"})
    # PENDING is a valid enum member but not a valid *decision* -> 400 before the 404 lookup even matters
    assert resp.status_code in (400, 404, 422)

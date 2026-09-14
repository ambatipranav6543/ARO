"""Tests for /api/analysis endpoints — both the stored-statement engine
(validate/analyze/compare) and the RAG-backed flat pipeline (findings)."""

from tests.test_api_ingest import SAMPLE_PAYLOAD


def test_analyze_single_statement_no_prior_year(client):
    create_resp = client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)
    statement_id = create_resp.json()["statement"]["id"]

    resp = client.get(f"/api/analysis/{statement_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["yoy"] is None
    assert body["validation"]["is_valid"] is True
    assert "gross_margin" in body["ratios"]


def test_analyze_includes_yoy_when_prior_year_exists(client):
    prior_payload = {**SAMPLE_PAYLOAD, "fiscal_year": 2022}
    prior_payload["income_statement"] = {**SAMPLE_PAYLOAD["income_statement"], "revenue": 700.0, "net_income": 70.0}
    client.post("/api/ingest/statement", json=prior_payload)

    current_resp = client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)
    statement_id = current_resp.json()["statement"]["id"]

    resp = client.get(f"/api/analysis/{statement_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["yoy"] is not None
    assert body["yoy"]["prior_fiscal_year"] == 2022
    assert body["yoy"]["current_fiscal_year"] == 2023
    revenue_line = next(li for li in body["yoy"]["line_items"] if li["field"] == "income_statement.revenue")
    assert revenue_line["is_significant"] is True  # 700 -> 1000 is ~43% growth


def test_compare_by_year_endpoint(client):
    prior_payload = {**SAMPLE_PAYLOAD, "fiscal_year": 2022}
    client.post("/api/ingest/statement", json=prior_payload)
    client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)

    resp = client.get(
        "/api/analysis/compare/by-year",
        params={"company": "Acme Corp", "current_year": 2023, "prior_year": 2022},
    )
    assert resp.status_code == 200
    assert resp.json()["yoy"] is not None


def test_validate_endpoint_does_not_persist(client):
    resp = client.post("/api/analysis/validate", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 200
    assert resp.json()["is_valid"] is True

    list_resp = client.get("/api/statements")
    assert list_resp.json() == []


def test_findings_carries_a_stable_explanation_placeholder(client):
    client.post("/api/analysis/index")
    resp = client.get("/api/analysis/findings?threshold_pct=50")
    assert resp.status_code == 200

    findings = resp.json()
    assert len(findings) > 0

    for finding in findings:
        assert "explanation" in finding
        assert "explanation_pending" in finding
        # Stub, not yet written by the agent — must be null + flagged, not
        # a fabricated string standing in as if it were real output.
        assert finding["explanation"] is None
        assert finding["explanation_pending"] is True
        assert "fact" in finding
        assert "evidence" in finding
        assert "grounded" in finding

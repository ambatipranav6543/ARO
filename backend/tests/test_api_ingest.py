"""Tests for /api/ingest endpoints."""

SAMPLE_PAYLOAD = {
    "company": "Acme Corp",
    "fiscal_year": 2023,
    "period": "FY",
    "income_statement": {
        "revenue": 1000.0,
        "cogs": 600.0,
        "operating_expenses": 200.0,
        "net_income": 100.0,
    },
    "balance_sheet": {
        "total_assets": 1000.0,
        "current_assets": 400.0,
        "current_liabilities": 200.0,
        "total_liabilities": 600.0,
        "shareholder_equity": 400.0,
    },
}


def test_ingest_statement_success(client):
    resp = client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["statement"]["id"] is not None
    assert body["validation"]["is_valid"] is True


def test_ingest_duplicate_rejected(client):
    client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)
    resp = client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 409


def test_ingest_flags_unbalanced_statement_but_still_stores(client):
    bad_payload = {**SAMPLE_PAYLOAD, "fiscal_year": 2024}
    bad_payload["balance_sheet"] = {**SAMPLE_PAYLOAD["balance_sheet"], "shareholder_equity": 1.0}
    resp = client.post("/api/ingest/statement", json=bad_payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["validation"]["is_valid"] is False
    codes = [i["code"] for i in body["validation"]["issues"]]
    assert "BALANCE_SHEET_DOES_NOT_BALANCE" in codes


def test_ingest_csv(client):
    csv_content = (
        "company,fiscal_year,revenue,net_income,total_assets,total_liabilities,shareholder_equity\n"
        "Beta Inc,2023,500,50,1000,600,400\n"
        "Beta Inc,2022,450,40,900,540,360\n"
    )
    files = {"file": ("statements.csv", csv_content, "text/csv")}
    resp = client.post("/api/ingest/csv", files=files)
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["ingested"]) == 2
    assert body["skipped"] == []


def test_ingest_csv_missing_required_column(client):
    csv_content = "company,fiscal_year,revenue\nBeta Inc,2023,500\n"
    files = {"file": ("bad.csv", csv_content, "text/csv")}
    resp = client.post("/api/ingest/csv", files=files)
    assert resp.status_code == 422

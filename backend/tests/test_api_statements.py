"""Tests for /api/statements endpoints."""

from tests.test_api_ingest import SAMPLE_PAYLOAD


def test_list_and_get_and_delete_statement(client):
    create_resp = client.post("/api/ingest/statement", json=SAMPLE_PAYLOAD)
    statement_id = create_resp.json()["statement"]["id"]

    list_resp = client.get("/api/statements", params={"company": "Acme"})
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    get_resp = client.get(f"/api/statements/{statement_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["company"] == "Acme Corp"

    delete_resp = client.delete(f"/api/statements/{statement_id}")
    assert delete_resp.status_code == 204

    get_after_delete = client.get(f"/api/statements/{statement_id}")
    assert get_after_delete.status_code == 404


def test_get_missing_statement_404(client):
    resp = client.get("/api/statements/9999")
    assert resp.status_code == 404

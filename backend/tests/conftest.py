"""Shared fixtures: every test gets a fresh isolated SQLite DB via FastAPI's
dependency override, so tests never touch the real backend/fsra.db file and
don't leak state between tests.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.db import Base, get_db
from app.main import app


@pytest.fixture(autouse=True)
def no_ambient_llm(monkeypatch):
    """Run every test with no LLM provider configured.

    A developer's `.env` may point at a hosted provider (Groq, say). Without
    this, any test that reaches `get_llm_client()` would make a real, billed
    network call and its result would depend on whoever's machine it ran on.
    Tests that want a model inject a stub explicitly.
    """
    monkeypatch.setenv("LLM_PROVIDER", "none")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

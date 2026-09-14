"""Tests for app.agent.llm: provider selection and graceful failure.

No real network/Ollama server is used — httpx calls are monkeypatched.
"""

from __future__ import annotations

import pytest

from app.agent.llm import LLMUnavailableError, OllamaClient, get_llm_client
from app.core.config import Settings


def test_get_llm_client_none_when_provider_unset():
    settings = Settings(llm_provider=None, llm_model=None)
    assert get_llm_client(settings) is None


def test_get_llm_client_none_for_explicit_disabled():
    settings = Settings(llm_provider="disabled")
    assert get_llm_client(settings) is None


def test_get_llm_client_none_for_unknown_provider():
    settings = Settings(llm_provider="some-unsupported-vendor")
    assert get_llm_client(settings) is None


def test_get_llm_client_builds_ollama_client():
    settings = Settings(llm_provider="ollama", llm_model="llama3.1", ollama_base_url="http://localhost:11434")
    client = get_llm_client(settings)
    assert isinstance(client, OllamaClient)
    assert client.model == "llama3.1"
    assert client.base_url == "http://localhost:11434"


def test_ollama_client_raises_llm_unavailable_on_connection_error(monkeypatch):
    client = OllamaClient(base_url="http://localhost:1", model="llama3.1", timeout=0.01)

    def _boom(*args, **kwargs):
        raise ConnectionError("no server here")

    import httpx

    monkeypatch.setattr(httpx, "post", _boom)

    with pytest.raises(LLMUnavailableError):
        client.generate("system", "user")


def test_ollama_client_parses_successful_response(monkeypatch):
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.1")

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"response": "hello world"}

    def _fake_post(*args, **kwargs):
        return _FakeResponse()

    import httpx

    monkeypatch.setattr(httpx, "post", _fake_post)

    result = client.generate("system", "user")
    assert result == "hello world"


def test_ollama_client_raises_on_empty_response(monkeypatch):
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.1")

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"response": "   "}

    import httpx

    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResponse())

    with pytest.raises(LLMUnavailableError):
        client.generate("system", "user")

"""Pluggable LLM client (Day 4).

The Agent's reasoning is provider-agnostic: `LLMClient` is a one-method
protocol, so swapping providers later never touches `reviewer.py` or
`interpret.py`. Configured entirely via environment variables /
`app.core.config.Settings` — no hard-coded keys.

Free/local-first default: Ollama. If no provider is configured, or the
configured provider is unreachable, callers get `None` / a raised
`LLMUnavailableError` and are expected to fall back to a deterministic,
evidence-only explanation (see `app.agent.interpret`) rather than crash.
"""

from __future__ import annotations

from typing import Protocol

from app.core.config import Settings, get_settings

DEFAULT_OLLAMA_MODEL = "llama3.1"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_TIMEOUT_SECONDS = 20.0


class LLMUnavailableError(Exception):
    """Raised when a configured LLM provider cannot be reached or errors."""


class LLMClient(Protocol):
    def generate(self, system: str, user: str) -> str:
        """Return the model's text response, or raise LLMUnavailableError."""
        ...


class OllamaClient:
    """Thin wrapper around Ollama's local HTTP API (`/api/generate`).

    No SDK dependency — a small `httpx` call is enough, and it means the
    provider works entirely offline/free, which matters for a hackathon.
    """

    def __init__(self, base_url: str, model: str, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def generate(self, system: str, user: str) -> str:
        try:
            import httpx
        except ImportError as exc:  # pragma: no cover - dependency always declared
            raise LLMUnavailableError("httpx is not installed") from exc

        try:
            response = httpx.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "system": system,
                    "prompt": user,
                    "stream": False,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:  # noqa: BLE001 - any network/parse failure -> unavailable
            raise LLMUnavailableError(f"Ollama request failed: {exc}") from exc

        text = (data.get("response") or "").strip()
        if not text:
            raise LLMUnavailableError("Ollama returned an empty response")
        return text


class GroqClient:
    """Groq's OpenAI-compatible chat-completions endpoint.

    Hosted rather than local, so unlike Ollama it needs an API key — read
    from settings/env, never hard-coded. Same one-method contract as every
    other provider, so nothing downstream knows which one is in use.

    Temperature is pinned low: this model's only job is to narrate a
    finding whose figures are already fixed, and creative rewording of an
    audit note is a defect, not a feature.
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str = DEFAULT_GROQ_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def generate(self, system: str, user: str) -> str:
        try:
            import httpx
        except ImportError as exc:  # pragma: no cover - dependency always declared
            raise LLMUnavailableError("httpx is not installed") from exc

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 400,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:  # noqa: BLE001 - any network/parse failure -> unavailable
            raise LLMUnavailableError(f"Groq request failed: {exc}") from exc

        try:
            text = (data["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMUnavailableError(f"Unexpected Groq response shape: {data}") from exc

        if not text:
            raise LLMUnavailableError("Groq returned an empty response")
        return text


def get_llm_client(settings: Settings | None = None) -> LLMClient | None:
    """Build the configured LLM client, or `None` if none is configured.

    `None` is a valid, expected outcome — the Agent must work (in a
    reduced, evidence-only mode) with no LLM configured at all.
    """
    settings = settings or get_settings()
    provider = (settings.llm_provider or "").strip().lower()

    if provider in ("", "none", "disabled"):
        return None

    if provider == "ollama":
        model = settings.llm_model or DEFAULT_OLLAMA_MODEL
        return OllamaClient(base_url=settings.ollama_base_url, model=model)

    if provider == "groq":
        # No key means no provider, not a crash: the agent runs in its
        # evidence-only mode exactly as it does with nothing configured.
        if not settings.groq_api_key:
            return None
        return GroqClient(
            api_key=settings.groq_api_key,
            model=settings.llm_model or DEFAULT_GROQ_MODEL,
            base_url=settings.groq_base_url,
        )

    # Unknown/unsupported provider: don't crash the backend, just run
    # without LLM-generated interpretation for this request.
    return None

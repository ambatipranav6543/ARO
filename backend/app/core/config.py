"""Application settings loaded from environment / .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Financial Statement Review Agent"
    debug: bool = False

    # Comma-separated list of allowed origins for the web dashboard (dev).
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Storage / persistence (MVP: SQLite).
    database_url: str = "sqlite:///./fsra.db"

    # RAG / vector store (added on Day 3).
    vector_store_path: str = "./data/vector_store"

    # LLM provider config (added on Day 4; values supplied by the hackathon).
    llm_provider: str | None = None
    llm_model: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # Groq (hosted, OpenAI-compatible). The key is read from the
    # environment or a gitignored .env — never committed.
    groq_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""FastAPI application entrypoint for the Financial Statement Review Agent.

Orchestrates document processing, deterministic financial analysis, RAG
retrieval, the review agent and report generation. Feature layers are
wired in as they are implemented; for now this exposes a health check
and serves as the skeleton for the API surface.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import agent, analysis, health, ingest, statements
from app.core.config import get_settings
from app.core.db import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Financial Statement Review Agent",
        description=(
            "AI-powered financial statement review: deterministic validation, "
            "YoY variance analysis, RAG evidence retrieval and grounded review "
            "observations for human approval."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(ingest.router, prefix="/api")
    app.include_router(statements.router, prefix="/api")
    app.include_router(analysis.router, prefix="/api")
    app.include_router(agent.router, prefix="/api")

    return app


app = create_app()

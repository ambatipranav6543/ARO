"""Embedding + vector store for evidence snippets.

Uses Chroma's persistent client with its bundled default embedding
function (a small ONNX MiniLM model, downloaded once) so the RAG layer has
no heavyweight ML framework dependency (no torch) — important for a fast,
reliable setup during the hackathon.
"""

from __future__ import annotations

from pathlib import Path

import chromadb

from app.rag.snippets import EvidenceSnippet

COLLECTION_NAME = "financial_evidence"


def get_client(persist_path: str | Path) -> chromadb.ClientAPI:
    return chromadb.PersistentClient(path=str(persist_path))


def get_collection(client: chromadb.ClientAPI):
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def build_index(snippets: list[EvidenceSnippet], persist_path: str | Path) -> int:
    """(Re)build the vector index from scratch with the given snippets.
    Returns the number of snippets indexed."""
    client = get_client(persist_path)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass  # no existing collection to clear
    collection = get_collection(client)

    if not snippets:
        return 0

    collection.add(
        ids=[s.id for s in snippets],
        documents=[s.text for s in snippets],
        metadatas=[s.metadata for s in snippets],
    )
    return len(snippets)

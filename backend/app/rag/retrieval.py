"""Retrieval: the interface the agent stage calls.

`retrieve_evidence` returns the top-k most relevant snippets for a query,
each carrying its source metadata (company/year/kind) so every claim is
traceable. Results below `min_similarity` are dropped — if nothing clears
the bar, an empty list is returned so the caller can say "insufficient
evidence" instead of forcing a weak match into an answer.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.rag.store import get_client, get_collection

DEFAULT_MIN_SIMILARITY = 0.3


@dataclass(frozen=True)
class RetrievedEvidence:
    text: str
    metadata: dict[str, Any]
    similarity: float


def retrieve_evidence(
    query: str,
    persist_path: str | Path,
    k: int = 3,
    company: str | None = None,
    min_similarity: float = DEFAULT_MIN_SIMILARITY,
) -> list[RetrievedEvidence]:
    client = get_client(persist_path)
    collection = get_collection(client)

    where = {"company": company} if company else None
    result = collection.query(
        query_texts=[query],
        n_results=k,
        where=where,
    )

    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]

    evidence = []
    for text, metadata, distance in zip(documents, metadatas, distances):
        # Cosine space in Chroma: distance = 1 - cosine_similarity.
        similarity = 1 - distance
        if similarity >= min_similarity:
            evidence.append(
                RetrievedEvidence(text=text, metadata=metadata, similarity=similarity)
            )
    return evidence

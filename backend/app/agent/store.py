"""Finding storage for the human-in-the-loop review workflow.

This repo does not currently have a persistence layer (no `app/core/db.py`
or repository module), so this is a small, self-contained in-memory store
— deliberately isolated behind `get_finding_store()` so it can be swapped
for a real database later without touching `reviewer.py` or the API
routes. Thread-safe for FastAPI's default threaded execution.
"""

from __future__ import annotations

import threading

from app.agent.schemas import Finding, ReviewStatus


class FindingNotFoundError(Exception):
    pass


class InMemoryFindingStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._findings: dict[str, Finding] = {}

    def save(self, finding: Finding) -> Finding:
        with self._lock:
            self._findings[finding.id] = finding
        return finding

    def get(self, finding_id: str) -> Finding:
        with self._lock:
            finding = self._findings.get(finding_id)
        if finding is None:
            raise FindingNotFoundError(f"No finding with id={finding_id}")
        return finding

    def list(
        self,
        company: str | None = None,
        year: int | None = None,
        status: ReviewStatus | None = None,
    ) -> list[Finding]:
        with self._lock:
            values = list(self._findings.values())
        if company:
            values = [f for f in values if f.company.lower() == company.lower()]
        if year is not None:
            values = [f for f in values if f.year == year]
        if status is not None:
            values = [f for f in values if f.review_status == status]
        return sorted(values, key=lambda f: f.created_at, reverse=True)

    def update_status(self, finding_id: str, status: ReviewStatus) -> Finding:
        with self._lock:
            finding = self._findings.get(finding_id)
            if finding is None:
                raise FindingNotFoundError(f"No finding with id={finding_id}")
            updated = finding.model_copy(update={"review_status": status})
            self._findings[finding_id] = updated
        return updated

    def clear(self) -> None:
        """Test helper — not used by production code paths."""
        with self._lock:
            self._findings.clear()


_store = InMemoryFindingStore()


def get_finding_store() -> InMemoryFindingStore:
    return _store

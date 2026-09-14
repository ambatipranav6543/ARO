"""Seed the sample dataset (backend/data/sample_statements.csv) into the DB.

Usage:
    cd backend
    .venv/bin/python scripts/seed_sample_data.py

Safe to re-run: rows that already exist (same company/fiscal_year/period)
are skipped rather than erroring out.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import SessionLocal, init_db  # noqa: E402
from app.core.repository import DuplicateStatementError, save_statement  # noqa: E402
from app.documents.loader import load_statements_from_csv  # noqa: E402

SAMPLE_CSV = Path(__file__).resolve().parents[1] / "data" / "sample_statements.csv"


def main() -> None:
    init_db()
    statements = load_statements_from_csv(SAMPLE_CSV.read_bytes(), file_name=SAMPLE_CSV.name)

    db = SessionLocal()
    saved, skipped = 0, 0
    try:
        for statement in statements:
            try:
                save_statement(db, statement)
                saved += 1
            except DuplicateStatementError:
                skipped += 1
    finally:
        db.close()

    print(f"Seeded {saved} statement(s), skipped {skipped} already-existing.")


if __name__ == "__main__":
    main()

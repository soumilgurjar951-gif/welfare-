"""Ensure the MP demo dataset exists (idempotent, safe on every boot).

Render's free SQLite disk is wiped on each deploy. Calling this at startup
guarantees the officer dashboard never opens blank: if no gap cases exist,
demo citizens are ensured and the gap scan runs once.
"""

from app.db.session import SessionLocal
from app.models.gap_case import GapCase
from app.services.demo_seed import ensure_demo_data, run_gap_scan


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.query(GapCase).count()
        if existing == 0:
            citizens = ensure_demo_data(db)
            created = run_gap_scan(db)
            print(f"Demo auto-seed: {citizens} citizens ensured, {created} gap cases created.")
        else:
            print(f"Demo data present ({existing} gap cases) — skipping auto-seed.")
    finally:
        db.close()


if __name__ == "__main__":
    from app.db.base import Base  # noqa: E402
    from app.db.session import engine  # noqa: E402

    Base.metadata.create_all(bind=engine)
    main()

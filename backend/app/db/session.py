"""DB engine / session factory."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.is_sqlite else {"charset": "utf8mb4"}
engine_kwargs = {"pool_pre_ping": True, "future": True}
if settings.is_sqlite:
    engine_kwargs["connect_args"] = connect_args
else:
    engine_kwargs["connect_args"] = {}
    engine_kwargs["pool_recycle"] = 3600

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db_session():
    """Yield a DB session (used by deps + seed + alembic scripts)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

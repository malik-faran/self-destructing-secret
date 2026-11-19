"""Database engine and session configuration.

Defaults to a local SQLite file (``backend/secrets.db``) when ``DATABASE_URL``
is not configured. Any SQLAlchemy-compatible PostgreSQL URL works as-is.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env if present. Existing environment variables win.
load_dotenv(BACKEND_DIR / ".env", override=False)

DEFAULT_SQLITE_URL = "sqlite:///./secrets.db"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or DEFAULT_SQLITE_URL

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables that do not exist yet."""
    # Importing models registers them on Base.metadata.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

"""Test fixtures: isolated SQLite database and a throwaway encryption key."""

import os
import shutil
import sys
import tempfile
from pathlib import Path

import pytest
from cryptography.fernet import Fernet

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Configure the environment *before* importing the application.
_TMP_DIR = tempfile.mkdtemp(prefix="secret-sharer-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DIR}/test.db"
os.environ["ENCRYPTION_KEY"] = Fernet.generate_key().decode()
os.environ.pop("FERNET_KEY_FILE", None)

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import SecretItem  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    shutil.rmtree(_TMP_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def _clean_tables():
    with engine.begin() as connection:
        connection.execute(delete(SecretItem))
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

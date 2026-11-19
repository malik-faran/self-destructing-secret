"""UTC time helpers.

All datetimes are persisted as *naive UTC* so that SQLite and PostgreSQL
behave identically. API responses always serialize with an explicit ``Z``.
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def utcnow_naive() -> datetime:
    """Return the current UTC time as a naive datetime (DB storage format)."""
    return utcnow().replace(tzinfo=None)


def to_db_utc(value: datetime) -> datetime:
    """Normalize any datetime to naive UTC for storage."""
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def from_db_utc(value: datetime) -> datetime:
    """Attach the UTC timezone to a datetime loaded from the database."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def isoformat_z(value: datetime) -> str:
    """Serialize a datetime as an ISO-8601 UTC string with a trailing ``Z``."""
    return from_db_utc(value).isoformat().replace("+00:00", "Z")

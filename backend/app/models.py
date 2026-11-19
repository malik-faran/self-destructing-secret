"""SQLAlchemy models."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.timeutils import utcnow_naive


class SecretItem(Base):
    """A single encrypted, self-destructing secret.

    Only the ciphertext is stored. Passphrase verifiers are stored as a salted
    SHA-256 digest; the passphrase itself is never persisted.
    """

    __tablename__ = "secrets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    encrypted_content: Mapped[str] = mapped_column(Text, nullable=False)
    passphrase_salt: Mapped[str | None] = mapped_column(String(64), nullable=True)
    passphrase_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow_naive
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<SecretItem id={self.id!r} expires_at={self.expires_at!r}>"

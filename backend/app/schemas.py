"""Pydantic request/response schemas."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_SECRET_LENGTH = 10_000
MAX_PASSPHRASE_LENGTH = 256
MAX_EXPIRY_MINUTES = 60 * 24 * 30  # 30 days


class SecretCreate(BaseModel):
    secret_text: str = Field(..., min_length=1, max_length=MAX_SECRET_LENGTH)
    expires_in_minutes: int = Field(default=60, ge=1, le=MAX_EXPIRY_MINUTES)
    passphrase: str | None = Field(default=None, max_length=MAX_PASSPHRASE_LENGTH)

    @field_validator("secret_text")
    @classmethod
    def secret_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("secret_text must not be blank")
        return value

    @field_validator("passphrase")
    @classmethod
    def blank_passphrase_is_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value if value.strip() else None


class SecretCreated(BaseModel):
    secret_id: str
    expires_at: str
    requires_passphrase: bool
    expires_in_minutes: int


class SecretMeta(BaseModel):
    exists: Literal[True] = True
    requires_passphrase: bool
    expires_at: str
    created_at: str


class RevealRequest(BaseModel):
    passphrase: str | None = Field(default=None, max_length=MAX_PASSPHRASE_LENGTH)

    @field_validator("passphrase")
    @classmethod
    def blank_passphrase_is_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value if value.strip() else None


class SecretRevealed(BaseModel):
    secret_text: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    active_secrets: int
    timestamp: str

"""REST API routes."""

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app import __version__
from app.crypto import (
    CryptoError,
    decrypt_secret,
    encrypt_secret,
    hash_passphrase,
    verify_passphrase,
)
from app.database import get_db
from app.models import SecretItem
from app.schemas import (
    HealthResponse,
    RevealRequest,
    SecretCreate,
    SecretCreated,
    SecretMeta,
    SecretRevealed,
)
from app.timeutils import isoformat_z, utcnow_naive

router = APIRouter(prefix="/api", tags=["secrets"])

NOT_FOUND_DETAIL = "This secret has self-destructed or expired."
WRONG_PASSPHRASE_DETAIL = (
    "Incorrect passphrase. The secret has not been destroyed — please try again."
)
SERVICE_NAME = "self-destructing-secret"


def purge_expired(db: Session) -> int:
    """Delete every expired record. Committed so all callers see a clean table."""
    result = db.execute(
        delete(SecretItem).where(SecretItem.expires_at <= utcnow_naive())
    )
    db.commit()
    return int(result.rowcount or 0)


def _get_live_secret(db: Session, secret_id: str) -> SecretItem:
    item = db.get(SecretItem, secret_id)
    if item is None or item.expires_at <= utcnow_naive():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_DETAIL)
    return item


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    """Service liveness plus the number of still-revealable encrypted secrets."""
    purge_expired(db)
    active = db.scalar(
        select(func.count())
        .select_from(SecretItem)
        .where(SecretItem.expires_at > utcnow_naive())
    )
    return HealthResponse(
        status="ok",
        service=SERVICE_NAME,
        version=__version__,
        active_secrets=int(active or 0),
        timestamp=isoformat_z(utcnow_naive()),
    )


@router.post(
    "/secrets",
    response_model=SecretCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_secret(payload: SecretCreate, db: Session = Depends(get_db)) -> SecretCreated:
    """Encrypt a secret and store only the ciphertext."""
    purge_expired(db)

    expires_at = utcnow_naive() + timedelta(minutes=payload.expires_in_minutes)
    salt: str | None = None
    passphrase_hash: str | None = None

    if payload.passphrase:
        salt, passphrase_hash = hash_passphrase(payload.passphrase)

    item = SecretItem(
        id=str(uuid.uuid4()),
        encrypted_content=encrypt_secret(payload.secret_text),
        passphrase_salt=salt,
        passphrase_hash=passphrase_hash,
        expires_at=expires_at,
        created_at=utcnow_naive(),
    )
    db.add(item)
    db.commit()

    return SecretCreated(
        secret_id=item.id,
        expires_at=isoformat_z(item.expires_at),
        requires_passphrase=item.passphrase_hash is not None,
        expires_in_minutes=payload.expires_in_minutes,
    )


@router.get("/secrets/{secret_id}/meta", response_model=SecretMeta)
def secret_meta(secret_id: str, db: Session = Depends(get_db)) -> SecretMeta:
    """Metadata only — never decrypts or consumes the secret.

    This endpoint exists so chat clients, link scanners, and browser prefetch
    can inspect a link without burning it.
    """
    purge_expired(db)
    item = _get_live_secret(db, secret_id)
    return SecretMeta(
        exists=True,
        requires_passphrase=bool(item.passphrase_hash),
        expires_at=isoformat_z(item.expires_at),
        created_at=isoformat_z(item.created_at),
    )


@router.post("/secrets/{secret_id}/reveal", response_model=SecretRevealed)
def reveal_secret(
    secret_id: str,
    payload: RevealRequest | None = None,
    db: Session = Depends(get_db),
) -> SecretRevealed:
    """Verify, decrypt, and atomically destroy a secret in one request.

    The record is deleted with a conditional ``DELETE`` and the row count is
    checked before any plaintext is returned, so concurrent claims can never
    both succeed.
    """
    purge_expired(db)
    item = _get_live_secret(db, secret_id)

    if item.passphrase_hash:
        if not payload or not payload.passphrase:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This secret requires a passphrase.",
            )
        if not verify_passphrase(
            payload.passphrase, item.passphrase_salt, item.passphrase_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=WRONG_PASSPHRASE_DETAIL,
            )

    try:
        plaintext = decrypt_secret(item.encrypted_content)
    except CryptoError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The stored secret could not be decrypted.",
        ) from None

    # Atomic one-time claim: only the request that deletes the row may return it.
    result = db.execute(
        delete(SecretItem).where(
            SecretItem.id == secret_id,
            SecretItem.expires_at > utcnow_naive(),
        )
    )
    if not result.rowcount:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_DETAIL)
    db.commit()

    return SecretRevealed(secret_text=plaintext)


@router.get("/ping", include_in_schema=False)
def ping(response: Response) -> dict[str, str]:
    """Lightweight liveness probe that never touches the database."""
    response.headers["Cache-Control"] = "no-store"
    return {"status": "ok"}

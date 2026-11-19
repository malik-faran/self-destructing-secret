"""Encryption and passphrase hashing primitives.

Secret payloads are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) before
they ever reach the database. The encryption key is read from ``ENCRYPTION_KEY``
or generated once and persisted to ``.fernet.key`` next to the backend package.
"""

import hashlib
import hmac
import os
import secrets
from functools import lru_cache
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env", override=False)

DEFAULT_KEY_FILE = BACKEND_DIR / ".fernet.key"


class CryptoError(Exception):
    """Raised when encryption or decryption cannot be performed."""


def _key_file() -> Path:
    configured = os.getenv("FERNET_KEY_FILE", "").strip()
    return Path(configured).expanduser() if configured else DEFAULT_KEY_FILE


def _validate_key(raw: bytes) -> bytes:
    try:
        Fernet(raw)
    except (ValueError, TypeError) as exc:
        raise CryptoError(
            "ENCRYPTION_KEY is not a valid Fernet key. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        ) from exc
    return raw


def _read_key_file(path: Path) -> bytes | None:
    if not path.exists():
        return None
    raw = path.read_bytes().strip()
    if not raw:
        return None
    return _validate_key(raw)


def _persist_key(path: Path, key: bytes) -> None:
    """Write the key with owner-only permissions, atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(key)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass  # Windows does not fully support POSIX modes.


@lru_cache(maxsize=1)
def get_fernet() -> Fernet:
    """Return a cached Fernet instance, generating a local key if needed."""
    env_key = os.getenv("ENCRYPTION_KEY", "").strip()
    if env_key:
        return Fernet(_validate_key(env_key.encode("utf-8")))

    path = _key_file()
    existing = _read_key_file(path)
    if existing:
        return Fernet(existing)

    new_key = Fernet.generate_key()
    _persist_key(path, new_key)
    # Another process may have won the race; always re-read from disk.
    persisted = _read_key_file(path) or new_key
    return Fernet(persisted)


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a UTF-8 secret and return a URL-safe token."""
    token = get_fernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(token: str) -> str:
    """Decrypt a Fernet token back to its UTF-8 plaintext."""
    try:
        return get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise CryptoError("Secret payload could not be decrypted.") from exc


def hash_passphrase(passphrase: str, salt_hex: str | None = None) -> tuple[str, str]:
    """Return ``(salt_hex, sha256(salt || passphrase).hexdigest())``.

    A fresh 16-byte salt is generated when ``salt_hex`` is omitted.
    """
    if salt_hex is None:
        salt = secrets.token_bytes(16)
    else:
        salt = bytes.fromhex(salt_hex)
    digest = hashlib.sha256(salt + passphrase.encode("utf-8")).hexdigest()
    return salt.hex(), digest


def verify_passphrase(passphrase: str, salt_hex: str | None, expected_hash: str | None) -> bool:
    """Constant-time comparison of a candidate passphrase against the stored hash."""
    if not salt_hex or not expected_hash:
        return False
    try:
        _, candidate = hash_passphrase(passphrase, salt_hex)
    except ValueError:
        return False
    return hmac.compare_digest(candidate, expected_hash)

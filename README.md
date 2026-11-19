# Self-Destructing Secret & Password Sharer (One-Time Link)

> Share a password, API key, or private note through a link that works exactly once.

A compact, production-minded secret-sharing app: **FastAPI + SQLite + Fernet encryption** on the backend, **React + Vite + Tailwind** on the frontend. No accounts, no plaintext at rest, no second chance.

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0b0f14)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## Preview

| Create a one-time link | Recipient reveal |
| --- | --- |
| ![BurnLink home screen](docs/home.png) | ![BurnLink reveal screen](docs/reveal.png) |

---

## Why this exists

Sending a password over chat leaves it in message history, backups, and notification previews — forever. BurnLink replaces that with a URL that self-destructs:

- **Encrypted before storage.** The API encrypts the payload with Fernet (AES-128-CBC + HMAC-SHA256). The database only ever holds a ciphertext token.
- **One reveal, atomic destroy.** The reveal request decrypts in memory and deletes the row with a conditional `DELETE`. The affected row count is checked before any plaintext is returned, so two concurrent requests can never both succeed.
- **Bot-safe link previews.** Links open on a `/meta` check that never decrypts or deletes. WhatsApp, Slack, or antivirus scanners can inspect the URL without burning it.
- **Optional passphrase.** Stored as a salted SHA-256 digest and verified in constant time. A wrong passphrase does **not** destroy the secret.
- **Automatic expiry.** Choose 10 minutes, 1 hour, 24 hours, or 7 days. Expired rows are purged on every API call.
- **Runs out of the box.** SQLite by default; no Docker or PostgreSQL required. PostgreSQL is a `DATABASE_URL` away.

---

## Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Sender
    actor Recipient
    participant UI as React UI
    participant API as FastAPI
    participant DB as SQLite / PostgreSQL

    Sender->>UI: Paste secret, choose expiry,<br/>optionally add a passphrase
    UI->>API: POST /api/secrets
    API->>API: Encrypt with Fernet<br/>(AES-128-CBC + HMAC-SHA256)
    API->>API: Salt + SHA-256(passphrase)<br/>(only if supplied)
    API->>DB: INSERT ciphertext, hash, expires_at
    DB-->>API: OK
    API-->>UI: secret_id + expires_at
    UI-->>Sender: https://host/s/{secret_id}

    Sender->>Recipient: Share the link over a trusted channel

    Note over Recipient,DB: Link previews and scanners stop here.<br/>No decryption. No deletion.
    Recipient->>API: GET /api/secrets/{id}/meta
    API->>DB: SELECT metadata only
    API-->>Recipient: exists, requires_passphrase, expires_at

    Recipient->>API: POST /api/secrets/{id}/reveal<br/>{ "passphrase": "..." }
    API->>DB: Load ciphertext + passphrase hash
    API->>API: Constant-time passphrase check
    API->>API: Decrypt ciphertext
    API->>DB: Atomic DELETE WHERE id = {id}
    DB-->>API: 1 row deleted
    API-->>Recipient: { "secret_text": "..." } — exactly once

    Recipient->>API: Second reveal attempt
    API-->>Recipient: 404 — self-destructed or expired
```

### Request lifecycle

| Step | Endpoint | Decrypts? | Deletes? |
| --- | --- | --- | --- |
| Create | `POST /api/secrets` | — (encrypts) | No |
| Preview | `GET /api/secrets/{id}/meta` | No | No |
| Reveal | `POST /api/secrets/{id}/reveal` | Yes | **Yes, atomically** |

---

## Quick start (Windows / Linux / macOS, no Docker)

Requires **Python 3.11+** and **Node.js 18+**.

### 1. Backend

```bash
cd backend
python -m venv .venv

# Linux / macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: <http://localhost:8000>
- Interactive docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/health>

On first start, the backend automatically creates `backend/.fernet.key` (mode `0600`) and `backend/secrets.db`. No configuration is required. To pin your own key, create `backend/.env`:

```env
ENCRYPTION_KEY=your-fernet-key
DATABASE_URL=sqlite:///./secrets.db
```

Generate a valid key with:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The frontend talks to `http://localhost:8000` by default. Override it with `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Try it

1. Paste a secret, pick **1 Hour**, optionally add a passphrase.
2. Click **Generate One-Time Link** and copy the URL.
3. Open the link in a private window, reveal the secret once.
4. Reload — you get the **“This secret has self-destructed or expired”** screen.
5. `GET /api/health` now reports one fewer active secret.

---

## Docker

```bash
docker compose up --build
```

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | <http://localhost:5173> | Nginx, SPA fallback, security headers |
| Backend | <http://localhost:8000> | FastAPI + SQLite in a named volume |
| Docs | <http://localhost:8000/docs> | OpenAPI explorer |

The SQLite database and the auto-generated Fernet key live in the `backend_data` volume (`/data`). Set `VITE_API_URL` at build time when deploying the frontend somewhere other than `localhost:8000`:

```bash
VITE_API_URL=https://api.example.com docker compose up --build
```

---

## API reference

Base URL: `http://localhost:8000`

### `GET /api/health`

```json
{
  "status": "ok",
  "service": "self-destructing-secret",
  "version": "1.0.0",
  "active_secrets": 3,
  "timestamp": "2026-11-19T15:04:05.123456Z"
}
```

Also purges expired rows first, so `active_secrets` is always accurate.

### `POST /api/secrets`

```json
{
  "secret_text": "postgres://user:pass@host/db",
  "expires_in_minutes": 60,
  "passphrase": "optional extra layer"
}
```

`expires_in_minutes`: 1–43,200. Returns `201 Created`:

```json
{
  "secret_id": "0f9c4e2a-6f0e-4f28-9f3c-6a1d5b2e7c11",
  "expires_at": "2026-11-19T16:04:05.123456Z",
  "requires_passphrase": true,
  "expires_in_minutes": 60
}
```

### `GET /api/secrets/{secret_id}/meta`

Metadata only. **Never decrypts and never deletes.**

```json
{
  "exists": true,
  "requires_passphrase": true,
  "expires_at": "2026-11-19T16:04:05.123456Z",
  "created_at": "2026-11-19T15:04:05.123456Z"
}
```

Returns `404` when the secret is gone, expired, or was never valid.

### `POST /api/secrets/{secret_id}/reveal`

```json
{ "passphrase": "optional extra layer" }
```

The body is optional for link-only secrets. Success returns `200` **and deletes the row**:

```json
{ "secret_text": "postgres://user:pass@host/db" }
```

| Status | Meaning |
| --- | --- |
| `200` | Decrypted and destroyed. This response is the only copy. |
| `403` | Missing or incorrect passphrase. The secret is **not** destroyed. |
| `404` | Expired, already revealed, or never existed. |

---

## Data model

```text
secrets
├── id                 VARCHAR(36)  PRIMARY KEY (UUIDv4)
├── encrypted_content  TEXT         Fernet token — ciphertext only
├── passphrase_salt    VARCHAR(64)  NULL when unprotected
├── passphrase_hash    VARCHAR(64)  SHA-256(salt || passphrase)
├── expires_at         DATETIME     UTC, indexed
└── created_at         DATETIME     UTC
```

All datetimes are persisted as naive UTC and serialized with a trailing `Z`, which keeps SQLite and PostgreSQL behavior identical.

---

## Security model (read this)

**What BurnLink protects against**

- Plaintext secrets sitting in a database, disk snapshot, or accidental `SELECT *`.
- A secret being readable more than once.
- Link-preview bots consuming a secret before the recipient opens it.
- A typo in the passphrase irreversibly destroying the secret.

**Important limitations**

- **Not end-to-end encrypted.** The server decrypts the secret at reveal time, so it must hold the plaintext in memory briefly. If you do not trust the operator, use a client-side-encrypted tool instead.
- **The link itself is a bearer token.** Anyone who opens it first can burn it. Add a passphrase and share the link and passphrase over different channels.
- **Passphrase hashing uses salted SHA-256 as specified.** It is fast and therefore weak against offline guessing if the database leaks. Use a long, unique passphrase, or switch the helper in `backend/app/crypto.py` to Argon2id/PBKDF2 for higher-value deployments.
- **HTTPS is mandatory in production.** Without it, the secret, passphrase, and response are visible to the network. Terminate TLS at a reverse proxy.
- **Key loss = data loss.** Back up `.fernet.key` (or `ENCRYPTION_KEY`) securely; anyone with the key and the database can decrypt unexpired secrets.
- **No built-in rate limiting.** Put the API behind a reverse proxy / WAF with per-IP limits on `/reveal` and `/api/secrets` to reduce abuse and passphrase guessing.
- **No audit trail by design.** Access logs can still leak URLs; disable URL logging at your proxy and keep `Referrer-Policy: no-referrer` (set by the app and Nginx).
- **Server memory, swap, and core dumps** may briefly contain plaintext. Harden the host if this matters.
- Database backups may retain deleted pages until vacuumed. Keep expiry short for highly sensitive material.

**Defense-in-depth included**

- CORS restricted to configured origins (`http://localhost:5173` and `*` by default for local development).
- `Cache-Control: no-store` on all API responses.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` (Nginx).
- UUIDv4 identifiers (non-enumerable).
- Constant-time passphrase comparison via `hmac.compare_digest`.
- Automatic cleanup of expired rows on every endpoint.
- Secrets capped at 10,000 characters; passphrases at 256.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./secrets.db` | Any SQLAlchemy URL. PostgreSQL-compatible. |
| `ENCRYPTION_KEY` | auto-generated | Fernet key (44-char URL-safe base64). |
| `FERNET_KEY_FILE` | `backend/.fernet.key` | Where the generated key is persisted. |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,*` | Comma-separated allowed origins. |

### Frontend

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | API base URL, baked in at build time. |

---

## Testing

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Five focused tests cover:

1. Health check and active-secret count.
2. Encryption at rest — the database never contains plaintext.
3. `/meta` is non-destructive (bot-safe preview).
4. One-time reveal — second attempt returns `404`.
5. Passphrase verification (wrong attempts do not burn) and expiration enforcement.

Run the frontend production build check with:

```bash
cd frontend
npm run build
```

The included `.github/workflows/ci.yml` runs both jobs on every push and pull request. Publishing workflow files requires a GitHub token with the `workflow` scope.

---

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── crypto.py        # Fernet encryption + salted passphrase hashing
│   │   ├── database.py      # SQLite/PostgreSQL engine & sessions
│   │   ├── main.py          # FastAPI app, CORS, security headers
│   │   ├── models.py        # SecretItem ORM model
│   │   ├── routes.py        # health, create, meta, reveal
│   │   ├── schemas.py       # Pydantic request/response models
│   │   └── timeutils.py     # UTC helpers
│   ├── tests/
│   │   ├── conftest.py      # isolated test DB + throwaway key
│   │   └── test_secrets.py  # 5 pytest scenarios
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout, CopyButton
│   │   ├── lib/             # API client, clipboard, formatting
│   │   ├── pages/           # Home, Reveal, NotFound
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── .github/workflows/ci.yml
├── docs/                    # README screenshots
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## Production checklist

- [ ] Serve the SPA and API behind HTTPS (Caddy, Nginx, or a cloud LB).
- [ ] Set a strong, backed-up `ENCRYPTION_KEY` via a secret manager.
- [ ] Use PostgreSQL for multi-instance deployments (`postgresql+psycopg://…`).
- [ ] Restrict `CORS_ORIGINS` to your real frontend origin (remove `*`).
- [ ] Disable request logging for `/s/*` and `/api/*` paths, or scrub IDs.
- [ ] Add per-IP rate limits on `POST /api/secrets` and `/reveal`.
- [ ] Run the container as a non-root user and keep dependencies patched.
- [ ] Configure database backups **and** protect the encryption key separately.
- [ ] Consider Argon2id for passphrase hashing before high-value use.

---

## License

[MIT](LICENSE) © 2026 malik-faran

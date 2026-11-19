"""FastAPI application entrypoint."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.crypto import CryptoError
from app.database import init_db
from app.routes import router

logger = logging.getLogger("secrets")
logging.basicConfig(level=logging.INFO)

DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",
]


def _cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "").strip()
    if not configured:
        return DEFAULT_ORIGINS
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or DEFAULT_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized and API ready.")
    yield


app = FastAPI(
    title="Self-Destructing Secret & Password Sharer (One-Time Link)",
    description=(
        "Privacy-first, one-time secret sharing. Secrets are encrypted at rest "
        "with Fernet (AES-128-CBC + HMAC-SHA256) and destroyed on first reveal."
    ),
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    # Never leak a secret-bearing URL through the Referer header.
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response


@app.exception_handler(CryptoError)
async def crypto_error_handler(request: Request, exc: CryptoError):
    logger.error("Encryption failure: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal encryption error occurred."},
    )


app.include_router(router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {
        "service": "Self-Destructing Secret & Password Sharer",
        "version": __version__,
        "docs": "/docs",
        "health": "/api/health",
    }

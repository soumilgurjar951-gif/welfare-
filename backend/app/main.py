"""FastAPI application factory: CORS, rate limiting, routers, uploads, errors."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.routers import admin, applications, auth, notifications, public_stats, schemes, users

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="Scheme Sync — welfare scheme applications + admin verification workflow.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(status_code=429, content={"detail": "Too many requests, slow down."})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router, prefix=prefix)
    app.include_router(schemes.router, prefix=prefix)
    app.include_router(applications.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(public_stats.router, prefix=prefix)


    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    @app.get("/health", tags=["health"])
    def health() -> dict:
        return {"status": "ok", "service": "scheme-sync"}

    return app


app = create_app()

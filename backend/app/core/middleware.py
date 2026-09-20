"""CERT-In baseline controls: security headers + production HTTPS enforcement.

Headers applied to every API response (HSTS, CSP, X-Frame-Options, …).
HTTPS redirect activates only when ENVIRONMENT=production so local
http://127.0.0.1 development keeps working.
"""

from fastapi import Request
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

SECURITY_HEADERS: dict[str, str] = {
    # Clickjacking defence — no embedding of API/docs in foreign frames.
    "X-Frame-Options": "SAMEORIGIN",
    # MIME-sniffing defence.
    "X-Content-Type-Options": "nosniff",
    # Minimal referrer leakage.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    # No browser features needed by a JSON API.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    # Only same-origin framing of docs; scripts/styles locked to self.
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'self'",
    # Server fingerprinting minimised (uvicorn header is overridden).
    "Server": "SchemeSync",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for key, value in SECURITY_HEADERS.items():
            response.headers[key] = value
        if settings.ENVIRONMENT.lower() == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return response


class HttpsRedirectMiddleware(BaseHTTPMiddleware):
    """Force HTTPS in production ( honouring proxy X-Forwarded-Proto )."""

    async def dispatch(self, request: Request, call_next):
        if settings.ENVIRONMENT.lower() == "production":
            proto = request.headers.get("x-forwarded-proto", request.url.scheme)
            if proto == "http":
                url = request.url.replace(scheme="https")
                return RedirectResponse(str(url), status_code=307)
        return await call_next(request)

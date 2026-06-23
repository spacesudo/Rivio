"""Security middleware helpers: rate limiting and security headers."""

import time
from collections import deque
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# In-memory sliding-window request log per client IP. This is a best-effort
# guard suitable for small deployments; production should use Redis.
_WINDOW_SECONDS = 60
_LIMITS: dict[str, tuple[int, int]] = {
    "default": (120, _WINDOW_SECONDS),  # 120 requests per minute
    "ai": (20, _WINDOW_SECONDS),  # 20 AI messages per minute
}

_request_log: dict[str, dict[str, deque[float]]] = {}


def _is_limited(path: str, ip: str, now: float) -> bool:
    key = "ai" if path.startswith("/api/v1/ai") else "default"
    limit, window = _LIMITS[key]

    log = _request_log.setdefault(key, {}).setdefault(ip, deque())

    # Evict entries outside the window
    while log and log[0] < now - window:
        log.popleft()

    if len(log) >= limit:
        return True

    log.append(now)
    return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple sliding-window rate limiter keyed by client IP."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        ip = request.client.host if request.client else "unknown"
        if _is_limited(request.url.path, ip, time.time()):
            return JSONResponse(
                status_code=429,
                content={
                    "message": "Too many requests. Please slow down.",
                    "error_code": "rate_limited",
                    "resolution": "Wait a minute and try again.",
                },
            )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add common HTTP security headers to every response."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        # Restrictive default CSP; adjust as needed for frontend requirements.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "connect-src 'self' https:; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' https: data:; "
            "font-src 'self';"
        )
        return response


def add_security_middleware(app: FastAPI) -> None:
    """Register security middleware on the FastAPI app."""
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from .config import get_settings


class RateLimiter:
    """In-memory sliding-window limiter keyed by client IP.

    Good enough for a single server instance. If the API ever runs on several instances,
    move this to a shared store such as Redis.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and hits[0] <= now - window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many tries. Please wait a few minutes and try again.",
            )
        hits.append(now)

    def reset(self) -> None:
        self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    # Render and Railway sit behind a proxy that sets X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: int, window_seconds: int):
    """FastAPI dependency: allow at most `limit` calls per `window_seconds` per IP for this route."""

    async def dependency(request: Request) -> None:
        if get_settings().rate_limit_enabled:
            limiter.check(f"{name}:{client_ip(request)}", limit, window_seconds)

    return dependency

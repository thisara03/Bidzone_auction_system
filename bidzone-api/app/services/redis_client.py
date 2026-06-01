"""Optional Redis (diagram: primary DB + Redis). Safe no-op when REDIS_URL unset."""

from typing import Any

from app.core.config import settings

_client: Any | None = None


def get_redis() -> Any | None:
    global _client
    if not settings.redis_url:
        return None
    if _client is None:
        import redis

        # Short timeouts so /health does not hang when Redis URL is set but server is unreachable.
        _client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _client


def redis_ping() -> bool | None:
    """None when Redis disabled; True/False when enabled."""
    r = get_redis()
    if r is None:
        return None
    try:
        return bool(r.ping())
    except Exception:
        return False

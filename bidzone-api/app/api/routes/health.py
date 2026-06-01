import concurrent.futures

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.redis_client import redis_ping

router = APIRouter(prefix="/health", tags=["health"])

_HEALTH_TIMEOUT_SEC = 12.0


def _deep_health_payload() -> dict[str, object]:
    """Runs DB + Redis checks (may block on misconfigured infra)."""
    database_ok = False
    db: Session = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        database_ok = False
    finally:
        db.close()

    redis_ok = redis_ping()
    overall = "ok" if database_ok else "degraded"
    return {
        "status": overall,
        "database": database_ok,
        "redis": redis_ok,
        "redis_note": None if redis_ok is not None else "Redis URL not configured",
    }


@router.get("/live")
def health_live() -> dict[str, str]:
    """No database or Redis; confirms Uvicorn responds."""
    return {"status": "live"}


@router.get("")
def health_root() -> dict[str, object]:
    """Same as GET /health — DB + Redis with timeout."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        fut = pool.submit(_deep_health_payload)
        try:
            return fut.result(timeout=_HEALTH_TIMEOUT_SEC)
        except concurrent.futures.TimeoutError:
            return {
                "status": "degraded",
                "database": False,
                "redis": None,
                "redis_note": "Health check timed out - see /health/live and fix DATABASE_URL / REDIS_URL / MySQL.",
                "detail": f"Checks exceeded {_HEALTH_TIMEOUT_SEC:.0f}s (likely MySQL not accepting connections).",
            }

"""Periodically mark live auctions as ended after ends_at (final close)."""

from datetime import datetime, timezone

from sqlalchemy import update

from app.db.session import SessionLocal
from app.models.auction import Auction
from app.services.settlement import bootstrap_settlements_for_ended_auctions, process_checkout_timeouts


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def close_expired_auctions() -> int:
    """Mark past auctions ended; open Phase 5 settlement; process payment timeouts."""
    db = SessionLocal()
    try:
        stmt = (
            update(Auction)
            .where(Auction.status == "live", Auction.ends_at <= utcnow())
            .values(status="ended")
        )
        result = db.execute(stmt)
        db.commit()
        n_closed = result.rowcount or 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    db2 = SessionLocal()
    try:
        bootstrap_settlements_for_ended_auctions(db2)
        process_checkout_timeouts(db2)
        db2.commit()
    except Exception:
        db2.rollback()
        raise
    finally:
        db2.close()

    return n_closed

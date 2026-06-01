"""Phase 4 anti-sniping: block new entrants inside the final window before ends_at."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.auction import Auction
from app.models.participant import AuctionParticipant


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def anti_sniping_window_start(auction: Auction) -> datetime:
    return auction.ends_at - timedelta(minutes=max(0, auction.anti_sniping_minutes))


def is_past_auction_end(auction: Auction, now: datetime | None = None) -> bool:
    t = now or utcnow()
    return t >= auction.ends_at


def is_anti_sniping_locked(auction: Auction, now: datetime | None = None) -> bool:
    """True when new participants / first-time bidders must be rejected."""
    t = now or utcnow()
    if t >= auction.ends_at:
        return True
    return t >= anti_sniping_window_start(auction)


def is_participant(db: Session, auction_id, user_id) -> bool:
    row = db.scalar(
        select(AuctionParticipant.id).where(
            AuctionParticipant.auction_id == auction_id,
            AuctionParticipant.user_id == user_id,
        )
    )
    return row is not None


def ensure_participant(db: Session, auction_id, user_id) -> None:
    """Idempotent insert: PostgreSQL ON CONFLICT DO NOTHING; MySQL INSERT IGNORE."""
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        stmt = (
            pg_insert(AuctionParticipant)
            .values(auction_id=auction_id, user_id=user_id)
            .on_conflict_do_nothing(constraint="uq_participant_auction_user")
        )
    else:
        stmt = (
            mysql_insert(AuctionParticipant)
            .prefix_with("IGNORE")
            .values(auction_id=auction_id, user_id=user_id)
        )
    db.execute(stmt)

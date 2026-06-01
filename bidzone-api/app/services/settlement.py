"""Phase 5: cascading winner allocation, payment window, timeout fallback. Phase 6: bail → trust penalty."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.lifecycle import schedule_coroutine
from app.models.auction import Auction
from app.models.bid import Bid
from app.models.rating import Rating
from app.models.user import User
from app.services.trust_sync import refresh_user_trust_score
from app.services.ws_manager import auction_ws_manager

SETTLEMENT_NONE = "none"
SETTLEMENT_PENDING_PAYMENT = "pending_payment"
SETTLEMENT_PAID = "paid"
SETTLEMENT_AWAITING_DELIVERY = "awaiting_delivery"
SETTLEMENT_AWAITING_RATINGS = "awaiting_ratings"
SETTLEMENT_COMPLETED = "completed"
SETTLEMENT_NO_BIDS = "no_bids"
SETTLEMENT_RESERVE_NOT_MET = "reserve_not_met"
SETTLEMENT_EXHAUSTED = "exhausted"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ranked_bidders_by_high_bid(db: Session, auction_id: uuid.UUID) -> list[tuple[uuid.UUID, int]]:
    subq = (
        select(Bid.bidder_id, func.max(Bid.amount_cents).label("mx"))
        .where(Bid.auction_id == auction_id)
        .group_by(Bid.bidder_id)
        .subquery()
    )
    stmt = select(subq.c.bidder_id, subq.c.mx).order_by(subq.c.mx.desc())
    return [(row[0], int(row[1])) for row in db.execute(stmt).all()]


def _broadcast(aid: str, payload: dict[str, Any]) -> None:
    schedule_coroutine(auction_ws_manager.broadcast_json(aid, payload))


def bootstrap_settlements_for_ended_auctions(db: Session) -> int:
    """Attach checkout state to auctions that just ended (idempotent per auction)."""
    auctions = db.scalars(
        select(Auction).where(Auction.status == "ended", Auction.settlement_status == SETTLEMENT_NONE)
    ).all()
    changed = 0
    for a in auctions:
        if _open_settlement(db, a):
            changed += 1
    return changed


def _open_settlement(db: Session, auction: Auction) -> bool:
    aid = str(auction.id)
    ranked = ranked_bidders_by_high_bid(db, auction.id)
    if not ranked:
        auction.settlement_status = SETTLEMENT_NO_BIDS
        auction.checkout_winner_id = None
        auction.checkout_deadline_at = None
        _broadcast(
            aid,
            {
                "event": "settlement_opened",
                "auction_id": aid,
                "settlement_status": SETTLEMENT_NO_BIDS,
            },
        )
        return True

    if auction.reserve_cents is not None and auction.current_high_cents < auction.reserve_cents:
        auction.settlement_status = SETTLEMENT_RESERVE_NOT_MET
        auction.checkout_winner_id = None
        auction.checkout_deadline_at = None
        _broadcast(
            aid,
            {
                "event": "settlement_opened",
                "auction_id": aid,
                "settlement_status": SETTLEMENT_RESERVE_NOT_MET,
            },
        )
        return True

    auction.checkout_round = 0
    return _assign_winner_at_round(db, auction, ranked)


def _assign_winner_at_round(db: Session, auction: Auction, ranked: list[tuple[uuid.UUID, int]]) -> bool:
    aid = str(auction.id)
    while auction.checkout_round < len(ranked):
        winner_id, high_cents = ranked[auction.checkout_round]
        if winner_id == auction.seller_id:
            auction.checkout_round += 1
            continue
        auction.checkout_winner_id = winner_id
        auction.settlement_status = SETTLEMENT_PENDING_PAYMENT
        auction.checkout_deadline_at = utcnow() + timedelta(minutes=max(1, auction.payment_window_minutes))
        _broadcast(
            aid,
            {
                "event": "winner_allocated",
                "auction_id": aid,
                "winner_id": str(winner_id),
                "checkout_deadline_at": auction.checkout_deadline_at.isoformat(),
                "allocation_round": auction.checkout_round + 1,
                "amount_due_cents": high_cents,
                "settlement_status": SETTLEMENT_PENDING_PAYMENT,
                "payment_state": "pending_payment",
            },
        )
        return True

    auction.settlement_status = SETTLEMENT_EXHAUSTED
    auction.checkout_winner_id = None
    auction.checkout_deadline_at = None
    _broadcast(
        aid,
        {
            "event": "allocation_exhausted",
            "auction_id": aid,
            "settlement_status": SETTLEMENT_EXHAUSTED,
        },
    )
    return True


def fail_current_checkout(
    db: Session,
    auction: Auction,
    ranked: list[tuple[uuid.UUID, int]],
    *,
    reason: str,
) -> None:
    aid = str(auction.id)
    loser_id = auction.checkout_winner_id
    if loser_id:
        loser = db.get(User, loser_id)
        if loser:
            loser.unpaid_win_count += 1
            refresh_user_trust_score(db, loser)

    _broadcast(
        aid,
        {
            "event": "payment_failed",
            "auction_id": aid,
            "reason": reason,
            "previous_winner_id": str(loser_id) if loser_id else None,
            "payment_state": "payment_failed",
        },
    )

    auction.checkout_round += 1
    auction.checkout_winner_id = None
    auction.checkout_deadline_at = None
    _assign_winner_at_round(db, auction, ranked)


def process_checkout_timeouts(db: Session) -> int:
    """Reassign when the payment window expires (Phase 5 Step 14)."""
    now = utcnow()
    due = db.scalars(
        select(Auction).where(
            Auction.settlement_status == SETTLEMENT_PENDING_PAYMENT,
            Auction.checkout_deadline_at.isnot(None),
            Auction.checkout_deadline_at < now,
        )
    ).all()
    n = 0
    for a in due:
        ranked = ranked_bidders_by_high_bid(db, a.id)
        fail_current_checkout(db, a, ranked, reason="payment_timeout")
        n += 1
    return n


def confirm_checkout_payment(
    db: Session,
    auction: Auction,
    actor_id: uuid.UUID,
    *,
    amount_cents: int | None = None,
) -> None:
    if auction.settlement_status != SETTLEMENT_PENDING_PAYMENT:
        raise ValueError("checkout_not_pending_payment")
    if auction.checkout_winner_id != actor_id:
        raise ValueError("not_allocated_winner")
    ranked = ranked_bidders_by_high_bid(db, auction.id)
    if auction.checkout_round >= len(ranked):
        raise ValueError("invalid_round")
    _winner_id, due = ranked[auction.checkout_round]
    if _winner_id != actor_id:
        raise ValueError("winner_mismatch")
    if amount_cents is not None and amount_cents != due:
        raise ValueError("amount_mismatch")

    auction.settlement_status = SETTLEMENT_PAID
    auction.checkout_deadline_at = None
    _broadcast(
        str(auction.id),
        {
            "event": "payment_success",
            "auction_id": str(auction.id),
            "winner_id": str(actor_id),
            "amount_cents": due,
            "settlement_status": SETTLEMENT_PAID,
            "payment_state": "paid_success",
        },
    )


def confirm_checkout_delivery(db: Session, auction: Auction, seller_id: uuid.UUID) -> None:
    if auction.seller_id != seller_id:
        raise ValueError("not_seller")
    if auction.settlement_status != SETTLEMENT_PAID:
        raise ValueError("not_paid")

    seller = db.get(User, seller_id)
    if seller:
        seller.completed_sales_count += 1
        refresh_user_trust_score(db, seller)

    auction.settlement_status = SETTLEMENT_AWAITING_RATINGS
    _broadcast(
        str(auction.id),
        {
            "event": "delivery_confirmed",
            "auction_id": str(auction.id),
            "settlement_status": SETTLEMENT_AWAITING_RATINGS,
        },
    )


def declare_non_payment(db: Session, auction: Auction, actor_id: uuid.UUID) -> None:
    if auction.settlement_status != SETTLEMENT_PENDING_PAYMENT:
        raise ValueError("checkout_not_pending_payment")
    if auction.checkout_winner_id != actor_id:
        raise ValueError("not_allocated_winner")
    ranked = ranked_bidders_by_high_bid(db, auction.id)
    fail_current_checkout(db, auction, ranked, reason="buyer_declared_non_payment")


def maybe_complete_settlement_from_ratings(db: Session, auction_id: uuid.UUID) -> bool:
    """Phase 6 Step 15–16: after both parties leave feedback, close the loop."""
    auction = db.get(Auction, auction_id)
    if not auction or auction.settlement_status != SETTLEMENT_AWAITING_RATINGS:
        return False
    n = db.scalar(select(func.count()).where(Rating.auction_id == auction_id))
    if int(n or 0) < 2:
        return False
    auction.settlement_status = SETTLEMENT_COMPLETED
    _broadcast(
        str(auction.id),
        {
            "event": "settlement_completed",
            "auction_id": str(auction.id),
            "settlement_status": SETTLEMENT_COMPLETED,
        },
    )
    return True


def due_amount_cents(db: Session, auction: Auction) -> int | None:
    if auction.settlement_status != SETTLEMENT_PENDING_PAYMENT:
        return None
    ranked = ranked_bidders_by_high_bid(db, auction.id)
    if auction.checkout_round >= len(ranked):
        return None
    return ranked[auction.checkout_round][1]

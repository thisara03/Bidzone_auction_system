import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.auction import Auction
from app.models.bid import Bid
from app.services.ml_stub import bid_coach_text, win_probability_percent

router = APIRouter(prefix="/ai", tags=["ai-ml"])


def _auction_or_404(db: Session, auction_id: uuid.UUID) -> Auction:
    a = db.scalar(select(Auction).where(Auction.id == auction_id))
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")
    return a


def _min_next_and_seconds(a: Auction, db: Session) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    sec_left = max(0, int((a.ends_at - now).total_seconds()))
    n = db.scalar(select(func.count()).where(Bid.auction_id == a.id))
    count = int(n or 0)
    if count == 0:
        min_next = a.starting_price_cents
    else:
        min_next = a.current_high_cents + a.bid_increment_cents
    return min_next, sec_left


@router.get("/auctions/{auction_id}/win-probability")
def win_probability(
    auction_id: uuid.UUID,
    your_bid_cents: int = Query(..., gt=0),
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    """Diagram Phase 3 — placeholder until RandomForest model is trained."""
    a = _auction_or_404(db, auction_id)
    min_next, sec_left = _min_next_and_seconds(a, db)
    pct = win_probability_percent(your_bid_cents, min_next, sec_left)
    return {
        "auction_id": str(auction_id),
        "your_bid_cents": your_bid_cents,
        "min_next_bid_cents": min_next,
        "seconds_remaining": sec_left,
        "win_probability_percent": pct,
        "model": "heuristic-v1",
    }


@router.get("/auctions/{auction_id}/bid-coach")
def bid_coach(
    auction_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    """Diagram Phase 3 — agentic guidance stub (swap body for LLM + tool calls)."""
    a = _auction_or_404(db, auction_id)
    min_next, _ = _min_next_and_seconds(a, db)
    cat = "general"
    desc = (a.description or a.title or "").lower()
    if "laptop" in desc or "macbook" in desc:
        cat = "laptops"
    elif "watch" in desc or "rolex" in desc:
        cat = "watches"
    elif "art" in desc or "print" in desc:
        cat = "art"
    payload = bid_coach_text(cat, a.current_high_cents, min_next)
    return {"auction_id": str(auction_id), **payload, "provider": "stub-llm"}

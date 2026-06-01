import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import actor_uuid, idempotency_key_header
from app.core.config import settings
from app.core.lifecycle import schedule_coroutine
from app.db.session import get_db
from app.models.auction import Auction
from app.models.bid import Bid
from app.models.user import User
from app.schemas.auction import AuctionCreate, AuctionRead
from app.schemas.bid import BidPlaceBody, BidRead
from app.services.anti_sniping import ensure_participant, is_anti_sniping_locked, is_participant
from app.services.ws_manager import auction_ws_manager

router = APIRouter(prefix="/auctions", tags=["auctions"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("", response_model=list[AuctionRead])
def list_auctions(db: Session = Depends(get_db)) -> list[Auction]:
    rows = db.scalars(select(Auction).order_by(Auction.ends_at.asc())).all()
    return list(rows)


@router.get("/{auction_id}", response_model=AuctionRead)
def get_auction(auction_id: uuid.UUID, db: Session = Depends(get_db)) -> Auction:
    auction = db.scalar(select(Auction).where(Auction.id == auction_id))
    if not auction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")
    return auction


@router.post("", response_model=AuctionRead, status_code=status.HTTP_201_CREATED)
def create_auction(
    body: AuctionCreate,
    seller_id: uuid.UUID = Depends(actor_uuid),
    db: Session = Depends(get_db),
) -> Auction:
    if body.ends_at <= _utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be in the future.")

    user = db.scalar(select(User).where(User.id == seller_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.role != "seller":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only sellers can create auctions.")

    if not user.seller_verified and not settings.allow_unverified_sellers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller identity verification required before listing.",
        )

    auction = Auction(
        seller_id=user.id,
        title=body.title.strip(),
        description=body.description.strip() if body.description else None,
        currency=body.currency.upper(),
        starting_price_cents=body.starting_price_cents,
        current_high_cents=body.starting_price_cents,
        bid_increment_cents=body.bid_increment_cents,
        reserve_cents=body.reserve_cents,
        ends_at=body.ends_at,
        anti_sniping_minutes=body.anti_sniping_minutes,
        payment_window_minutes=body.payment_window_minutes,
        status="live",
    )
    db.add(auction)
    db.commit()
    db.refresh(auction)
    return auction


def _min_required_bid_cents(db: Session, auction: Auction) -> int:
    n = db.scalar(select(func.count()).where(Bid.auction_id == auction.id))
    count = int(n or 0)
    if count == 0:
        return auction.starting_price_cents
    return auction.current_high_cents + auction.bid_increment_cents


@router.post("/{auction_id}/bids", response_model=BidRead)
def place_bid(
    auction_id: uuid.UUID,
    body: BidPlaceBody,
    db: Session = Depends(get_db),
    bidder_id: uuid.UUID = Depends(actor_uuid),
    idempotency_key: str = Depends(idempotency_key_header),
) -> Bid:
    existing = db.scalar(
        select(Bid).where(
            Bid.auction_id == auction_id,
            Bid.bidder_id == bidder_id,
            Bid.idempotency_key == idempotency_key,
        )
    )
    if existing:
        return existing

    try:
        auction = db.scalar(select(Auction).where(Auction.id == auction_id).with_for_update())
        if not auction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")

        if auction.status != "live":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Auction is not accepting bids.")

        if auction.ends_at <= _utcnow():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Auction has ended.")

        if auction.seller_id == bidder_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller cannot bid on own auction.")

        bidder = db.scalar(select(User).where(User.id == bidder_id))
        if not bidder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bidder user not found.")

        if is_anti_sniping_locked(auction) and not is_participant(db, auction.id, bidder_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Anti-sniping window: only bidders who joined the auction room (or placed a bid) "
                    "before the final window may continue bidding."
                ),
            )

        min_cents = _min_required_bid_cents(db, auction)
        if body.amount_cents < min_cents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bid too low. Minimum required is {min_cents} cents.",
            )

        bid = Bid(
            auction_id=auction.id,
            bidder_id=bidder_id,
            amount_cents=body.amount_cents,
            idempotency_key=idempotency_key,
        )
        db.add(bid)
        auction.current_high_cents = body.amount_cents
        ensure_participant(db, auction.id, bidder_id)
        db.flush()

        aid_str = str(auction.id)
        bid_id_str = str(bid.id)
        high_cents = auction.current_high_cents
        locked = is_anti_sniping_locked(auction)

        db.commit()
        db.refresh(bid)

        schedule_coroutine(
            auction_ws_manager.broadcast_json(
                aid_str,
                {
                    "event": "bid_placed",
                    "auction_id": aid_str,
                    "bid_id": bid_id_str,
                    "bidder_id": str(bidder_id),
                    "amount_cents": body.amount_cents,
                    "current_high_cents": high_cents,
                    "anti_sniping_locked": locked,
                },
            )
        )
        return bid

    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        dup = db.scalar(
            select(Bid).where(
                Bid.auction_id == auction_id,
                Bid.bidder_id == bidder_id,
                Bid.idempotency_key == idempotency_key,
            )
        )
        if dup:
            return dup
        raise

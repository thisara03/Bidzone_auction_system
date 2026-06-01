"""Phase 5 checkout API — Phase 6 trust updates run via settlement + trust_sync."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import actor_uuid
from app.db.session import get_db
from app.models.auction import Auction
from app.schemas.settlement import ConfirmPaymentBody, SettlementRead
from app.services.settlement import due_amount_cents, SETTLEMENT_PENDING_PAYMENT
from app.services.settlement import confirm_checkout_delivery as confirm_delivery_svc
from app.services.settlement import confirm_checkout_payment as confirm_payment_svc
from app.services.settlement import declare_non_payment as declare_non_payment_svc

router = APIRouter(prefix="/auctions", tags=["settlement-checkout"])


def _err(exc: ValueError) -> HTTPException:
    code = exc.args[0] if exc.args else "invalid"
    mapping: dict[str, tuple[int, str]] = {
        "checkout_not_pending_payment": (status.HTTP_409_CONFLICT, "Checkout is not awaiting payment."),
        "not_allocated_winner": (status.HTTP_403_FORBIDDEN, "Only the allocated winner can perform this action."),
        "invalid_round": (status.HTTP_409_CONFLICT, "Allocation state is inconsistent."),
        "winner_mismatch": (status.HTTP_409_CONFLICT, "Winner does not match current round."),
        "amount_mismatch": (status.HTTP_400_BAD_REQUEST, "amount_cents does not match the obligation for this round."),
        "not_seller": (status.HTTP_403_FORBIDDEN, "Only the listing seller can confirm delivery."),
        "not_paid": (status.HTTP_409_CONFLICT, "Payment must be completed before delivery confirmation."),
    }
    st, detail = mapping.get(code, (status.HTTP_400_BAD_REQUEST, code))
    return HTTPException(status_code=st, detail=detail)


@router.get("/{auction_id}/settlement", response_model=SettlementRead)
def get_settlement(auction_id: uuid.UUID, db: Session = Depends(get_db)) -> SettlementRead:
    auction = db.scalar(select(Auction).where(Auction.id == auction_id))
    if not auction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")
    due = due_amount_cents(db, auction) if auction.settlement_status == SETTLEMENT_PENDING_PAYMENT else None
    return SettlementRead(
        auction_id=auction.id,
        settlement_status=auction.settlement_status,
        checkout_winner_id=auction.checkout_winner_id,
        checkout_deadline_at=auction.checkout_deadline_at,
        checkout_round=auction.checkout_round,
        payment_window_minutes=auction.payment_window_minutes,
        amount_due_cents=due,
    )


@router.post("/{auction_id}/settlement/confirm-payment", response_model=SettlementRead)
def confirm_payment(
    auction_id: uuid.UUID,
    body: ConfirmPaymentBody,
    db: Session = Depends(get_db),
    actor_id: uuid.UUID = Depends(actor_uuid),
) -> SettlementRead:
    auction = db.scalar(select(Auction).where(Auction.id == auction_id))
    if not auction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")
    try:
        confirm_payment_svc(db, auction, actor_id, amount_cents=body.amount_cents)
        db.commit()
    except ValueError as e:
        db.rollback()
        raise _err(e) from e
    db.refresh(auction)
    return SettlementRead(
        auction_id=auction.id,
        settlement_status=auction.settlement_status,
        checkout_winner_id=auction.checkout_winner_id,
        checkout_deadline_at=auction.checkout_deadline_at,
        checkout_round=auction.checkout_round,
        payment_window_minutes=auction.payment_window_minutes,
        amount_due_cents=None,
    )


@router.post("/{auction_id}/settlement/declare-non-payment", response_model=SettlementRead)
def declare_non_payment(
    auction_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor_id: uuid.UUID = Depends(actor_uuid),
) -> SettlementRead:
    auction = db.scalar(select(Auction).where(Auction.id == auction_id))
    if not auction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")
    try:
        declare_non_payment_svc(db, auction, actor_id)
        db.commit()
    except ValueError as e:
        db.rollback()
        raise _err(e) from e
    db.refresh(auction)
    due = due_amount_cents(db, auction) if auction.settlement_status == SETTLEMENT_PENDING_PAYMENT else None
    return SettlementRead(
        auction_id=auction.id,
        settlement_status=auction.settlement_status,
        checkout_winner_id=auction.checkout_winner_id,
        checkout_deadline_at=auction.checkout_deadline_at,
        checkout_round=auction.checkout_round,
        payment_window_minutes=auction.payment_window_minutes,
        amount_due_cents=due,
    )


@router.post("/{auction_id}/settlement/confirm-delivery", response_model=SettlementRead)
def confirm_delivery(
    auction_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor_id: uuid.UUID = Depends(actor_uuid),
) -> SettlementRead:
    auction = db.scalar(select(Auction).where(Auction.id == auction_id))
    if not auction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found.")
    try:
        confirm_delivery_svc(db, auction, actor_id)
        db.commit()
    except ValueError as e:
        db.rollback()
        raise _err(e) from e
    db.refresh(auction)
    return SettlementRead(
        auction_id=auction.id,
        settlement_status=auction.settlement_status,
        checkout_winner_id=auction.checkout_winner_id,
        checkout_deadline_at=auction.checkout_deadline_at,
        checkout_round=auction.checkout_round,
        payment_window_minutes=auction.payment_window_minutes,
        amount_due_cents=None,
    )

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Auction(Base):
    __tablename__ = "auctions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    starting_price_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    current_high_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    bid_increment_cents: Mapped[int] = mapped_column(BigInteger, default=100, nullable=False)
    reserve_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)
    """Minutes before ends_at when new auction-room entrants / first-time bidders are blocked (Phase 4)."""
    anti_sniping_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Phase 5–6: cascading allocation & checkout (see app.services.settlement)
    settlement_status: Mapped[str] = mapped_column(String(32), default="none", nullable=False)
    checkout_winner_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    checkout_deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checkout_round: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payment_window_minutes: Mapped[int] = mapped_column(Integer, default=2880, nullable=False)

    seller: Mapped["User"] = relationship("User", foreign_keys=[seller_id], back_populates="auctions")
    checkout_winner: Mapped["User | None"] = relationship("User", foreign_keys=[checkout_winner_id])
    bids: Mapped[list["Bid"]] = relationship("Bid", back_populates="auction")
    participants: Mapped[list["AuctionParticipant"]] = relationship(
        "AuctionParticipant",
        back_populates="auction",
        cascade="all, delete-orphan",
    )

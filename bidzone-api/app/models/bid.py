from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Uuid, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Bid(Base):
    __tablename__ = "bids"
    __table_args__ = (UniqueConstraint("auction_id", "bidder_id", "idempotency_key", name="uq_bid_idempotency"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auction_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("auctions.id"), nullable=False)
    bidder_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    auction: Mapped[Auction] = relationship("Auction", back_populates="bids")
    bidder: Mapped[User] = relationship("User", back_populates="bids")

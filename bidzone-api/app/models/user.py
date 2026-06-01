from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    """E.164, e.g. +94771234567 — set after successful SMS verify."""
    phone_e164: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    role: Mapped[str] = mapped_column(String(20), default="bidder", nullable=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    seller_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    trust_score: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0.5000"), nullable=False)
    """Phase 6: buyers who win then fail to pay (timeout or explicit bail)."""
    unpaid_win_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    """Phase 6: seller deliveries completed after paid checkout (increment on confirm-delivery)."""
    completed_sales_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    auctions: Mapped[list["Auction"]] = relationship("Auction", back_populates="seller")
    bids: Mapped[list["Bid"]] = relationship("Bid", back_populates="bidder")

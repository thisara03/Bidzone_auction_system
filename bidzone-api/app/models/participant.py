from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuctionParticipant(Base):
    __tablename__ = "auction_participants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auction_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("auctions.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    auction: Mapped["Auction"] = relationship("Auction", back_populates="participants")

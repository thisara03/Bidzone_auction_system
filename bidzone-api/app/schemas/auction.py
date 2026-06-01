from datetime import datetime, timedelta, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field


class AuctionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    seller_id: UUID
    title: str
    description: str | None
    currency: str
    starting_price_cents: int
    current_high_cents: int
    bid_increment_cents: int
    reserve_cents: int | None
    ends_at: datetime
    status: str
    anti_sniping_minutes: int
    created_at: datetime
    settlement_status: str = "none"
    checkout_winner_id: UUID | None = None
    checkout_deadline_at: datetime | None = None
    checkout_round: int = 0
    payment_window_minutes: int = 2880

    @computed_field
    def anti_sniping_locked(self) -> bool:
        """Phase 4: new entrants blocked inside final window before close."""
        now = datetime.now(timezone.utc)
        if now >= self.ends_at:
            return True
        cutoff = self.ends_at - timedelta(minutes=max(0, self.anti_sniping_minutes))
        return now >= cutoff


class AuctionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    starting_price_cents: int = Field(..., gt=0)
    bid_increment_cents: int = Field(default=100, gt=0)
    reserve_cents: int | None = Field(default=None, gt=0)
    ends_at: datetime = Field(..., description="ISO-8601 end time; must be in the future.")
    anti_sniping_minutes: int = Field(default=15, ge=0, le=24 * 60)
    payment_window_minutes: int = Field(
        default=2880,
        ge=5,
        le=60 * 24 * 14,
        description="Minutes the allocated winner has to pay before cascade to the next bidder (Phase 5).",
    )

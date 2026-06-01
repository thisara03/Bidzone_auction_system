from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    auction_id: UUID
    settlement_status: str
    checkout_winner_id: UUID | None
    checkout_deadline_at: datetime | None
    checkout_round: int
    payment_window_minutes: int
    amount_due_cents: int | None = None
    trust_model: str = Field(default="behavior-blend-v1")


class ConfirmPaymentBody(BaseModel):
    amount_cents: int | None = Field(default=None, gt=0, description="Optional; must match high bid for this round.")

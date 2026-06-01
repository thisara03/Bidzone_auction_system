from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BidPlaceBody(BaseModel):
    amount_cents: int = Field(..., gt=0)


class BidRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auction_id: UUID
    bidder_id: UUID
    amount_cents: int
    created_at: datetime

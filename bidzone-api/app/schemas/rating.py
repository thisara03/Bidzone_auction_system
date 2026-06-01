from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RatingCreate(BaseModel):
    ratee_id: UUID
    stars: int = Field(..., ge=1, le=5)
    comment: str | None = None
    auction_id: UUID | None = None


class RatingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rater_id: UUID
    ratee_id: UUID
    auction_id: UUID | None
    stars: int
    comment: str | None
    created_at: datetime

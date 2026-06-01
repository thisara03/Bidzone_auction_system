from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=200)
    role: str = Field(default="bidder", pattern="^(bidder|seller)$")
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str | None
    phone_e164: str | None = None
    role: str
    phone_verified: bool
    seller_verified: bool
    trust_score: float
    unpaid_win_count: int = 0
    completed_sales_count: int = 0
    created_at: datetime

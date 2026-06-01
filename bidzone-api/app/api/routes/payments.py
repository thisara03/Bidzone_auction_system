"""Diagram: Payment & escrow — stubs until Stripe / Adyen / local FI.

Allocation and payment *state machine* lives under ``/auctions/{{id}}/settlement`` (Phase 5).
"""

import uuid

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/payments", tags=["payments-checkout"])


class EscrowIntentBody(BaseModel):
    auction_id: uuid.UUID
    buyer_id: uuid.UUID
    amount_cents: int = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)


@router.post("/escrow/intents", status_code=status.HTTP_201_CREATED)
def create_escrow_intent(body: EscrowIntentBody) -> dict[str, str]:
    """Returns a fake intent id — wire PSP + ledger tables next."""
    intent_id = str(uuid.uuid4())
    return {
        "status": "requires_payment_method",
        "escrow_intent_id": intent_id,
        "message": "Demo stub: connect Stripe or a licensed escrow partner.",
    }

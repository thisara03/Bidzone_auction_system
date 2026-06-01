"""Email: SendGrid when configured; otherwise logs. WebSockets stay on /ws/…."""

import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import actor_uuid
from app.db.session import get_db
from app.services.email_sendgrid import send_email_text
from app.services.push_fcm_stub import register_device_token

router = APIRouter(prefix="/notifications", tags=["notifications"])
log = logging.getLogger("bidzone.notify")


class EmailEnqueueBody(BaseModel):
    to: EmailStr
    subject: str = Field(..., max_length=200)
    body: str = Field(..., max_length=8000)


class PushRegisterBody(BaseModel):
    token: str = Field(..., min_length=10, max_length=512)
    platform: str = Field(..., pattern="^(android|ios|web)$")


@router.post("/email/send", status_code=status.HTTP_202_ACCEPTED)
def send_transactional_email(payload: EmailEnqueueBody) -> dict[str, str]:
    """Uses SendGrid when SENDGRID_API_KEY + SENDGRID_FROM_EMAIL are set; else demo log only."""
    try:
        ok = send_email_text(to_email=str(payload.to), subject=payload.subject, body_text=payload.body)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="SendGrid rejected the request. Check API key and verified sender.",
        ) from e
    if ok:
        return {"status": "sent", "detail": "Accepted by SendGrid."}
    log.info("email_demo_fallback to=%s subject=%s", payload.to, payload.subject)
    return {"status": "queued_demo", "detail": "SendGrid not configured; check server logs only."}


@router.post("/email/enqueue-demo", status_code=status.HTTP_202_ACCEPTED)
def enqueue_email_demo(payload: EmailEnqueueBody) -> dict[str, str]:
    """Deprecated alias — calls the same path as /email/send."""
    return send_transactional_email(payload)


@router.post("/push/register", status_code=status.HTTP_201_CREATED)
def register_push_token(
    body: PushRegisterBody,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(actor_uuid),
) -> dict[str, str]:
    """Persist FCM/APNs token; actual push send is not implemented until you add Firebase credentials."""
    register_device_token(db, user_id=user_id, token=body.token, platform=body.platform)
    db.commit()
    return {"status": "registered", "detail": "Token stored; wire FCM send from auction events when ready."}

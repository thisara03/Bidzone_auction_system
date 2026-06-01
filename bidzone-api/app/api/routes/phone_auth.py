"""SMS OTP: requires logged-in user (Bearer or X-User-Id). You add Twilio keys in .env."""

from __future__ import annotations

import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import actor_uuid
from app.db.session import get_db
from app.schemas.phone_auth import PhoneSendCodeBody, PhoneVerifyBody
from app.services.phone_verification import client_ip_from_request, send_code_for_user, verify_code_for_user

router = APIRouter(prefix="/auth/phone", tags=["auth-phone"])


def _map_phone_error(exc: ValueError) -> HTTPException:
    code = exc.args[0] if exc.args else "error"
    table: dict[str, tuple[int, str]] = {
        "invalid_e164": (status.HTTP_400_BAD_REQUEST, "Phone must be in E.164 format (e.g. +94771234567)."),
        "rate_limit_phone": (status.HTTP_429_TOO_MANY_REQUESTS, "Too many codes sent to this number. Try later."),
        "rate_limit_ip": (status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests from this network. Try later."),
        "phone_taken": (status.HTTP_409_CONFLICT, "This phone number is already verified on another account."),
        "sms_not_configured": (
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "SMS is not configured. Set TWILIO_* in .env or enable SMS_DEMO_LOG_CODE for development.",
        ),
        "no_active_otp": (status.HTTP_400_BAD_REQUEST, "No active verification code. Request a new code."),
        "otp_expired": (status.HTTP_400_BAD_REQUEST, "Code expired. Request a new code."),
        "wrong_code": (status.HTTP_400_BAD_REQUEST, "Invalid verification code."),
        "invalid_code_format": (status.HTTP_400_BAD_REQUEST, "Code must be 6 digits."),
        "too_many_attempts": (status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Request a new code."),
        "user_missing": (status.HTTP_404_NOT_FOUND, "User not found."),
    }
    st, detail = table.get(code, (status.HTTP_400_BAD_REQUEST, code))
    return HTTPException(status_code=st, detail=detail)


@router.post("/send-code", status_code=status.HTTP_202_ACCEPTED)
def send_verification_code(
    request: Request,
    body: PhoneSendCodeBody,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(actor_uuid),
) -> dict[str, str]:
    ip = client_ip_from_request(
        request.client.host if request.client else None,
        request.headers.get("x-forwarded-for"),
    )
    try:
        send_code_for_user(db, user_id=user_id, phone_e164=body.phone_e164, sender_ip=ip)
        db.commit()
    except ValueError as e:
        db.rollback()
        raise _map_phone_error(e) from e
    except httpx.HTTPError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="SMS provider error. Check Twilio credentials and sender number.",
        ) from e
    except RuntimeError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return {"status": "sent", "detail": "If Twilio is configured, an SMS was sent. Otherwise check server logs (demo mode)."}


@router.post("/verify", status_code=status.HTTP_200_OK)
def verify_phone_code(
    body: PhoneVerifyBody,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(actor_uuid),
) -> dict[str, str]:
    try:
        verify_code_for_user(db, user_id=user_id, phone_e164=body.phone_e164, code=body.code)
        db.commit()
    except ValueError as e:
        db.rollback()
        raise _map_phone_error(e) from e
    return {"status": "verified", "detail": "phone_verified is now true for this account."}

"""OTP generation, storage, rate limits, Twilio hook."""

from __future__ import annotations

import hmac
import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.phone_otp import PhoneOtp
from app.models.user import User
from app.services.sms_twilio import send_otp_sms_or_demo, twilio_configured

E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_and_validate_e164(phone: str) -> str:
    p = phone.strip().replace(" ", "")
    if not E164_RE.match(p):
        raise ValueError("invalid_e164")
    return p


def hash_otp(phone_e164: str, code: str) -> str:
    key = settings.otp_hmac_secret.encode("utf-8")
    msg = f"{phone_e164}|{code}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def generate_six_digit_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def client_ip_from_request(client_host: str | None, x_forwarded_for: str | None) -> str:
    if settings.trust_proxy_for_client_ip and x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()[:45]
    return (client_host or "unknown")[:45]


def count_sends_phone_hour(db: Session, phone_e164: str) -> int:
    since = utcnow() - timedelta(hours=1)
    n = db.scalar(
        select(func.count())
        .select_from(PhoneOtp)
        .where(PhoneOtp.phone_e164 == phone_e164, PhoneOtp.created_at >= since)
    )
    return int(n or 0)


def count_sends_ip_hour(db: Session, sender_ip: str) -> int:
    if sender_ip in ("unknown", ""):
        return 0
    since = utcnow() - timedelta(hours=1)
    n = db.scalar(
        select(func.count())
        .select_from(PhoneOtp)
        .where(PhoneOtp.sender_ip == sender_ip, PhoneOtp.created_at >= since)
    )
    return int(n or 0)


def clear_pending_otps(db: Session, user_id: uuid.UUID, phone_e164: str) -> None:
    db.execute(
        delete(PhoneOtp).where(
            PhoneOtp.user_id == user_id,
            PhoneOtp.phone_e164 == phone_e164,
            PhoneOtp.consumed_at.is_(None),
        )
    )


def send_code_for_user(
    db: Session,
    *,
    user_id: uuid.UUID,
    phone_e164: str,
    sender_ip: str,
) -> None:
    phone_e164 = normalize_and_validate_e164(phone_e164)

    if count_sends_phone_hour(db, phone_e164) >= settings.otp_max_sends_per_phone_hour:
        raise ValueError("rate_limit_phone")
    if count_sends_ip_hour(db, sender_ip) >= settings.otp_max_sends_per_ip_hour:
        raise ValueError("rate_limit_ip")

    other = db.scalar(
        select(User).where(User.phone_e164 == phone_e164, User.id != user_id)
    )
    if other:
        raise ValueError("phone_taken")

    if not twilio_configured() and not settings.sms_demo_log_code:
        raise ValueError("sms_not_configured")

    code = generate_six_digit_code()
    code_hash = hash_otp(phone_e164, code)
    expires_at = utcnow() + timedelta(minutes=settings.otp_ttl_minutes)

    clear_pending_otps(db, user_id, phone_e164)
    row = PhoneOtp(
        user_id=user_id,
        phone_e164=phone_e164,
        code_hash=code_hash,
        expires_at=expires_at,
        sender_ip=sender_ip,
    )
    db.add(row)
    db.flush()
    try:
        send_otp_sms_or_demo(phone_e164, code)
    except Exception:
        db.delete(row)
        raise


def verify_code_for_user(
    db: Session,
    *,
    user_id: uuid.UUID,
    phone_e164: str,
    code: str,
) -> None:
    phone_e164 = normalize_and_validate_e164(phone_e164)
    code = code.strip()
    if not (code.isdigit() and len(code) == 6):
        raise ValueError("invalid_code_format")

    row = db.scalar(
        select(PhoneOtp)
        .where(
            PhoneOtp.user_id == user_id,
            PhoneOtp.phone_e164 == phone_e164,
            PhoneOtp.consumed_at.is_(None),
        )
        .order_by(PhoneOtp.created_at.desc())
        .limit(1)
    )
    if not row:
        raise ValueError("no_active_otp")

    if utcnow() > row.expires_at:
        raise ValueError("otp_expired")

    if row.wrong_attempts >= settings.otp_max_wrong_attempts:
        raise ValueError("too_many_attempts")

    expect = hash_otp(phone_e164, code)
    if not hmac.compare_digest(expect, row.code_hash):
        row.wrong_attempts += 1
        raise ValueError("wrong_code")

    user = db.get(User, user_id)
    if not user:
        raise ValueError("user_missing")

    taken = db.scalar(select(User).where(User.phone_e164 == phone_e164, User.id != user_id))
    if taken:
        raise ValueError("phone_taken")

    row.consumed_at = utcnow()
    user.phone_e164 = phone_e164
    user.phone_verified = True

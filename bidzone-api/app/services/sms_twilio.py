"""Send SMS via Twilio REST API (httpx). You add SID/token/from in .env."""

from __future__ import annotations

import base64
import logging

import httpx

from app.core.config import settings

log = logging.getLogger("bidzone.sms")


def twilio_configured() -> bool:
    return bool(
        settings.twilio_account_sid.strip()
        and settings.twilio_auth_token.strip()
        and settings.twilio_from_number.strip()
    )


def send_sms_e164(to_e164: str, body: str) -> None:
    """POST to Twilio Messages API. Raises httpx.HTTPError on failure."""
    sid = settings.twilio_account_sid.strip()
    token = settings.twilio_auth_token.strip()
    from_num = settings.twilio_from_number.strip()
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    basic = base64.b64encode(f"{sid}:{token}".encode()).decode()
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            url,
            headers={"Authorization": f"Basic {basic}"},
            data={"To": to_e164, "From": from_num, "Body": body},
        )
        r.raise_for_status()


def send_otp_sms_or_demo(to_e164: str, code: str, app_name: str = "BidZone") -> None:
    body = f"{app_name} verification code: {code}. It expires in {settings.otp_ttl_minutes} minutes."
    if twilio_configured():
        send_sms_e164(to_e164, body)
        log.info("sms_sent to=%s", to_e164)
        return
    if settings.sms_demo_log_code:
        log.warning(
            "SMS not configured (set TWILIO_* in .env). DEMO log only — to=%s (code redacted in prod logs)",
            to_e164,
        )
        log.warning("DEMO_OTP_CODE to=%s code=%s", to_e164, code)
        return
    raise RuntimeError("Twilio is not configured and sms_demo_log_code is false.")

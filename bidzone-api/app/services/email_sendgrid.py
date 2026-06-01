"""Transactional email via SendGrid v3 API. You add SENDGRID_API_KEY + SENDGRID_FROM_EMAIL in .env."""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

log = logging.getLogger("bidzone.email")


def sendgrid_configured() -> bool:
    return bool(settings.sendgrid_api_key.strip() and settings.sendgrid_from_email.strip())


def send_email_text(*, to_email: str, subject: str, body_text: str) -> bool:
    """Returns True if SendGrid accepted the message."""
    if not sendgrid_configured():
        log.info("email_skip_sendgrid_not_configured to=%s subject=%s", to_email, subject)
        return False
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": settings.sendgrid_from_email.strip()},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body_text}],
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {settings.sendgrid_api_key.strip()}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code >= 400:
            log.error("sendgrid_error status=%s body=%s", r.status_code, r.text[:500])
            r.raise_for_status()
    log.info("email_sent to=%s subject=%s", to_email, subject)
    return True

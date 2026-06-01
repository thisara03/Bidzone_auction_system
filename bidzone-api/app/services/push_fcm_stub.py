"""Store FCM/APNs device tokens; sending is not implemented (add Firebase Admin SDK + FIREBASE_* later)."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device_token import DeviceToken

log = logging.getLogger("bidzone.push")


def register_device_token(db: Session, *, user_id: uuid.UUID, token: str, platform: str) -> None:
    p = platform.strip().lower()
    if p not in ("android", "ios", "web"):
        raise ValueError("invalid_platform")

    t = token.strip()
    row = db.scalar(select(DeviceToken).where(DeviceToken.user_id == user_id, DeviceToken.token == t))
    if row:
        row.platform = p
    else:
        db.add(DeviceToken(user_id=user_id, token=t, platform=p))
    log.info("device_token_registered user=%s platform=%s", user_id, p)


def list_tokens_for_user(db: Session, user_id: uuid.UUID) -> list[str]:
    rows = db.scalars(select(DeviceToken.token).where(DeviceToken.user_id == user_id)).all()
    return list(rows)

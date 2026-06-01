"""Recompute trust_score from stars + Phase 6 behavioral counters (ML blend stub)."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.rating import Rating
from app.models.user import User
from app.services.ml_stub import composite_trust_score


def refresh_user_trust_score(db: Session, user: User) -> None:
    avg = db.scalar(select(func.avg(Rating.stars)).where(Rating.ratee_id == user.id))
    avg_f = float(avg) if avg is not None else None
    user.trust_score = composite_trust_score(avg_f, user.unpaid_win_count, user.completed_sales_count)

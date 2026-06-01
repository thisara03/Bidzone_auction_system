"""Diagram: Trust & rating engine — star ratings + simple trust_score rollup (ML stub)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import actor_uuid
from app.db.session import get_db
from app.models.rating import Rating
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingRead
from app.services.settlement import maybe_complete_settlement_from_ratings
from app.services.trust_sync import refresh_user_trust_score

router = APIRouter(prefix="/trust", tags=["trust-ratings"])


@router.post("/ratings", response_model=RatingRead, status_code=status.HTTP_201_CREATED)
def submit_rating(
    body: RatingCreate,
    db: Session = Depends(get_db),
    rater_id: uuid.UUID = Depends(actor_uuid),
) -> Rating:
    if body.ratee_id == rater_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot rate yourself.")

    ratee = db.scalar(select(User).where(User.id == body.ratee_id))
    if not ratee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to rate not found.")

    rating = Rating(
        rater_id=rater_id,
        ratee_id=body.ratee_id,
        auction_id=body.auction_id,
        stars=body.stars,
        comment=body.comment.strip() if body.comment else None,
    )
    db.add(rating)
    db.flush()

    refresh_user_trust_score(db, ratee)
    if body.auction_id:
        maybe_complete_settlement_from_ratings(db, body.auction_id)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/users/{user_id}/rating-summary")
def rating_summary(user_id: uuid.UUID, db: Session = Depends(get_db)) -> dict[str, float | int | str]:
    u = db.scalar(select(User).where(User.id == user_id))
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    n = db.scalar(select(func.count()).where(Rating.ratee_id == user_id))
    avg = db.scalar(select(func.avg(Rating.stars)).where(Rating.ratee_id == user_id))
    return {
        "user_id": str(user_id),
        "review_count": int(n or 0),
        "avg_stars": float(avg) if avg is not None else 0.0,
        "trust_score": float(u.trust_score),
        "trust_model": "behavior-blend-v1",
        "unpaid_win_count": u.unpaid_win_count,
        "completed_sales_count": u.completed_sales_count,
    }

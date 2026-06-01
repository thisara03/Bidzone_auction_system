import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserRegister

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(body: UserRegister, db: Session = Depends(get_db)) -> User:
    user = User(
        id=uuid.uuid4(),
        email=body.email.lower().strip(),
        full_name=body.full_name,
        role=body.role,
        hashed_password=hash_password(body.password) if body.password else None,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        ) from e
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user

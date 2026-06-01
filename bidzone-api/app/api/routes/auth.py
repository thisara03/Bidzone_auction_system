from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token")
def login_access_token(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """OAuth2 password flow: `username` must be the user's email."""
    email = form.username.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.hashed_password or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    return {
        "access_token": create_access_token(str(user.id)),
        "token_type": "bearer",
    }

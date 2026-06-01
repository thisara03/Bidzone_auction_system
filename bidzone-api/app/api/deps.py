import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_subject_user_id

bearer_scheme = HTTPBearer(auto_error=False)


def actor_uuid(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> uuid.UUID:
    """Prefer Bearer JWT (diagram); fall back to X-User-Id for integration tests."""
    if creds and creds.credentials:
        try:
            sub = decode_subject_user_id(creds.credentials)
            return uuid.UUID(sub)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired bearer token.",
            ) from e
    if x_user_id and x_user_id.strip():
        try:
            return uuid.UUID(x_user_id.strip())
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="X-User-Id must be a UUID.",
            ) from e
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing Authorization: Bearer token or X-User-Id header.",
    )


def idempotency_key_header(
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> str:
    if not idempotency_key or not idempotency_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Idempotency-Key header.",
        )
    key = idempotency_key.strip()
    if len(key) > 80:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Idempotency-Key too long (max 80).")
    return key

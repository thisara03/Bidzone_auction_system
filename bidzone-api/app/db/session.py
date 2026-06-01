from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Avoid hanging forever on /health when MySQL/Postgres is down or misconfigured.
_connect_args: dict = {}
if "mysql" in settings.database_url_sync:
    _connect_args["connect_timeout"] = 8
elif "postgresql" in settings.database_url_sync:
    _connect_args["connect_timeout"] = 8

engine = create_engine(
    settings.database_url_sync,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=8,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

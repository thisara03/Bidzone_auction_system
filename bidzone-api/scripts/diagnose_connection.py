"""
Run from bidzone-api with venv active:
  python scripts/diagnose_connection.py

Shows whether MySQL accepts connections using the same URL as the API (.env).
"""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

# Ensure project root is on path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def mask_url(url: str) -> str:
    return re.sub(r"(://[^:]+:)([^@]+)(@)", r"\1***\3", url)


def main() -> None:
    from app.core.config import settings

    url = settings.database_url_sync
    print("DATABASE_URL_SYNC (masked):", mask_url(url))
    print()

    if "mysql" not in url:
        print("Expected mysql+pymysql URL. Fix .env")
        sys.exit(1)

    try:
        import pymysql
    except ImportError:
        print("pip install pymysql")
        sys.exit(1)

    # Parse minimal pieces from SQLAlchemy URL for a raw pymysql test
    from sqlalchemy.engine import make_url

    u = make_url(url)
    host = u.host or "127.0.0.1"
    port = u.port or 3306
    user = u.username or "bidzone"
    password = u.password or ""
    db = u.database or "bidzone"

    print(f"Connecting pymysql to {user}@{host}:{port}/{db} (connect_timeout=5)...")
    t0 = time.perf_counter()
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db,
            connect_timeout=5,
            read_timeout=5,
            write_timeout=5,
        )
    except Exception as e:
        print(f"FAIL ({time.perf_counter() - t0:.1f}s): {type(e).__name__}: {e}")
        print()
        print("Fix: start MySQL, create DB/user, match .env (see scripts/init_bidzone_mysql_native.sql).")
        sys.exit(2)

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            row = cur.fetchone()
        print(f"OK ({time.perf_counter() - t0:.1f}s): SELECT 1 => {row}")
    finally:
        conn.close()

    print()
    print("MySQL is fine. Next: python -c \"import app.main; print('import ok')\"")
    print("Then: uvicorn app.main:app --host 127.0.0.1 --port 8000")


if __name__ == "__main__":
    main()

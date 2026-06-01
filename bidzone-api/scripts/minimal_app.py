"""Tiny FastAPI app — no database. Proves Uvicorn + browser work.

  uvicorn scripts.minimal_app:app --host 127.0.0.1 --port 8001

Then open: http://127.0.0.1:8001/ping
"""
from fastapi import FastAPI

app = FastAPI()


@app.get("/ping")
def ping():
    return {"ok": True, "msg": "If you see this, Uvicorn and port are fine."}

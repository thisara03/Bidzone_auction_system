import asyncio
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import ai, auctions, auth, external, health, notifications, payments, phone_auth, settlement, trust, users
from app.core.config import settings
from app.core.lifecycle import set_main_loop
from app.db.session import SessionLocal
from app.models.auction import Auction
from app.services.anti_sniping import ensure_participant, is_anti_sniping_locked, is_participant
from app.services.anti_sniping import utcnow as sniping_utcnow
from app.services.auction_closer import close_expired_auctions
from app.services.ws_manager import auction_ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    set_main_loop(loop)
    stop = asyncio.Event()

    async def closer_tick() -> None:
        while not stop.is_set():
            await asyncio.sleep(30)
            await asyncio.to_thread(close_expired_auctions)

    task = asyncio.create_task(closer_tick())
    yield
    stop.set()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="BidZone API", version="0.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/alive", tags=["health"])
def alive() -> dict[str, str]:
    """Always returns immediately — use if /health/live misbehaves in the browser."""
    return {"status": "live"}


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    """Redirect root to the interactive docs."""
    return RedirectResponse(url="/docs")


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(phone_auth.router)
app.include_router(users.router)
app.include_router(auctions.router)
app.include_router(settlement.router)
app.include_router(ai.router)
app.include_router(payments.router)
app.include_router(trust.router)
app.include_router(notifications.router)
app.include_router(external.router)


@app.websocket("/ws/auctions/{auction_id}")
async def auction_room(websocket: WebSocket, auction_id: str) -> None:
    """Phase 3 room + Phase 4 lock: pass `user_id` query param to register as participant."""
    raw_uid = websocket.query_params.get("user_id")
    if not raw_uid:
        await websocket.close(code=4400)
        return
    try:
        aid = uuid.UUID(auction_id.strip())
        uid = uuid.UUID(raw_uid.strip())
    except ValueError:
        await websocket.close(code=4400)
        return

    db = SessionLocal()
    try:
        auction = db.scalar(select(Auction).where(Auction.id == aid))
        if not auction or auction.status != "live":
            await websocket.close(code=4404)
            return
        if auction.ends_at <= sniping_utcnow():
            await websocket.close(code=4408)
            return
        if is_anti_sniping_locked(auction) and not is_participant(db, auction.id, uid):
            await websocket.close(code=4403)
            return
        ensure_participant(db, auction.id, uid)
        db.commit()
    except Exception:
        db.rollback()
        await websocket.close(code=4500)
        return
    finally:
        db.close()

    await auction_ws_manager.connect(auction_id.strip(), websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"auction_id": auction_id, "event": "pong"})
    except WebSocketDisconnect:
        auction_ws_manager.disconnect(auction_id.strip(), websocket)

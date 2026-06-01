"""In-memory auction rooms (single process). Replace with Redis pub/sub when you scale horizontally."""

from fastapi import WebSocket


class AuctionRoomManager:
    def __init__(self) -> None:
        self._rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, auction_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        aid = auction_id.strip()
        self._rooms.setdefault(aid, []).append(websocket)

    def disconnect(self, auction_id: str, websocket: WebSocket) -> None:
        aid = auction_id.strip()
        if aid not in self._rooms:
            return
        self._rooms[aid] = [ws for ws in self._rooms[aid] if ws is not websocket]
        if not self._rooms[aid]:
            del self._rooms[aid]

    async def broadcast_json(self, auction_id: str, payload: dict) -> None:
        aid = auction_id.strip()
        clients = list(self._rooms.get(aid, []))
        stale: list[WebSocket] = []
        for ws in clients:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(aid, ws)


auction_ws_manager = AuctionRoomManager()

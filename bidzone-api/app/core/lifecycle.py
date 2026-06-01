"""Keeps reference to the main asyncio loop for scheduling WS broadcasts from sync DB routes."""

import asyncio
from typing import Any


_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def schedule_coroutine(coro: Any) -> None:
    """Fire-and-forget broadcast from a sync FastAPI route (runs in threadpool)."""
    loop = _loop
    if loop is None:
        asyncio.run(coro)
        return
    asyncio.run_coroutine_threadsafe(coro, loop)

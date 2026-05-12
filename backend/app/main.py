from __future__ import annotations

import json
import logging
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .config import get_settings
from .providers import get_provider
from .schemas import ChatRequest, HealthResponse

logger = logging.getLogger("ai_chat_app")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="AI Chat App", version="1.0.0")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        provider=settings.provider,
        model=settings.default_model(),
    )


@app.post("/chat")
async def chat(payload: ChatRequest, request: Request) -> EventSourceResponse:
    """Stream a chat completion via Server-Sent Events.

    The response is a sequence of SSE events whose `data` is a JSON object:

      { "type": "token",       "delta": "..." }
      { "type": "tool_call",   "id": "...", "name": "...", "args": {...} }
      { "type": "tool_result", "id": "...", "name": "...", "result": ... }
      { "type": "done" }
      { "type": "error",       "message": "..." }
    """

    try:
        provider = get_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def event_generator() -> AsyncIterator[dict]:
        try:
            async for event in provider.stream(
                payload.messages,
                model=payload.model,
                temperature=payload.temperature,
            ):
                if await request.is_disconnected():
                    logger.info("client disconnected; aborting stream")
                    return
                yield {"data": json.dumps(event, default=str)}
        except Exception as exc:  # noqa: BLE001
            logger.exception("stream failed")
            yield {
                "data": json.dumps(
                    {"type": "error", "message": f"{type(exc).__name__}: {exc}"}
                )
            }

    return EventSourceResponse(event_generator(), ping=15)

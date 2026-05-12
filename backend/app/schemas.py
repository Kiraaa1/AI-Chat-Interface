from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["system", "user", "assistant"]


class ChatMessage(BaseModel):
    """A single message in the conversation history coming from the client.

    The client only sends user/assistant/system turns; tool round-trips happen
    server-side and never need to be persisted by the frontend.
    """

    role: Role
    content: str = Field(..., min_length=0)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    model: str | None = Field(
        default=None,
        description="Override the server's default model. Provider is fixed via env.",
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    provider: str
    model: str


class TitleRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)


class TitleResponse(BaseModel):
    title: str

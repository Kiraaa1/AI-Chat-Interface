from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, TypedDict

from ..schemas import ChatMessage


class StreamEvent(TypedDict, total=False):
    """Unified event the provider yields up to the SSE layer."""

    type: str  # "token" | "tool_call" | "tool_result" | "done" | "error"
    delta: str
    name: str
    id: str
    args: dict[str, Any]
    result: Any
    message: str


class Provider(ABC):
    name: str = "base"

    def __init__(self, api_key: str, default_model: str) -> None:
        self.api_key = api_key
        self.default_model = default_model

    @abstractmethod
    def stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[StreamEvent]:
        """Yield streaming events. Tool calls are dispatched server-side and
        their results are folded back into the same stream transparently."""

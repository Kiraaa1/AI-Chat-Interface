from __future__ import annotations

import json
from typing import Any, AsyncIterator

from anthropic import AsyncAnthropic

from ..schemas import ChatMessage
from ..tools import anthropic_tool_specs, execute_tool
from .base import Provider, StreamEvent

SYSTEM_PROMPT = (
    "You are a helpful, concise assistant. When the user asks about current "
    "events, recent facts, or anything time-sensitive, call the `web_search` "
    "tool. When the user asks for the current time or date, call "
    "`get_current_time`. Otherwise, answer directly without calling tools."
)

MAX_TOOL_ROUNDS = 5
MAX_TOKENS = 2048


class AnthropicProvider(Provider):
    name = "anthropic"

    def __init__(self, api_key: str, default_model: str) -> None:
        super().__init__(api_key=api_key, default_model=default_model)
        self._client = AsyncAnthropic(api_key=api_key)

    async def complete(
        self,
        messages: list[ChatMessage],
        system: str | None = None,
        max_tokens: int = 256,
        temperature: float = 0.3,
    ) -> str:
        history: list[dict[str, Any]] = []
        for m in messages:
            if m.role == "system":
                continue
            history.append({"role": m.role, "content": m.content})

        kwargs: dict[str, Any] = {
            "model": self.default_model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": history,
        }
        if system:
            kwargs["system"] = system

        response = await self._client.messages.create(**kwargs)
        parts: list[str] = []
        for block in response.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "".join(parts).strip()

    async def stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[StreamEvent]:
        chosen_model = model or self.default_model
        tools = anthropic_tool_specs()

        system_chunks: list[str] = [SYSTEM_PROMPT]
        history: list[dict[str, Any]] = []
        for m in messages:
            if m.role == "system":
                system_chunks.append(m.content)
            else:
                history.append({"role": m.role, "content": m.content})

        system_prompt = "\n\n".join(c for c in system_chunks if c)

        for _round in range(MAX_TOOL_ROUNDS):
            blocks_by_index: dict[int, dict[str, Any]] = {}
            stop_reason: str | None = None

            async with self._client.messages.stream(
                model=chosen_model,
                max_tokens=MAX_TOKENS,
                system=system_prompt,
                messages=history,
                tools=tools,
                temperature=temperature,
            ) as stream:
                async for event in stream:
                    etype = getattr(event, "type", None)

                    if etype == "content_block_start":
                        block = event.content_block
                        if block.type == "text":
                            blocks_by_index[event.index] = {
                                "type": "text",
                                "text": "",
                            }
                        elif block.type == "tool_use":
                            blocks_by_index[event.index] = {
                                "type": "tool_use",
                                "id": block.id,
                                "name": block.name,
                                "input_json": "",
                            }

                    elif etype == "content_block_delta":
                        delta = event.delta
                        slot = blocks_by_index.get(event.index)
                        if slot is None:
                            continue
                        if delta.type == "text_delta":
                            slot["text"] += delta.text
                            yield {"type": "token", "delta": delta.text}
                        elif delta.type == "input_json_delta":
                            slot["input_json"] += delta.partial_json

                    elif etype == "message_delta":
                        if getattr(event.delta, "stop_reason", None):
                            stop_reason = event.delta.stop_reason

            if stop_reason != "tool_use":
                yield {"type": "done"}
                return

            assistant_content: list[dict[str, Any]] = []
            tool_uses: list[dict[str, Any]] = []
            for idx in sorted(blocks_by_index):
                slot = blocks_by_index[idx]
                if slot["type"] == "text":
                    if slot["text"]:
                        assistant_content.append(
                            {"type": "text", "text": slot["text"]}
                        )
                else:
                    try:
                        parsed = json.loads(slot["input_json"] or "{}")
                    except json.JSONDecodeError:
                        parsed = {}
                    block = {
                        "type": "tool_use",
                        "id": slot["id"],
                        "name": slot["name"],
                        "input": parsed,
                    }
                    assistant_content.append(block)
                    tool_uses.append(block)

            history.append({"role": "assistant", "content": assistant_content})

            tool_results_content: list[dict[str, Any]] = []
            for tu in tool_uses:
                yield {
                    "type": "tool_call",
                    "id": tu["id"],
                    "name": tu["name"],
                    "args": tu["input"],
                }
                result = await execute_tool(tu["name"], tu["input"])
                yield {
                    "type": "tool_result",
                    "id": tu["id"],
                    "name": tu["name"],
                    "result": result,
                }
                tool_results_content.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tu["id"],
                        "content": json.dumps(result, default=str),
                    }
                )

            history.append({"role": "user", "content": tool_results_content})

        yield {
            "type": "error",
            "message": f"Exceeded max tool-call rounds ({MAX_TOOL_ROUNDS}).",
        }

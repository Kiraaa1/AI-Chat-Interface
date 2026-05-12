from __future__ import annotations

import json
from typing import Any, AsyncIterator

from openai import AsyncOpenAI

from ..schemas import ChatMessage
from ..tools import execute_tool, openai_tool_specs
from .base import Provider, StreamEvent

SYSTEM_PROMPT = (
    "You are a helpful, concise assistant. When the user asks about current "
    "events, recent facts, or anything time-sensitive, call the `web_search` "
    "tool. When the user asks for the current time or date, call "
    "`get_current_time`. Otherwise, answer directly without calling tools."
)

MAX_TOOL_ROUNDS = 5


class OpenAIProvider(Provider):
    name = "openai"

    def __init__(self, api_key: str, default_model: str) -> None:
        super().__init__(api_key=api_key, default_model=default_model)
        self._client = AsyncOpenAI(api_key=api_key)

    async def stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[StreamEvent]:
        chosen_model = model or self.default_model
        tools = openai_tool_specs()

        history: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in messages:
            history.append({"role": m.role, "content": m.content})

        for _round in range(MAX_TOOL_ROUNDS):
            stream = await self._client.chat.completions.create(
                model=chosen_model,
                messages=history,
                tools=tools,
                temperature=temperature,
                stream=True,
            )

            collected_text = ""
            tool_acc: dict[int, dict[str, str]] = {}
            finish_reason: str | None = None

            async for chunk in stream:
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                delta = choice.delta

                if delta and delta.content:
                    collected_text += delta.content
                    yield {"type": "token", "delta": delta.content}

                if delta and delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        slot = tool_acc.setdefault(
                            idx, {"id": "", "name": "", "args": ""}
                        )
                        if tc.id:
                            slot["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                slot["name"] += tc.function.name
                            if tc.function.arguments:
                                slot["args"] += tc.function.arguments

                if choice.finish_reason:
                    finish_reason = choice.finish_reason

            if finish_reason != "tool_calls" or not tool_acc:
                yield {"type": "done"}
                return

            assistant_msg: dict[str, Any] = {
                "role": "assistant",
                "content": collected_text or None,
                "tool_calls": [],
            }
            for idx in sorted(tool_acc):
                slot = tool_acc[idx]
                assistant_msg["tool_calls"].append(
                    {
                        "id": slot["id"],
                        "type": "function",
                        "function": {
                            "name": slot["name"],
                            "arguments": slot["args"] or "{}",
                        },
                    }
                )
            history.append(assistant_msg)

            for idx in sorted(tool_acc):
                slot = tool_acc[idx]
                try:
                    args = json.loads(slot["args"] or "{}")
                except json.JSONDecodeError:
                    args = {}

                yield {
                    "type": "tool_call",
                    "id": slot["id"],
                    "name": slot["name"],
                    "args": args,
                }
                result = await execute_tool(slot["name"], args)
                yield {
                    "type": "tool_result",
                    "id": slot["id"],
                    "name": slot["name"],
                    "result": result,
                }

                history.append(
                    {
                        "role": "tool",
                        "tool_call_id": slot["id"],
                        "content": json.dumps(result, default=str),
                    }
                )

        yield {
            "type": "error",
            "message": f"Exceeded max tool-call rounds ({MAX_TOOL_ROUNDS}).",
        }

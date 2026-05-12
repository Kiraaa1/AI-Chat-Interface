from __future__ import annotations

import inspect
from typing import Any, Awaitable, Callable

from . import time_tool, web_search

ToolFn = Callable[..., Any] | Callable[..., Awaitable[Any]]


class Tool:
    def __init__(self, schema: dict[str, Any], fn: ToolFn) -> None:
        self.name: str = schema["name"]
        self.description: str = schema["description"]
        self.parameters: dict[str, Any] = schema["parameters"]
        self.fn: ToolFn = fn

    async def call(self, args: dict[str, Any]) -> Any:
        result = self.fn(**(args or {}))
        if inspect.isawaitable(result):
            result = await result
        return result


TOOLS: dict[str, Tool] = {
    "get_current_time": Tool(time_tool.SCHEMA, time_tool.get_current_time),
    "web_search": Tool(web_search.SCHEMA, web_search.web_search),
}


async def execute_tool(name: str, args: dict[str, Any]) -> Any:
    tool = TOOLS.get(name)
    if tool is None:
        return {"error": f"unknown tool: {name}"}
    try:
        return await tool.call(args or {})
    except TypeError as exc:
        return {"error": f"invalid arguments for {name}: {exc}"}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"{name} failed: {exc.__class__.__name__}: {exc}"}


def openai_tool_specs() -> list[dict[str, Any]]:
    """Render tool definitions in OpenAI's function-calling format."""
    return [
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters,
            },
        }
        for t in TOOLS.values()
    ]


def anthropic_tool_specs() -> list[dict[str, Any]]:
    """Render tool definitions in Anthropic's tool-use format."""
    return [
        {
            "name": t.name,
            "description": t.description,
            "input_schema": t.parameters,
        }
        for t in TOOLS.values()
    ]

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from ..config import get_settings


async def _tavily_search(query: str, max_results: int) -> list[dict[str, Any]]:
    settings = get_settings()
    assert settings.tavily_api_key, "tavily key required"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "snippet": r.get("content", ""),
        }
        for r in data.get("results", [])
    ]


def _ddg_search_sync(query: str, max_results: int) -> list[dict[str, Any]]:
    # Imported lazily so the module loads even if the dep is missing.
    from ddgs import DDGS

    raw = list(DDGS().text(query, max_results=max_results))

    return [
        {
            "title": r.get("title", ""),
            "url": r.get("href") or r.get("url", ""),
            "snippet": r.get("body", ""),
        }
        for r in raw
    ]


async def web_search(query: str, max_results: int = 5) -> dict[str, Any]:
    """Search the web. Uses Tavily if TAVILY_API_KEY is set, otherwise DuckDuckGo."""

    query = (query or "").strip()
    if not query:
        return {"error": "query must not be empty"}

    max_results = max(1, min(int(max_results or 5), 10))
    settings = get_settings()

    try:
        if settings.tavily_api_key:
            results = await _tavily_search(query, max_results)
            backend = "tavily"
        else:
            results = await asyncio.to_thread(_ddg_search_sync, query, max_results)
            backend = "duckduckgo"
    except Exception as exc:  # noqa: BLE001 - surface error text to the model
        return {"error": f"web search failed: {exc.__class__.__name__}: {exc}"}

    return {"backend": backend, "query": query, "results": results}


SCHEMA = {
    "name": "web_search",
    "description": (
        "Search the public web for up-to-date information. Returns a list of "
        "results with title, url and a short snippet. Use this whenever the "
        "user asks about recent events, current facts, or anything that may "
        "have changed since the model's training cutoff."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural-language search query.",
            },
            "max_results": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10,
                "description": "Maximum number of results to return (1-10).",
            },
        },
        "required": ["query"],
        "additionalProperties": False,
    },
}

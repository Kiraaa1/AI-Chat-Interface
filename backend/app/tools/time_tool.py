from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def get_current_time(timezone_name: str | None = None) -> dict:
    """Return the current time, optionally in a specific IANA timezone."""

    if timezone_name:
        try:
            tz = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError:
            return {
                "error": f"Unknown timezone '{timezone_name}'. "
                "Use an IANA name like 'America/New_York' or 'Europe/London'.",
            }
        now = datetime.now(tz)
    else:
        now = datetime.now(timezone.utc)
        timezone_name = "UTC"

    return {
        "timezone": timezone_name,
        "iso": now.isoformat(),
        "human": now.strftime("%A, %B %d %Y, %I:%M %p %Z"),
    }


SCHEMA = {
    "name": "get_current_time",
    "description": (
        "Get the current date and time. Optionally specify an IANA timezone "
        "name (e.g. 'America/New_York', 'Europe/London', 'Asia/Tokyo'). "
        "Defaults to UTC if omitted."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "timezone_name": {
                "type": "string",
                "description": "IANA timezone identifier. Optional.",
            }
        },
        "required": [],
        "additionalProperties": False,
    },
}

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Runtime configuration loaded from environment variables."""

    def __init__(self) -> None:
        self.provider: str = os.getenv("LLM_PROVIDER", "openai").strip().lower()
        self.openai_api_key: str | None = os.getenv("OPENAI_API_KEY") or None
        self.anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY") or None
        self.openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.anthropic_model: str = os.getenv(
            "ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"
        )
        self.tavily_api_key: str | None = os.getenv("TAVILY_API_KEY") or None

        origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        self.cors_origins: list[str] = [
            o.strip() for o in origins.split(",") if o.strip()
        ]

    def default_model(self) -> str:
        return (
            self.anthropic_model
            if self.provider == "anthropic"
            else self.openai_model
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

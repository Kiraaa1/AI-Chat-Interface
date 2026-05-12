from __future__ import annotations

from ..config import get_settings
from .base import Provider, StreamEvent
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider


def get_provider() -> Provider:
    settings = get_settings()
    if settings.provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set"
            )
        return AnthropicProvider(
            api_key=settings.anthropic_api_key,
            default_model=settings.anthropic_model,
        )
    if settings.provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError(
                "LLM_PROVIDER=openai but OPENAI_API_KEY is not set"
            )
        return OpenAIProvider(
            api_key=settings.openai_api_key,
            default_model=settings.openai_model,
        )
    raise RuntimeError(
        f"Unsupported LLM_PROVIDER '{settings.provider}'. Use 'openai' or 'anthropic'."
    )


__all__ = ["Provider", "StreamEvent", "get_provider"]

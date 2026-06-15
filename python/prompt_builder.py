"""Utilities for constructing structured prompts from UI state."""

from __future__ import annotations

from typing import Any, Dict, Optional


def _pick(raw: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Return the first non-null value among ``keys`` (camelCase or snake_case)."""

    for key in keys:
        value = raw.get(key)
        if value is not None:
            return value
    return default


def normalise_request(raw_request: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce an incoming payload into the keyword arguments accepted by
    :class:`inference.GenerationRequest`.

    The Rust bridge serializes the request with serde's ``camelCase`` renaming,
    so values arrive as ``negativePrompt``/``guidanceScale``/``sourceImagePath``.
    We accept both spellings and return exactly the dataclass fields so that
    ``GenerationRequest(**normalise_request(...))`` never sees stray kwargs.
    """

    raw = raw_request or {}

    steps = int(max(1, _pick(raw, "steps", default=30)))
    guidance_scale = float(_pick(raw, "guidance_scale", "guidanceScale", default=6.5))
    negative = _pick(raw, "negative_prompt", "negativePrompt")
    source_image: Optional[str] = _pick(raw, "source_image_path", "sourceImagePath")

    return {
        "prompt": str(_pick(raw, "prompt", default="")),
        "negative_prompt": str(negative) if negative else None,
        "model": str(_pick(raw, "model", default="flux-kontext")),
        "steps": steps,
        "guidance_scale": guidance_scale,
        "source_image_path": str(source_image) if source_image else None,
    }


__all__ = ["normalise_request"]

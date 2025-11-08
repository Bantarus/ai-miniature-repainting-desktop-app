"""Utilities for constructing structured prompts from UI state."""

from __future__ import annotations

from typing import Any, Dict

_DEFAULTS: Dict[str, Any] = {
    "prompt": "",
    "negative_prompt": None,
    "model": "flux-kontext",
    "steps": 30,
    "guidance_scale": 6.5,
}


def normalise_request(raw_request: Dict[str, Any]) -> Dict[str, Any]:
    """Merge incoming payloads with defaults and enforce typing."""

    request = {**_DEFAULTS, **(raw_request or {})}
    request["steps"] = int(max(1, request.get("steps", 30)))
    request["guidance_scale"] = float(request.get("guidance_scale", 6.5))
    request["model"] = str(request.get("model", "flux-kontext"))
    request["prompt"] = str(request.get("prompt", ""))
    negative = request.get("negative_prompt")
    request["negative_prompt"] = str(negative) if negative else None
    return request


__all__ = ["normalise_request"]

"""Diffusers fallback integration for the AI miniature repainting application."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .inference import GenerationRequest


@dataclass(slots=True)
class BackendResult:
    status: str
    output_path: Optional[str] = None


def generate_preview(request: GenerationRequest) -> BackendResult:
    """Provide a deterministic placeholder response for Diffusers flows."""

    del request
    return BackendResult(status="completed", output_path=None)


__all__ = ["BackendResult", "generate_preview"]

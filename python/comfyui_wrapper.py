"""ComfyUI integration points for the AI miniature repainting app.

The production implementation will connect to ComfyUI via its HTTP API or a local
workflow runner. This scaffolding keeps function signatures and status objects ready
so that the Rust bridge and React UI can be wired without waiting for the heavy
machine learning dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .inference import GenerationRequest


@dataclass(slots=True)
class BackendResult:
    """Represents the minimal payload returned to the Rust layer."""

    status: str
    output_path: Optional[str] = None


def bootstrap_if_required() -> None:
    """Placeholder for ComfyUI bootstrap logic."""


def generate_preview(request: "GenerationRequest") -> BackendResult:
    """Return a mock response that mirrors the future ComfyUI payload."""

    # The actual implementation will submit a workflow to ComfyUI and poll for
    # progress updates. For now we simply echo back the request metadata.
    return BackendResult(status="completed", output_path=None)


__all__ = ["BackendResult", "bootstrap_if_required", "generate_preview"]

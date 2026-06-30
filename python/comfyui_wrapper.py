"""ComfyUI integration points for the AI miniature repainting app.

The production implementation will connect to ComfyUI via its HTTP API or a local
workflow runner. This scaffolding keeps function signatures and status objects ready
so that the Rust bridge and React UI can be wired without waiting for the heavy
machine learning dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Callable, Optional

from . import image_ops

if TYPE_CHECKING:  # Avoid a runtime circular import with the inference module.
    from .inference import GenerationRequest


@dataclass(slots=True)
class BackendResult:
    """Represents the minimal payload returned to the Rust layer."""

    status: str
    output_path: Optional[str] = None
    prepared_source_path: Optional[str] = None


def bootstrap_if_required() -> None:
    """Placeholder for ComfyUI bootstrap logic."""


def generate_preview(
    request: GenerationRequest,
    progress: Optional[Callable[..., Any]] = None,
) -> BackendResult:
    """Render a repainting preview for the ComfyUI-backed models.

    The real implementation will submit a workflow to ComfyUI and poll it for
    progress updates; for now we render a placeholder preview from the uploaded
    image while driving the same progress callback.
    """

    output_path, prepared_source_path = image_ops.render_edit(
        request, progress=progress, backend="comfyui"
    )
    status = "completed" if output_path else "failed"
    return BackendResult(
        status=status,
        output_path=output_path,
        prepared_source_path=prepared_source_path,
    )


__all__ = ["BackendResult", "bootstrap_if_required", "generate_preview"]

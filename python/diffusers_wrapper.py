"""Diffusers fallback integration for the AI miniature repainting application."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Callable, Optional

from . import flux2_klein, flux_kontext

if TYPE_CHECKING:  # Avoid a runtime circular import with the inference module.
    from .inference import GenerationRequest


@dataclass(slots=True)
class BackendResult:
    status: str
    output_path: Optional[str] = None


def generate_preview(
    request: GenerationRequest,
    progress: Optional[Callable[..., Any]] = None,
) -> BackendResult:
    """Run a real FLUX edit on the uploaded image.

    Routes to FLUX.2-klein (distilled, few-step) or FLUX.1-Kontext-dev based on the
    selected model. Errors (missing weights, CUDA OOM, etc.) propagate to the Rust
    bridge so the UI can surface them rather than silently degrading.
    """

    if getattr(request, "model", "") == "flux2-klein":
        output_path = flux2_klein.generate(request, progress)
    else:
        output_path = flux_kontext.generate(request, progress)
    status = "completed" if output_path else "failed"
    return BackendResult(status=status, output_path=output_path)


__all__ = ["BackendResult", "generate_preview"]

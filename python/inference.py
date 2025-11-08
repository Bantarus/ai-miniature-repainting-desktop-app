"""High level inference orchestration for the AI miniature repainting application.

This module exposes a narrow surface area that will be bridged into the Tauri runtime
via PyO3. For the initial scaffolding we keep the implementation lightweight while
preserving the structure required for the final production system described in the
technical stack definition.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional

from . import comfyui_wrapper, diffusers_wrapper, prompt_builder


@dataclass(slots=True)
class GenerationRequest:
    """Parameters required for an image generation request."""

    prompt: str
    negative_prompt: Optional[str]
    model: str
    steps: int
    guidance_scale: float


def load_runtime() -> None:
    """Initialise Python side resources for the AI runtime."""

    comfyui_wrapper.bootstrap_if_required()


def generate(request_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point invoked by the Rust bridge."""

    request = GenerationRequest(**prompt_builder.normalise_request(request_dict))

    if request.model == "qwen-image-edit":
        backend_result = diffusers_wrapper.generate_preview(request)
    else:
        backend_result = comfyui_wrapper.generate_preview(request)

    response = {
        "status": backend_result.status,
        "outputPath": backend_result.output_path,
        "metadata": {
            **asdict(request),
            "negativePrompt": request.negative_prompt,
        },
    }

    return response


__all__ = ["GenerationRequest", "generate", "load_runtime"]

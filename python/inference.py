"""High level inference orchestration for the AI miniature repainting application.

This module exposes a narrow surface area that will be bridged into the Tauri runtime
via PyO3. For the initial scaffolding we keep the implementation lightweight while
preserving the structure required for the final production system described in the
technical stack definition.
"""

from __future__ import annotations

import os
import sys


def _prefer_venv_site_packages() -> None:
    """Make the project-local venv's packages authoritative for this process.

    The Tauri app embeds a Python interpreter that can also see the *system*
    Python's site-packages, whose package versions differ from the venv's (e.g.
    transformers 4.52 vs the venv's 4.57 that diffusers' FLUX.2 support requires).
    That mix causes "Could not import Qwen3ForCausalLM" style failures. Drop every
    other site-packages directory and pin the venv's first so torch(+CUDA),
    diffusers and transformers all resolve from the same place.
    """

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    venv_site = os.path.join(project_root, ".venv", "Lib", "site-packages")
    if not os.path.isdir(venv_site):
        return

    venv_norm = os.path.normcase(os.path.normpath(venv_site))

    def _is_other_site_packages(path: str) -> bool:
        norm = os.path.normcase(os.path.normpath(path))
        return norm.endswith("site-packages") and norm != venv_norm

    kept = [
        path
        for path in sys.path
        if os.path.normcase(os.path.normpath(path)) != venv_norm
        and not _is_other_site_packages(path)
    ]
    sys.path[:] = [venv_site, *kept]


_prefer_venv_site_packages()

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from . import comfyui_wrapper, diffusers_wrapper, prompt_builder


@dataclass(slots=True)
class GenerationRequest:
    """Parameters required for an image generation request."""

    prompt: str
    negative_prompt: Optional[str]
    model: str
    steps: int
    guidance_scale: float
    source_image_path: Optional[str] = None


def load_runtime() -> None:
    """Initialise Python side resources for the AI runtime."""

    comfyui_wrapper.bootstrap_if_required()

    # Surface which key packages resolved, to confirm the venv (not the system
    # Python) is in use. Printed to the dev console; cheap and diagnostic.
    try:
        import transformers

        print(
            f"[inference] python={sys.executable or '<embedded>'} "
            f"transformers={transformers.__version__} "
            f"from={os.path.dirname(transformers.__file__)}",
            file=sys.stderr,
            flush=True,
        )
    except Exception as exc:  # pragma: no cover - diagnostic only
        print(f"[inference] transformers import check failed: {exc}", file=sys.stderr, flush=True)


def preload(model: str, progress: Optional[Callable[..., Any]] = None) -> bool:
    """Eagerly load the heavy pipeline for ``model`` so the first edit is instant.

    Invoked once at app startup by the Rust bridge (behind the splash screen).
    Returns ``True`` when a model is resident; placeholder backends report ready
    immediately since they have nothing heavy to load.
    """

    if model in ("flux2-klein", "flux-kontext"):
        return bool(diffusers_wrapper.preload(model, progress))
    if progress is not None:
        progress(0, 0, "Ready")
    return True


def generate(
    request_dict: Dict[str, Any],
    progress: Optional[Callable[..., Any]] = None,
) -> Dict[str, Any]:
    """Entry point invoked by the Rust bridge.

    ``progress`` is an optional callable ``progress(current, total, message)``
    supplied by the Rust layer; the backends invoke it as they advance so the UI
    can follow the generation in real time.
    """

    request = GenerationRequest(**prompt_builder.normalise_request(request_dict))

    if request.model in ("flux2-klein", "flux-kontext"):
        backend_result = diffusers_wrapper.generate_preview(request, progress)
    else:
        # Other models (e.g. the experimental Qwen path) still use the lightweight
        # placeholder until their real backends are wired up.
        backend_result = comfyui_wrapper.generate_preview(request, progress)

    # Keys are camelCase to match the serde `rename_all = "camelCase"` structs on
    # the Rust side that deserialize this payload.
    response = {
        "status": backend_result.status,
        "outputPath": backend_result.output_path,
        "metadata": {
            "prompt": request.prompt,
            "negativePrompt": request.negative_prompt,
            "model": request.model,
            "steps": request.steps,
            "guidanceScale": request.guidance_scale,
            "sourceImagePath": request.source_image_path,
            # The exact preprocessed image the model edited (same size as the
            # output), used by the UI for a pixel-aligned before/after.
            "preparedSourcePath": backend_result.prepared_source_path,
        },
    }

    return response


__all__ = ["GenerationRequest", "generate", "load_runtime", "preload"]

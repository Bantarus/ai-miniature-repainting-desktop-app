"""Real FLUX.1-Kontext-dev image-editing backend.

The pipeline is loaded lazily and cached for the lifetime of the process. We use
bfloat16 weights plus ``enable_model_cpu_offload`` so the ~12B transformer and the
text encoders fit within 24 GB of VRAM, streaming each component onto the GPU only
while it runs (the offloaded weights live in system RAM).
"""

from __future__ import annotations

import os

# Resolve weights to the on-disk cache the user configured *before* huggingface_hub
# or diffusers get imported anywhere in the process.
os.environ.setdefault("HF_HOME", r"E:\hf_cache")

import sys
import tempfile
import threading
import time
from typing import Any, Callable, Optional

from . import prompt_templates

_MODEL_ID = "black-forest-labs/FLUX.1-Kontext-dev"
_MAX_DIMENSION = 1024

_pipeline = None
_pipeline_lock = threading.Lock()


def is_available() -> bool:
    """True when the heavy ML stack required for real inference is importable."""

    try:
        import torch  # noqa: F401
        from diffusers import FluxKontextPipeline  # noqa: F401

        return True
    except Exception:
        return False


def _output_dir() -> str:
    directory = os.path.join(tempfile.gettempdir(), "ai-miniature-repainting", "outputs")
    os.makedirs(directory, exist_ok=True)
    return directory


def _report(progress: Optional[Callable[..., Any]], message: str) -> None:
    """Best-effort status update during the (slow, opaque) model load."""
    if progress is None:
        return
    try:
        progress(0, 0, message)
    except Exception:  # never let progress reporting break a load
        pass


def _load_pipeline(progress: Optional[Callable[..., Any]] = None):
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    with _pipeline_lock:
        if _pipeline is not None:
            return _pipeline

        import torch
        from diffusers import (
            BitsAndBytesConfig as DiffusersBitsAndBytesConfig,
            FluxKontextPipeline,
            FluxTransformer2DModel,
        )

        # The bf16 transformer (~24 GB) does not fit alongside activations on a
        # 24 GB card (it spills to system RAM and crawls). Load it in 4-bit NF4
        # (~7 GB) so it fits with headroom and runs fast on the GPU.
        nf4_config = DiffusersBitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        _report(progress, "Loading transformer (4-bit NF4)…")
        transformer = FluxTransformer2DModel.from_pretrained(
            _MODEL_ID,
            subfolder="transformer",
            quantization_config=nf4_config,
            torch_dtype=torch.bfloat16,
        )
        _report(progress, "Loading pipeline components…")
        pipeline = FluxKontextPipeline.from_pretrained(
            _MODEL_ID,
            transformer=transformer,
            torch_dtype=torch.bfloat16,
        )
        # Stream the (large, bf16) T5 text encoder on/off the GPU; the quantized
        # transformer stays resident during the denoising loop.
        _report(progress, "Optimizing for GPU (CPU offload)…")
        pipeline.enable_model_cpu_offload()
        _pipeline = pipeline
        return _pipeline


def preload(progress: Optional[Callable[..., Any]] = None) -> bool:
    """Eagerly load the pipeline so the first edit doesn't pay the load cost."""
    if not is_available():
        _report(progress, "FLUX Kontext unavailable (ML stack not importable)")
        return False
    _report(progress, "Loading FLUX Kontext model…")
    _load_pipeline(progress)
    _report(progress, "FLUX Kontext ready")
    return True


def _prepare_image(path: str):
    from PIL import Image, ImageOps

    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(image.size) > _MAX_DIMENSION:
        image.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
    # FLUX works on dimensions that are multiples of 16.
    width, height = image.size
    width -= width % 16
    height -= height % 16
    if (width, height) != image.size:
        image = image.crop((0, 0, max(width, 16), max(height, 16)))
    return image


def generate(
    request: Any, progress: Optional[Callable[..., Any]] = None
) -> tuple[Optional[str], Optional[str]]:
    """Run a FLUX.1-Kontext-dev edit and return ``(output_path, prepared_source_path)``.

    ``prepared_source_path`` is the exact preprocessed image fed to the model, so
    the UI can show an aligned before/after rather than the raw (differently sized)
    source file.
    """

    source_path = getattr(request, "source_image_path", None)
    if not source_path or not os.path.exists(source_path):
        raise FileNotFoundError("A source image is required for FLUX Kontext editing.")

    total = max(1, int(getattr(request, "steps", 28)))
    # Wrap the user's instruction with edit-localizing scaffolding so the repaint
    # stays on the miniature and preserves the background/composition.
    prompt = prompt_templates.build_edit_prompt(
        getattr(request, "prompt", ""),
        "flux-kontext",
        getattr(request, "negative_prompt", None),
    )
    print(f"[flux-kontext] edit prompt -> {prompt}", file=sys.stderr, flush=True)
    guidance = float(getattr(request, "guidance_scale", 2.5))

    if progress is not None:
        # The pipeline is cached for the process lifetime, so only the first
        # generation actually loads weights — say so instead of implying a reload.
        loading = _pipeline is None
        progress(0, total, "Loading FLUX Kontext model (one-time)" if loading else "Preparing image")

    pipeline = _load_pipeline(progress)
    init_image = _prepare_image(source_path)

    def on_step_end(_pipe: Any, step_index: int, _timestep: Any, callback_kwargs: dict) -> dict:
        if progress is not None:
            try:
                progress(step_index + 1, total, f"Diffusion step {step_index + 1}/{total}")
            except Exception:
                pass
        return callback_kwargs

    result = pipeline(
        image=init_image,
        prompt=prompt,
        num_inference_steps=total,
        guidance_scale=guidance,
        callback_on_step_end=on_step_end,
    )
    output_image = result.images[0]

    stamp = int(time.time() * 1000)
    output_path = os.path.join(_output_dir(), f"flux-edit-{stamp}.png")
    output_image.save(output_path, "PNG")
    prepared_path = os.path.join(_output_dir(), f"flux-source-{stamp}.png")
    init_image.save(prepared_path, "PNG")
    return output_path, prepared_path


__all__ = ["generate", "is_available", "preload"]

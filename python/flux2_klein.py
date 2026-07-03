"""Real FLUX.2-klein-9B image-editing backend.

FLUX.2-klein is a distilled few-step editing model. Both large components (the
~18 GB bf16 transformer and the ~16 GB Qwen3-8B text encoder) are run in 4-bit
NF4 (~5 GB each) and kept resident on the GPU together — no CPU offload.

Why: on Windows, every byte a model occupies — CPU tensors *and* WDDM-backed
GPU allocations — charges the system commit limit (RAM + pagefile). Offloading
the bf16 text encoder kept a 16 GB CPU copy alive, pushing generation to ~25 GB
of commit, which segfaults (0xc0000005) whenever dev tools eat the headroom.
All-NF4 on GPU needs ~13 GB commit / ~11 GB VRAM and fits a 24 GB card easily.

The quantized weights are cached under ``HF_HOME/prequant`` on first load, so
later loads skip the bf16 materialization peak entirely and start in seconds.
The pipeline is loaded lazily and cached for the process lifetime.
"""

from __future__ import annotations

import os

# Resolve weights to the on-disk cache *before* huggingface_hub / diffusers import.
os.environ.setdefault("HF_HOME", r"E:\hf_cache")

import sys
import tempfile
import threading
import time
from typing import Any, Callable, Optional

from . import prompt_templates

_MODEL_ID = "black-forest-labs/FLUX.2-klein-9B"
_MAX_DIMENSION = 1024

_pipeline = None
_pipeline_lock = threading.Lock()


def is_available() -> bool:
    try:
        import torch  # noqa: F401
        from diffusers import Flux2KleinPipeline  # noqa: F401

        return True
    except Exception:
        return False


def _output_dir() -> str:
    directory = os.path.join(tempfile.gettempdir(), "ai-miniature-repainting", "outputs")
    os.makedirs(directory, exist_ok=True)
    return directory


def _nf4_dir(component: str) -> str:
    """Where a pre-quantized (4-bit NF4) component is cached so later loads skip
    the bf16 materialization peak. Kept next to the HF cache on the big (E:) drive."""
    root = os.environ.get("HF_HOME") or r"E:\hf_cache"
    return os.path.join(root, "prequant", f"flux2-klein-nf4-{component}")


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
            Flux2KleinPipeline,
            Flux2Transformer2DModel,
        )
        from transformers import (
            BitsAndBytesConfig as TransformersBitsAndBytesConfig,
            Qwen3ForCausalLM,
        )

        # ── Transformer: NF4 on the GPU ──────────────────────────────────────
        quant_dir = _nf4_dir("transformer")
        transformer = None
        if os.path.isdir(quant_dir):
            try:
                _report(progress, "Loading pre-quantized transformer…")
                # device_map="cuda" materializes the deserialized 4-bit weights
                # straight on the GPU (no CPU staging copy charging commit).
                transformer = Flux2Transformer2DModel.from_pretrained(
                    quant_dir,
                    torch_dtype=torch.bfloat16,
                    device_map="cuda",
                )
            except Exception as exc:  # any issue → fall back to a fresh quantize
                print(f"[flux2] pre-quantized load failed ({exc}); re-quantizing", flush=True)
                transformer = None
        if transformer is None:
            _report(progress, "Loading transformer (4-bit NF4)…")
            transformer = Flux2Transformer2DModel.from_pretrained(
                _MODEL_ID,
                subfolder="transformer",
                quantization_config=DiffusersBitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.bfloat16,
                ),
                torch_dtype=torch.bfloat16,
            )
            try:
                _report(progress, "Caching quantized transformer for fast future loads…")
                transformer.save_pretrained(quant_dir)
            except Exception as exc:  # caching is best-effort; never break the load
                print(f"[flux2] could not cache quantized transformer: {exc}", flush=True)

        # ── Text encoder: NF4 on the GPU (same cache-then-load pattern) ──────
        encoder_dir = _nf4_dir("text-encoder")
        text_encoder = None
        if os.path.isdir(encoder_dir):
            try:
                _report(progress, "Loading pre-quantized text encoder…")
                text_encoder = Qwen3ForCausalLM.from_pretrained(
                    encoder_dir,
                    torch_dtype=torch.bfloat16,
                    device_map="cuda",
                )
            except Exception as exc:
                print(f"[flux2] pre-quantized encoder load failed ({exc}); re-quantizing", flush=True)
                text_encoder = None
        if text_encoder is None:
            _report(progress, "Loading text encoder (4-bit NF4)…")
            text_encoder = Qwen3ForCausalLM.from_pretrained(
                _MODEL_ID,
                subfolder="text_encoder",
                quantization_config=TransformersBitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.bfloat16,
                ),
                torch_dtype=torch.bfloat16,
                device_map="cuda",
            )
            try:
                _report(progress, "Caching quantized text encoder for fast future loads…")
                text_encoder.save_pretrained(encoder_dir)
            except Exception as exc:
                print(f"[flux2] could not cache quantized text encoder: {exc}", flush=True)

        _report(progress, "Loading pipeline components…")
        pipeline = Flux2KleinPipeline.from_pretrained(
            _MODEL_ID,
            transformer=transformer,
            text_encoder=text_encoder,
            torch_dtype=torch.bfloat16,
        )
        # Both quantized models are already resident on the GPU; only the small
        # bf16 VAE still needs moving. Everything stays put — no offload hooks.
        _report(progress, "Moving VAE to GPU…")
        pipeline.vae.to("cuda")
        _pipeline = pipeline
        return _pipeline


def preload(progress: Optional[Callable[..., Any]] = None) -> bool:
    """Eagerly load the pipeline so the first edit doesn't pay the load cost.

    Returns ``True`` when the model is resident, ``False`` if the ML stack isn't
    importable (the app can still fall back to lazy loading / placeholder).
    """
    if not is_available():
        _report(progress, "FLUX.2 Klein unavailable (ML stack not importable)")
        return False
    _report(progress, "Loading FLUX.2 Klein model…")
    _load_pipeline(progress)
    _report(progress, "FLUX.2 Klein ready")
    return True


def _prepare_image(path: str):
    from PIL import Image, ImageOps

    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(image.size) > _MAX_DIMENSION:
        image.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
    # Use dimensions that are multiples of 16.
    width, height = image.size
    width -= width % 16
    height -= height % 16
    if (width, height) != image.size:
        image = image.crop((0, 0, max(width, 16), max(height, 16)))
    return image


def generate(
    request: Any, progress: Optional[Callable[..., Any]] = None
) -> tuple[Optional[str], Optional[str]]:
    """Run a FLUX.2-klein edit and return ``(output_path, prepared_source_path)``.

    ``prepared_source_path`` is the exact preprocessed image the model edited
    (same dimensions as the output), so the UI can show a pixel-aligned before/after.
    """

    source_path = getattr(request, "source_image_path", None)
    if not source_path or not os.path.exists(source_path):
        raise FileNotFoundError("A source image is required for FLUX.2 Klein editing.")

    total = max(1, int(getattr(request, "steps", 4)))
    # Wrap the user's instruction with subject-first, edit-localizing scaffolding so
    # the repaint stays on the miniature and doesn't bleed into the background.
    prompt = prompt_templates.build_edit_prompt(
        getattr(request, "prompt", ""),
        "flux2-klein",
        getattr(request, "negative_prompt", None),
    )
    print(f"[flux2-klein] edit prompt -> {prompt}", file=sys.stderr, flush=True)
    guidance = float(getattr(request, "guidance_scale", 2.5))

    if progress is not None:
        # The pipeline is cached for the process lifetime, so only the first
        # generation actually loads weights — say so instead of implying a reload.
        loading = _pipeline is None
        progress(0, total, "Loading FLUX.2 Klein model (one-time)" if loading else "Preparing image")

    pipeline = _load_pipeline(progress)
    init_image = _prepare_image(source_path)
    width, height = init_image.size

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
        # Preserve the source image's dimensions so the edit keeps its scale/framing.
        height=height,
        width=width,
        num_inference_steps=total,
        guidance_scale=guidance,
        callback_on_step_end=on_step_end,
    )
    output_image = result.images[0]

    stamp = int(time.time() * 1000)
    output_path = os.path.join(_output_dir(), f"flux2-edit-{stamp}.png")
    output_image.save(output_path, "PNG")
    prepared_path = os.path.join(_output_dir(), f"flux2-source-{stamp}.png")
    init_image.save(prepared_path, "PNG")
    return output_path, prepared_path


__all__ = ["generate", "is_available", "preload"]

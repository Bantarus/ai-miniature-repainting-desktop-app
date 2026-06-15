"""Image processing for the repainting preview.

This is a lightweight placeholder for the eventual diffusion pipeline. It loads
the uploaded miniature, simulates a step-wise refinement loop (reporting progress
so the UI can follow along), applies a visible "repaint" transformation derived
from the prompt, and writes the result to a temp output directory.

Only Pillow is required here; the heavy ML stack (torch/diffusers) is reserved
for the real backend that will replace ``render_edit``.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
import time
from typing import Any, Callable, Optional

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

    _PIL_AVAILABLE = True
except ImportError:  # pragma: no cover - Pillow is a declared dependency
    _PIL_AVAILABLE = False

ProgressCallback = Optional[Callable[..., Any]]

_MAX_DIMENSION = 1024
_STEP_DELAY_SECONDS = 0.04


def _output_dir() -> str:
    directory = os.path.join(tempfile.gettempdir(), "ai-miniature-repainting", "outputs")
    os.makedirs(directory, exist_ok=True)
    return directory


def _report(progress: ProgressCallback, current: int, total: int, message: str) -> None:
    if progress is None:
        return
    try:
        progress(current, total, message)
    except Exception:  # pragma: no cover - never let progress reporting break a run
        pass


def _tint_for_prompt(prompt: str) -> tuple[int, int, int]:
    digest = hashlib.sha256(prompt.encode("utf-8")).digest()
    return digest[0], digest[1], digest[2]


def render_edit(
    request: Any, progress: ProgressCallback = None, backend: str = "diffusers"
) -> tuple[Optional[str], Optional[str]]:
    """Produce a repainted preview and return ``(output_path, prepared_source_path)``.

    ``prepared_source_path`` is the preprocessed input (same dimensions as the
    output) so the UI can show an aligned before/after. Returns ``(None, None)``
    when Pillow is unavailable so the caller can degrade gracefully.
    """

    if not _PIL_AVAILABLE:
        return None, None

    total = max(1, int(getattr(request, "steps", 30)))
    prompt = str(getattr(request, "prompt", "") or "")
    model = str(getattr(request, "model", "") or backend)
    source_path = getattr(request, "source_image_path", None)

    if source_path and os.path.exists(source_path):
        image = ImageOps.exif_transpose(Image.open(source_path)).convert("RGB")
    else:
        image = Image.new("RGB", (768, 768), (32, 32, 40))

    if max(image.size) > _MAX_DIMENSION:
        image.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))

    # Snapshot the preprocessed input *before* the repaint transforms so the UI's
    # before/after compares like-for-like (same dimensions as the output).
    stamp = int(time.time() * 1000)
    prepared_path = os.path.join(_output_dir(), f"source-{stamp}.png")
    image.copy().save(prepared_path, "PNG")

    # Simulate the diffusion sampling loop so the UI progress bar can follow the
    # steps. The real backend will drive these same callbacks from its sampler.
    for step in range(total):
        time.sleep(_STEP_DELAY_SECONDS)
        _report(progress, step + 1, total, f"Refining step {step + 1}/{total}")

    # Apply a visible, prompt-dependent "repaint" so the output differs clearly
    # from the input and varies with the prompt.
    image = ImageEnhance.Color(image).enhance(1.45)
    image = ImageEnhance.Contrast(image).enhance(1.18)
    image = ImageEnhance.Sharpness(image).enhance(1.4)
    image = ImageEnhance.Brightness(image).enhance(1.03)
    overlay = Image.new("RGB", image.size, _tint_for_prompt(prompt))
    image = Image.blend(image, overlay, 0.12)

    _draw_caption(image, f"{model} • {total} steps — {prompt}".strip())

    output_path = os.path.join(_output_dir(), f"edit-{stamp}.png")
    image.save(output_path, "PNG")
    return output_path, prepared_path


def _draw_caption(image: "Image.Image", text: str) -> None:
    if not text:
        return
    width, height = image.size
    bar_height = 30
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rectangle([0, height - bar_height, width, height], fill=(0, 0, 0, 150))
    font = ImageFont.load_default()
    trimmed = text if len(text) <= 130 else text[:127] + "..."
    draw.text((10, height - bar_height + 9), trimmed, fill=(255, 255, 255, 255), font=font)


__all__ = ["render_edit"]

"""Model-specific prompt scaffolding for localized miniature edits.

The text a user types describes *what* to change. Black Forest Labs' editing
guidance is explicit that the biggest lever for keeping an edit localized — so it
touches only the subject and not the background — is to state, inside the positive
prompt, both the change AND what must stay unchanged (their endorsed phrasings:
"...keeping the rest of the image unchanged", "Change nothing else"), and to lead
with the subject ("subject-first"). These helpers wrap the user's instruction with
that preservation scaffolding, tuned per model, so a prompt like "make the armor
gold" repaints the figure without bleeding into the backdrop.

Sources (official Black Forest Labs):
- Skills repo — image-to-image prompting rules:
  https://github.com/black-forest-labs/skills
- Single-reference editing guide:
  https://docs.bfl.ml/guides/prompting_editing_single_reference
"""

from __future__ import annotations

from typing import Optional

# Everything that must survive a repaint of a tabletop-miniature photo, phrased
# with BFL's endorsed "keep ... unchanged / change nothing else" constructions.
_PRESERVE_CLAUSE = (
    "Apply the change only to the miniature model itself. Keep the background, the "
    "base and the surface it stands on, the lighting, the camera angle, the framing "
    "and the composition exactly the same, and keep the rest of the image unchanged. "
    "Change nothing else."
)

# Sent when the user leaves the prompt empty, so the model still gets a coherent edit.
_DEFAULT_INSTRUCTION = "Give the miniature a crisp, clean, high-quality tabletop paint job"


def build_edit_prompt(
    prompt: Optional[str],
    model: str,
    negative: Optional[str] = None,
) -> str:
    """Wrap a user instruction with model-appropriate, edit-localizing scaffolding."""

    instruction = (prompt or "").strip() or _DEFAULT_INSTRUCTION

    if model == "flux2-klein":
        # FLUX.2 responds well to subject-first framing plus explicit preservation.
        text = (
            f"Edit this photo of a painted tabletop miniature. {instruction}. "
            f"{_PRESERVE_CLAUSE}"
        )
    else:
        # FLUX.1 Kontext: add its signature pose/position/scale preservation phrase.
        text = (
            f"{instruction}, while keeping the miniature in the exact same pose, "
            f"position and scale. {_PRESERVE_CLAUSE}"
        )

    extra = (negative or "").strip()
    if extra:
        # These editing models take "what to avoid" best as a positive-prompt
        # constraint rather than a separate negative (klein ignores negatives;
        # Kontext only applies them under true CFG, which this app does not use).
        text = f"{text} Avoid: {extra}."

    return text


__all__ = ["build_edit_prompt"]

import type { ColorRole, PaletteColor, TemplatePalette } from "../data/palettes";

// The model only understands colours, not hobby lore. So prompts must NOT mention
// the scheme name ("Ultramarines Blue"), the technique jargon ("NMM gold"), or the
// Citadel/Vallejo paint names ("Mephiston Red") — those confuse FLUX's text encoder.
// Instead we describe each colour generically: a plain colour word derived from the
// hex, plus the hex itself, grouped by paint role.

const ROLE_LABEL: Record<ColorRole, string> = {
  base: "base",
  shade: "shadows",
  highlight: "highlights",
  metal: "metallic",
  accent: "accents",
};

const ROLE_ORDER: ColorRole[] = ["base", "shade", "highlight", "metal", "accent"];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hueName(h: number): string {
  if (h < 12 || h >= 348) return "red";
  if (h < 40) return "orange";
  if (h < 58) return "gold";
  if (h < 75) return "yellow";
  if (h < 95) return "yellow-green";
  if (h < 150) return "green";
  if (h < 175) return "teal";
  if (h < 200) return "cyan";
  if (h < 250) return "blue";
  if (h < 275) return "indigo";
  if (h < 312) return "purple";
  if (h < 335) return "magenta";
  return "pink";
}

/** A plain-language colour description derived from a hex value (no lore/paint names). */
export function describeColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Near-neutral: describe on the grey scale (or brown for warm, darker tones).
  if (s < 0.12) {
    if (l < 0.12) return "near-black";
    if (l < 0.35) return "dark grey";
    if (l < 0.6) return "grey";
    if (l < 0.85) return "light grey";
    return "off-white";
  }

  let base = hueName(h);

  // Warm, mid-saturation, darker tones read as brown rather than orange/gold.
  if ((base === "orange" || base === "gold") && l < 0.45 && s < 0.7) {
    base = "brown";
  }
  // Pale, soft yellows/golds read as bone/cream.
  if ((base === "gold" || base === "yellow") && l > 0.6 && s < 0.5) {
    base = "bone";
  }

  const lightness = l < 0.25 ? "deep " : l < 0.45 ? "dark " : l > 0.82 ? "pale " : l > 0.65 ? "light " : "";
  const saturation = s < 0.35 && base !== "bone" ? "muted " : "";

  return `${lightness}${saturation}${base}`.trim();
}

function colorPhrase(color: PaletteColor): string {
  return `${describeColor(color.hex)} (${color.hex})`;
}

/**
 * A natural-language colour clause for an entire scheme, grouped by paint role and
 * described purely as colours (no scheme/faction/paint names). Folded into the
 * prompt before the Python preservation scaffolding wraps it.
 */
export function paletteClause(palette: TemplatePalette): string {
  const parts: string[] = [];
  for (const role of ROLE_ORDER) {
    const named = palette.colors.filter((color) => color.role === role).map(colorPhrase);
    if (named.length) {
      parts.push(`${ROLE_LABEL[role]} ${named.join(", ")}`);
    }
  }
  return `Repaint the miniature using this colour palette: ${parts.join("; ")}.`;
}

/** A clause for a single hand-picked colour, appended to any existing guidance. */
export function colorClause(color: PaletteColor): string {
  return `Use the colour ${colorPhrase(color)} on the miniature.`;
}

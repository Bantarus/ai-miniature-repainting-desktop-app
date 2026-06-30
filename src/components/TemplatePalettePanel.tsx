import { Button } from "@react-spectrum/s2/Button";
import { Disclosure, DisclosureTitle, DisclosurePanel } from "@react-spectrum/s2/Disclosure";
import { ColorSwatchPicker, ColorSwatch } from "@react-spectrum/s2/ColorSwatchPicker";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { GenerationController } from "../hooks/useGenerationController";
import { TEMPLATE_PALETTES, type TemplatePalette } from "../data/palettes";
import { colorClause, paletteClause } from "../services/paletteToPrompt";

interface TemplatePalettePanelProps {
  controller: GenerationController;
}

/** Distinct swatch colors — ColorSwatchPicker requires unique colors per group. */
function uniqueColors(palette: TemplatePalette) {
  const seen = new Set<string>();
  return palette.colors.filter((color) => {
    const key = color.hex.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TemplatePalettePanel({ controller }: TemplatePalettePanelProps): JSX.Element {
  const handlePickColor = (palette: TemplatePalette, hex: string) => {
    const normalized = hex.slice(0, 7).toUpperCase();
    const found = palette.colors.find((color) => color.hex.toUpperCase() === normalized);
    if (found) {
      controller.appendColorGuidance(colorClause(found));
    }
  };

  return (
    <div className={style({ display: "flex", flexDirection: "column", gap: 12 })}>
      <h2 className={style({ font: "heading-sm", margin: 0 })}>Paint schemes</h2>
      <p className={style({ font: "body-xs", color: "neutral-subdued", margin: 0 })}>
        Apply a full scheme, or tap individual paints to guide the repaint.
      </p>
      <div className={style({ display: "flex", flexDirection: "column" })}>
        {TEMPLATE_PALETTES.map((palette) => (
          <Disclosure key={palette.name} styles={style({ width: "full" })}>
            <DisclosureTitle>{palette.name}</DisclosureTitle>
            <DisclosurePanel>
              <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
                <span className={style({ font: "body-xs", color: "neutral-subdued" })}>
                  {palette.technique} — {palette.description}
                </span>
                <ColorSwatchPicker
                  size="S"
                  density="compact"
                  onChange={(color) => handlePickColor(palette, color.toString("hex"))}
                >
                  {uniqueColors(palette).map((color) => (
                    <ColorSwatch key={color.name} color={color.hex} colorName={color.name} />
                  ))}
                </ColorSwatchPicker>
                <Button
                  variant="secondary"
                  onPress={() => controller.setColorGuidance(paletteClause(palette))}
                >
                  Use this scheme
                </Button>
              </div>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </div>
    </div>
  );
}

import { Provider } from "@react-spectrum/s2/Provider";
import { Divider } from "@react-spectrum/s2/Divider";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useGenerationController } from "../hooks/useGenerationController";
import { AppHeader } from "./AppHeader";
import { PromptPanel } from "./PromptPanel";
import { TemplatePalettePanel } from "./TemplatePalettePanel";
import { PreviewPanel } from "./PreviewPanel";
import { LayersPanel } from "./LayersPanel";

export function AppShell(): JSX.Element {
  const generation = useGenerationController();

  return (
    // Dark-only desktop app: force the scheme here (and on <html data-color-scheme>)
    // so the UI never follows a light OS preference.
    <Provider colorScheme="dark" background="base" styles={style({ height: "screen" })}>
      <div className={style({ display: "flex", flexDirection: "column", height: "full" })}>
        <AppHeader controller={generation} />
        <div className={style({ display: "flex", flexGrow: 1, minHeight: 0 })}>
          {/* Left column: compose an edit + browse paint schemes */}
          <div
            className={style({
              width: { default: 300, lg: 320 },
              minWidth: 280,
              borderEndWidth: 1,
              borderStyle: "solid",
              borderColor: "gray-300",
              padding: 16,
              backgroundColor: "gray-100",
              overflowY: "auto",
            })}
          >
            <div className={style({ display: "flex", flexDirection: "column", gap: 16 })}>
              <PromptPanel controller={generation} />
              <Divider size="S" />
              <TemplatePalettePanel controller={generation} />
            </div>
          </div>

          {/* Center column: the selected layer / base preview */}
          <div
            className={style({
              flexGrow: 1,
              minWidth: 0,
              padding: 24,
              backgroundColor: "gray-75",
            })}
          >
            <PreviewPanel controller={generation} />
          </div>

          {/* Right column: the layer stack */}
          <div
            className={style({
              width: { default: 280, lg: 300 },
              minWidth: 260,
              borderStartWidth: 1,
              borderStyle: "solid",
              borderColor: "gray-300",
              padding: 16,
              backgroundColor: "gray-100",
            })}
          >
            <LayersPanel controller={generation} />
          </div>
        </div>
      </div>
    </Provider>
  );
}

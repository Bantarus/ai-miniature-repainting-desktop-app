import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";

async function openStackOverview(): Promise<void> {
  try {
    // The Rust side resolves the absolute path (bundled resource in production,
    // walked up from the executable in development) so the relative path works
    // regardless of the process working directory.
    const path = await invoke<string>("resolve_doc_path", {
      name: "TECHNICAL_STACK_DEFINITION.md",
    });
    await openPath(path);
  } catch (error) {
    console.error("Failed to open the stack overview document", error);
  }
}

export function AppHeader(): JSX.Element {
  return (
    <div
      className={style({
        backgroundColor: "gray-100",
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: "gray-300",
        padding: 16,
      })}
    >
      <div
        className={style({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        })}
      >
        <div className={style({ display: "flex", flexDirection: "column", gap: 4 })}>
          <h1 className={style({ font: "heading-sm", margin: 0 })}>
            AI Miniature Repainting Studio
          </h1>
          <p className={style({ font: "body-sm", color: "neutral-subdued", margin: 0 })}>
            Iteratively explore miniature paint schemes with production-ready AI tooling.
          </p>
        </div>
        <ActionButton aria-label="View technical stack" onPress={() => void openStackOverview()}>
          Stack Overview
        </ActionButton>
      </div>
    </div>
  );
}

/**
 * True when running inside the Tauri runtime (desktop webview), false in a plain
 * browser. Tauri v2 injects `__TAURI_INTERNALS__` (and `isTauri`) onto `window`.
 * Everything that goes through `invoke` — model preload, the file dialog,
 * generation, and the layer library — only works when this is true.
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "isTauri" in window)
  );
}

import { invoke } from "@tauri-apps/api/core";
import type { LayerProject } from "./layers";

function extensionOf(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "png";
}

/** A library file name derived from a layer/base id and the source extension. */
export function libraryFileName(id: string, sourcePath: string, suffix = ""): string {
  return `${id}${suffix}.${extensionOf(sourcePath)}`;
}

/** Copy an image into the app-owned library, returning the new absolute path. */
export async function importToLibrary(sourcePath: string, fileName: string): Promise<string> {
  return invoke<string>("library_import", { sourcePath, fileName });
}

/** Persist the project (base image + layers) to disk. */
export async function saveProject(project: LayerProject): Promise<void> {
  await invoke("library_save", { json: JSON.stringify(project) });
}

/** Load the saved project, or null if none exists / it is unreadable. */
export async function loadProject(): Promise<LayerProject | null> {
  const json = await invoke<string>("library_load");
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as LayerProject;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

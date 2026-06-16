import type { InferenceModel } from "./inference";

/**
 * A single non-destructive edit in the layer stack. Every completed generation
 * becomes a LayerNode. `parentId === null` means the edit was generated from the
 * base original upload; otherwise it was generated from the parent layer's
 * `resultPath` (so "regenerate from a layer" just re-runs with that image as the
 * source). The forest is usually a linear chain but branching is supported.
 *
 * The backend returns none of `id`/`parentId`/`name`/`visible`/`createdAt` —
 * those are frontend orchestration concerns. The rest mirror what the model ran.
 */
export interface LayerNode {
  id: string;
  parentId: string | null;
  name: string;
  visible: boolean;
  createdAt: number;

  /** The source image actually fed to the model for THIS layer. */
  sourceImagePath: string;
  /** The edited output image (= GenerationResponse.outputPath). */
  resultPath: string;
  /** The exact preprocessed image the model edited — this layer's aligned "before". */
  preparedSourcePath: string | null;

  // Reproduction parameters (the full prompt sent, including any palette guidance).
  prompt: string;
  negativePrompt?: string;
  model: InferenceModel;
  steps: number;
  guidanceScale: number;
}

/** The pristine original the whole stack hangs off of. */
export interface BaseImage {
  sourceImagePath: string;
  name: string;
  createdAt: number;
}

/** Serializable project snapshot persisted to disk (see Rust `library_*` commands). */
export interface LayerProject {
  version: 1;
  baseImage: BaseImage | null;
  layers: LayerNode[];
}

/** A short, human label for a freshly created layer. */
export function defaultLayerName(index: number, prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed) {
    const short = trimmed.length > 40 ? `${trimmed.slice(0, 40).trimEnd()}…` : trimmed;
    return `${index + 1}. ${short}`;
  }
  return `Layer ${index + 1}`;
}

/** The leaf-most file name of a path, used to label the base image. */
export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

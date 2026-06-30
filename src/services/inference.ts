import { invoke } from "@tauri-apps/api/core";
import { UnlistenFn, listen } from "@tauri-apps/api/event";

export type InferenceModel = "flux2-klein" | "flux-kontext" | "qwen-image-edit";

/** Model selected by default in the UI and preloaded at startup. */
export const DEFAULT_MODEL: InferenceModel = "flux2-klein";

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model: InferenceModel;
  steps: number;
  guidanceScale: number;
  /** Absolute path to the source miniature image being edited. */
  sourceImagePath?: string;
}

export type GenerationStatus = "pending" | "running" | "completed" | "failed";

export interface GenerationMetadata {
  prompt: string;
  negativePrompt?: string;
  model: InferenceModel;
  steps: number;
  guidanceScale: number;
  sourceImagePath?: string | null;
  /** The exact preprocessed image the model edited (same size as the output). */
  preparedSourcePath?: string | null;
}

export interface GenerationResponse {
  status: GenerationStatus;
  outputPath: string | null;
  metadata: GenerationMetadata;
}

export interface GenerationProgress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

export async function requestGeneration(request: GenerationRequest): Promise<GenerationResponse> {
  return invoke<GenerationResponse>("generate_image", { request });
}

/**
 * Eagerly load the heavy model pipeline at startup so the first generation is
 * instant. Resolves to `true` once a model is resident, `false` if the backend
 * has no ML stack (the app still works via lazy loading / placeholder).
 */
export async function preloadModel(model: InferenceModel): Promise<boolean> {
  return invoke<boolean>("preload_model", { model });
}

export async function listenToModelLoading(
  handler: (event: GenerationProgress) => void,
): Promise<UnlistenFn> {
  return listen<GenerationProgress>("model-loading-progress", (event) => {
    if (event.payload) {
      handler(event.payload);
    }
  });
}

export async function listenToGenerationProgress(
  handler: (event: GenerationProgress) => void,
): Promise<UnlistenFn> {
  return listen<GenerationProgress>("generation-progress", (event) => {
    if (event.payload) {
      handler(event.payload);
    }
  });
}

export function buildGenerationRequest(partial: Partial<GenerationRequest>): GenerationRequest {
  return {
    prompt: partial.prompt ?? "",
    negativePrompt: partial.negativePrompt,
    model: partial.model ?? "flux-kontext",
    steps: partial.steps ?? 30,
    guidanceScale: partial.guidanceScale ?? 6.5,
    sourceImagePath: partial.sourceImagePath,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GenerationProgress,
  GenerationRequest,
  InferenceModel,
  buildGenerationRequest,
  listenToGenerationProgress,
  requestGeneration,
} from "../services/inference";
import { BaseImage, LayerNode, defaultLayerName } from "../services/layers";
import {
  importToLibrary,
  libraryFileName,
  loadProject,
  saveProject,
} from "../services/library";

/** The "edit composer" settings shared by the prompt panel and the layer actions. */
export interface EditSettings {
  prompt: string;
  negativePrompt: string;
  model: InferenceModel;
  steps: number;
  guidanceScale: number;
}

// Per-model step/guidance presets. FLUX.2-klein is distilled (few-step); FLUX.1
// Kontext / Qwen need more steps. Selecting a model applies its preset.
const MODEL_PRESETS: Record<InferenceModel, { steps: number; guidanceScale: number }> = {
  "flux2-klein": { steps: 4, guidanceScale: 2.5 },
  "flux-kontext": { steps: 28, guidanceScale: 2.5 },
  "qwen-image-edit": { steps: 28, guidanceScale: 4.0 },
};

const DEFAULT_SETTINGS: EditSettings = {
  prompt:
    "Repaint the miniature with a weathered bronze and emerald color scheme, crisp edge highlights",
  negativePrompt: "low detail, blurred, unfinished",
  model: "flux2-klein",
  steps: MODEL_PRESETS["flux2-klein"].steps,
  guidanceScale: MODEL_PRESETS["flux2-klein"].guidanceScale,
};

/** The single curated model hobbyists always use; dev mode can override it. */
const PRODUCTION_MODEL: InferenceModel = "flux2-klein";

export interface GenerationController {
  // generation lifecycle
  isGenerating: boolean;
  progress: GenerationProgress | null;
  error: string | null;

  // dev mode unlocks model selection + advanced tuning (hobbyists get a fixed setup)
  devMode: boolean;
  setDevMode: (value: boolean) => void;

  // edit composer
  settings: EditSettings;
  setSetting: <K extends keyof EditSettings>(key: K, value: EditSettings[K]) => void;
  setModel: (model: InferenceModel) => void;

  // palette color guidance, appended to the prompt at submit time
  colorGuidance: string;
  setColorGuidance: (value: string) => void;
  appendColorGuidance: (value: string) => void;

  // base image + layer stack
  baseImage: BaseImage | null;
  layers: LayerNode[];
  selectedLayerId: string | null;
  selectedLayer: LayerNode | null;

  setBaseImage: (sourceImagePath: string, name: string) => void;
  selectLayer: (id: string | null) => void;
  toggleLayerVisibility: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;

  // generation entry points
  generate: () => Promise<void>;
  regenerateFromBase: () => Promise<void>;
  regenerateFromLayer: (id: string) => Promise<void>;
}

export function useGenerationController(): GenerationController {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<EditSettings>(DEFAULT_SETTINGS);
  const [colorGuidance, setColorGuidance] = useState("");
  const [devMode, setDevModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("devMode") === "1";
    } catch {
      return false;
    }
  });

  const [baseImage, setBaseImageState] = useState<BaseImage | null>(null);
  const [layers, setLayers] = useState<LayerNode[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Becomes true once the persisted project has loaded, so the save effect below
  // doesn't overwrite saved data with the initial empty state on first render.
  const hydratedRef = useRef(false);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId],
  );

  const setSetting = useCallback(
    <K extends keyof EditSettings>(key: K, value: EditSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const setModel = useCallback((model: InferenceModel) => {
    const preset = MODEL_PRESETS[model];
    setSettings((current) => ({
      ...current,
      model,
      steps: preset.steps,
      guidanceScale: preset.guidanceScale,
    }));
  }, []);

  const setDevMode = useCallback((value: boolean) => {
    setDevModeState(value);
    try {
      localStorage.setItem("devMode", value ? "1" : "0");
    } catch {
      // Preference persistence is best-effort.
    }
  }, []);

  const appendColorGuidance = useCallback((value: string) => {
    setColorGuidance((current) => (current ? `${current} ${value}` : value));
  }, []);

  const setBaseImage = useCallback((sourceImagePath: string, name: string) => {
    // A new base image starts a fresh stack. Copy the original into the app-owned
    // library so the whole project survives restarts (best-effort: fall back to
    // the original path if the import fails).
    void (async () => {
      let stored = sourceImagePath;
      try {
        stored = await importToLibrary(
          sourceImagePath,
          libraryFileName(`base-${crypto.randomUUID()}`, sourceImagePath),
        );
      } catch (importError) {
        console.warn("Could not import base image into library", importError);
      }
      setBaseImageState({ sourceImagePath: stored, name, createdAt: Date.now() });
      setLayers([]);
      setSelectedLayerId(null);
      setError(null);
    })();
  }, []);

  const selectLayer = useCallback((id: string | null) => setSelectedLayerId(id), []);

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
    // A selected layer is always visible, so toggling it can only be a "hide" —
    // fall the preview back to the base view when that happens.
    setSelectedLayerId((current) => (current === id ? null : current));
  }, []);

  const renameLayer = useCallback((id: string, name: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedLayerId((current) => (current === id ? null : current));
  }, []);

  // Low-level engine shared by every generation entry point.
  const runGeneration = useCallback(
    async (parentId: string | null, sourceImagePath: string) => {
      // In hobbyist mode the model + tuning are fixed to the curated production
      // setup; dev mode uses the composer's chosen model and advanced settings.
      const model = devMode ? settings.model : PRODUCTION_MODEL;
      const preset = MODEL_PRESETS[model];
      const steps = devMode ? settings.steps : preset.steps;
      const guidanceScale = devMode ? settings.guidanceScale : preset.guidanceScale;

      setIsGenerating(true);
      setError(null);
      setProgress({ current: 0, total: steps, percentage: 0 });

      let unlisten: (() => void) | undefined;
      try {
        try {
          unlisten = await listenToGenerationProgress((event) => setProgress(event));
        } catch (listenError) {
          console.warn("Failed to attach progress listener", listenError);
        }

        // Fold the palette color guidance into the prompt; the Python prompt
        // scaffolding then wraps it with edit-localizing preservation language.
        const fullPrompt = [settings.prompt.trim(), colorGuidance.trim()]
          .filter(Boolean)
          .join(" ");

        const request: GenerationRequest = buildGenerationRequest({
          prompt: fullPrompt,
          negativePrompt: settings.negativePrompt.trim() || undefined,
          model,
          steps,
          guidanceScale,
          sourceImagePath,
        });

        const result = await requestGeneration(request);

        if (result.status === "completed" && result.outputPath) {
          const id = crypto.randomUUID();

          // Copy the output (and the aligned "before") into the app-owned library
          // so the layer survives restarts; fall back to the temp paths on failure.
          let resultPath = result.outputPath;
          let preparedSourcePath = result.metadata.preparedSourcePath ?? null;
          try {
            resultPath = await importToLibrary(
              result.outputPath,
              libraryFileName(id, result.outputPath),
            );
          } catch (importError) {
            console.warn("Could not import result into library", importError);
          }
          if (preparedSourcePath) {
            try {
              preparedSourcePath = await importToLibrary(
                preparedSourcePath,
                libraryFileName(id, preparedSourcePath, "-before"),
              );
            } catch (importError) {
              console.warn("Could not import prepared source into library", importError);
            }
          }

          const node: LayerNode = {
            id,
            parentId,
            name: defaultLayerName(layers.length, fullPrompt),
            visible: true,
            createdAt: Date.now(),
            sourceImagePath,
            resultPath,
            preparedSourcePath,
            prompt: fullPrompt,
            negativePrompt: settings.negativePrompt.trim() || undefined,
            model,
            steps,
            guidanceScale,
          };
          setLayers((prev) => [...prev, node]);
          setSelectedLayerId(node.id);
        } else if (result.status === "failed") {
          setError("Generation failed on the backend.");
        } else if (!result.outputPath) {
          setError(
            "Generation completed, but no output image was produced (the image library may be unavailable on the backend).",
          );
        }
      } catch (generationError) {
        setError(
          generationError instanceof Error ? generationError.message : String(generationError),
        );
      } finally {
        if (unlisten) {
          try {
            unlisten();
          } catch (cleanupError) {
            console.warn("Failed to clean up progress listener", cleanupError);
          }
        }
        setIsGenerating(false);
      }
    },
    [settings, colorGuidance, layers.length, devMode],
  );

  // Generate from the current selection: the selected layer's result, or the
  // base original when the base is selected (selectedLayerId === null).
  const generate = useCallback(async () => {
    if (!baseImage || isGenerating) return;
    const source = selectedLayer ? selectedLayer.resultPath : baseImage.sourceImagePath;
    await runGeneration(selectedLayer ? selectedLayer.id : null, source);
  }, [baseImage, isGenerating, selectedLayer, runGeneration]);

  const regenerateFromBase = useCallback(async () => {
    if (!baseImage || isGenerating) return;
    setSelectedLayerId(null);
    await runGeneration(null, baseImage.sourceImagePath);
  }, [baseImage, isGenerating, runGeneration]);

  const regenerateFromLayer = useCallback(
    async (id: string) => {
      if (isGenerating) return;
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      setSelectedLayerId(id);
      await runGeneration(id, layer.resultPath);
    },
    [isGenerating, layers, runGeneration],
  );

  // Restore the saved project once on launch.
  useEffect(() => {
    void (async () => {
      try {
        const project = await loadProject();
        if (project) {
          setBaseImageState(project.baseImage);
          setLayers(project.layers);
          setSelectedLayerId(
            project.layers.length ? project.layers[project.layers.length - 1].id : null,
          );
        }
      } catch (loadError) {
        console.warn("Could not load saved project", loadError);
      } finally {
        hydratedRef.current = true;
      }
    })();
  }, []);

  // Persist the project whenever the base image or layer stack changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    void saveProject({ version: 1, baseImage, layers }).catch((saveError) =>
      console.warn("Could not save project", saveError),
    );
  }, [baseImage, layers]);

  return {
    isGenerating,
    progress,
    error,
    devMode,
    setDevMode,
    settings,
    setSetting,
    setModel,
    colorGuidance,
    setColorGuidance,
    appendColorGuidance,
    baseImage,
    layers,
    selectedLayerId,
    selectedLayer,
    setBaseImage,
    selectLayer,
    toggleLayerVisibility,
    renameLayer,
    deleteLayer,
    generate,
    regenerateFromBase,
    regenerateFromLayer,
  };
}

import { useCallback, useState } from "react";
import {
  GenerationProgress,
  GenerationRequest,
  GenerationResponse,
  listenToGenerationProgress,
  requestGeneration,
} from "../services/inference";

interface GenerationController {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  response: GenerationResponse | null;
  error: string | null;
  startGeneration: (request: GenerationRequest) => Promise<void>;
}

export function useGenerationController(): GenerationController {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async (request: GenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    setResponse(null);
    setProgress({
      current: 0,
      total: request.steps,
      percentage: 0,
    });

    let unlisten: (() => void) | undefined;

    try {
      try {
        unlisten = await listenToGenerationProgress((event) => {
          setProgress(event);
        });
      } catch (listenError) {
        console.warn("Failed to attach progress listener", listenError);
      }

      const result = await requestGeneration(request);
      setResponse(result);
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : String(generationError);
      setError(message);
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
  }, []);

  return { isGenerating, progress, response, error, startGeneration };
}

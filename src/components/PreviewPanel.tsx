import { Flex, Heading, ProgressBar, StatusLight, Text, View } from "@adobe/react-spectrum";
import { convertFileSrc } from "@tauri-apps/api/core";
import { GenerationProgress, GenerationResponse } from "../services/inference";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

interface PreviewPanelProps {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  response: GenerationResponse | null;
  error: string | null;
}

export function PreviewPanel({
  isGenerating,
  progress,
  response,
  error,
}: PreviewPanelProps): JSX.Element {
  const progressLabel = progress
    ? progress.message ?? `Step ${progress.current} of ${progress.total}`
    : "Preparing inference runtime";

  const completed = !isGenerating && response ? response : null;
  // Prefer the preprocessed image the model actually edited (same dimensions as
  // the output → aligned before/after); fall back to the raw uploaded file.
  const sourceImagePath =
    completed?.metadata.preparedSourcePath ?? completed?.metadata.sourceImagePath ?? null;

  return (
    <Flex direction="column" gap="size-300" height="100%" minHeight={0}>
      <Heading level={4}>Generation Output</Heading>
      <View
        flex={1}
        minHeight={0}
        borderWidth="thin"
        borderColor="gray-300"
        borderRadius="medium"
        padding="size-300"
        backgroundColor="gray-100"
      >
        {completed && completed.outputPath ? (
          <Flex direction="column" height="100%" minHeight={0} gap="size-200">
            <View flex={1} minHeight={0}>
              {sourceImagePath ? (
                <BeforeAfterSlider
                  beforeSrc={convertFileSrc(sourceImagePath)}
                  afterSrc={convertFileSrc(completed.outputPath)}
                />
              ) : (
                <img
                  src={convertFileSrc(completed.outputPath)}
                  alt="Repainted miniature result"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              )}
            </View>
            <Flex gap="size-300" wrap justifyContent="center">
              <Text>
                Model: <strong>{completed.metadata.model}</strong>
              </Text>
              <Text>
                Steps: <strong>{completed.metadata.steps}</strong>
              </Text>
              <Text>
                Guidance: <strong>{completed.metadata.guidanceScale.toFixed(1)}</strong>
              </Text>
            </Flex>
          </Flex>
        ) : (
          <Flex
            direction="column"
            height="100%"
            minHeight={0}
            alignItems="center"
            justifyContent="center"
            gap="size-200"
          >
            {!isGenerating && !response && !error && (
              <Text>
                Configure a prompt and click generate to produce a new miniature repainting concept.
              </Text>
            )}
            {isGenerating && (
              <Flex direction="column" gap="size-200" width="100%" maxWidth="size-4600">
                <Text>Generating imagery with the selected model…</Text>
                <ProgressBar
                  label={progressLabel}
                  value={progress?.percentage}
                  minValue={0}
                  maxValue={100}
                  isIndeterminate={!progress}
                  width="100%"
                />
              </Flex>
            )}
            {completed && !completed.outputPath && (
              <Text>
                Generation completed, but no output image was produced (the image library may be
                unavailable on the backend).
              </Text>
            )}
            {!isGenerating && error && <StatusLight variant="negative">{error}</StatusLight>}
          </Flex>
        )}
      </View>
    </Flex>
  );
}

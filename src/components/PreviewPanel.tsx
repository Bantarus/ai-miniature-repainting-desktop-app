import { Flex, Heading, ProgressBar, StatusLight, Text, View } from "@adobe/react-spectrum";
import { GenerationProgress, GenerationResponse } from "../services/inference";

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
    ? `Step ${progress.current} of ${progress.total}`
    : "Preparing inference runtime";

  return (
    <Flex direction="column" gap="size-300" height="100%">
      <Heading level={4}>Generation Output</Heading>
      <View
        flex={1}
        borderWidth="thin"
        borderColor="gray-800"
        borderRadius="medium"
        padding="size-300"
        backgroundColor="gray-900"
      >
        {!isGenerating && !response && !error && (
          <Text>Configure a prompt and click generate to produce a new miniature repainting concept.</Text>
        )}
        {isGenerating && (
          <Flex direction="column" gap="size-200">
            <Text>Generating imagery with the selected model…</Text>
            <ProgressBar
              label={progressLabel}
              value={progress?.percentage}
              minValue={0}
              maxValue={100}
              isIndeterminate={!progress}
            />
          </Flex>
        )}
        {response && !isGenerating && (
          <Flex direction="column" gap="size-200">
            <Text>Last generation completed successfully.</Text>
            <Text>
              Model: <strong>{response.metadata.model}</strong>
            </Text>
            <Text>
              Steps: <strong>{response.metadata.steps}</strong> | Guidance: <strong>{response.metadata.guidanceScale.toFixed(1)}</strong>
            </Text>
            {response.outputPath ? (
              <Text>Output stored at: {response.outputPath}</Text>
            ) : (
              <Text>The Python backend is not yet connected. Output paths will appear here once implemented.</Text>
            )}
          </Flex>
        )}
        {error && !isGenerating && (
          <StatusLight variant="negative">{error}</StatusLight>
        )}
      </View>
    </Flex>
  );
}

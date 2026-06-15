import { FormEvent, useState } from "react";
import {
  ActionButton,
  Button,
  Divider,
  Flex,
  Form,
  Item,
  Picker,
  Slider,
  Text,
  TextArea,
  View,
} from "@adobe/react-spectrum";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { GenerationRequest, InferenceModel } from "../services/inference";

interface PromptPanelProps {
  isGenerating: boolean;
  onSubmit: (request: GenerationRequest) => void;
}

// Per-model step/guidance presets. FLUX.2-klein is distilled (few-step); FLUX.1
// Kontext needs more steps. Selecting a model applies its preset.
const MODEL_PRESETS: Record<InferenceModel, { steps: number; guidanceScale: number }> = {
  "flux2-klein": { steps: 4, guidanceScale: 2.5 },
  "flux-kontext": { steps: 28, guidanceScale: 2.5 },
  "qwen-image-edit": { steps: 28, guidanceScale: 4.0 },
};

const DEFAULT_REQUEST: GenerationRequest = {
  // These models are instruction-driven: describe the edit to apply to the photo.
  prompt: "Repaint the miniature with a weathered bronze and emerald color scheme, crisp edge highlights",
  negativePrompt: "low detail, blurred, unfinished",
  model: "flux2-klein",
  steps: MODEL_PRESETS["flux2-klein"].steps,
  guidanceScale: MODEL_PRESETS["flux2-klein"].guidanceScale,
  sourceImagePath: undefined,
};

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"];

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function PromptPanel({ isGenerating, onSubmit }: PromptPanelProps): JSX.Element {
  const [formState, setFormState] = useState<GenerationRequest>(DEFAULT_REQUEST);

  const updateField = <K extends keyof GenerationRequest>(key: K, value: GenerationRequest[K]) => {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const chooseImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: "Select a miniature image to edit",
        filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
      });
      if (typeof selected === "string") {
        updateField("sourceImagePath", selected);
      }
    } catch (error) {
      console.error("Failed to open the image picker", error);
    }
  };

  const hasImage = Boolean(formState.sourceImagePath);

  return (
    <Flex direction="column" gap="size-200" height="100%">
      <Text>Prompt Composer</Text>
      <Divider size="S" />
      <Form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          if (!formState.sourceImagePath) {
            return;
          }
          onSubmit(formState);
        }}
        aria-label="Prompt configuration"
      >
        <Flex direction="column" gap="size-100">
          <Text>Source miniature image</Text>
          {formState.sourceImagePath ? (
            <Flex direction="column" gap="size-100">
              <View
                borderWidth="thin"
                borderColor="gray-300"
                borderRadius="medium"
                padding="size-100"
                backgroundColor="gray-50"
              >
                <img
                  src={convertFileSrc(formState.sourceImagePath)}
                  alt="Selected miniature"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text UNSAFE_style={{ fontSize: "12px", opacity: 0.75, wordBreak: "break-all" }}>
                {fileName(formState.sourceImagePath)}
              </Text>
              <Flex gap="size-100">
                <ActionButton onPress={() => void chooseImage()}>Replace…</ActionButton>
                <ActionButton onPress={() => updateField("sourceImagePath", undefined)}>
                  Remove
                </ActionButton>
              </Flex>
            </Flex>
          ) : (
            <View
              borderWidth="thick"
              borderColor="gray-300"
              borderRadius="medium"
              padding="size-300"
              backgroundColor="gray-50"
            >
              <Flex direction="column" alignItems="center" gap="size-150">
                <Text UNSAFE_style={{ textAlign: "center", opacity: 0.8 }}>
                  Choose a miniature photo to repaint
                </Text>
                <Button variant="primary" onPress={() => void chooseImage()}>
                  Choose image…
                </Button>
              </Flex>
            </View>
          )}
        </Flex>
        <TextArea
          label="Positive prompt"
          value={formState.prompt}
          onChange={(value) => updateField("prompt", value)}
          isRequired
          maxLength={500}
        />
        <TextArea
          label="Negative prompt"
          value={formState.negativePrompt ?? ""}
          onChange={(value) => updateField("negativePrompt", value)}
          maxLength={300}
        />
        <Picker
          label="Model"
          selectedKey={formState.model}
          onSelectionChange={(key) => {
            const model = key as InferenceModel;
            const preset = MODEL_PRESETS[model];
            setFormState((current) => ({
              ...current,
              model,
              steps: preset.steps,
              guidanceScale: preset.guidanceScale,
            }));
          }}
        >
          <Item key="flux2-klein">FLUX.2 Klein (recommended)</Item>
          <Item key="flux-kontext">FLUX.1 Kontext</Item>
          <Item key="qwen-image-edit">Qwen Image Edit (experimental)</Item>
        </Picker>
        <Slider
          label={`Steps: ${formState.steps}`}
          minValue={1}
          maxValue={80}
          step={1}
          value={formState.steps}
          onChange={(value) => updateField("steps", Number(value))}
        />
        <Slider
          label={`Guidance scale: ${formState.guidanceScale.toFixed(1)}`}
          minValue={0}
          maxValue={12}
          step={0.5}
          value={formState.guidanceScale}
          onChange={(value) => updateField("guidanceScale", Number(value))}
        />
        <Flex direction="column" gap="size-100">
          <Button variant="cta" type="submit" isDisabled={isGenerating || !hasImage}>
            {isGenerating ? "Generating..." : "Generate concept"}
          </Button>
          {!hasImage && <Text>Select a source image to enable generation.</Text>}
          {isGenerating && <Text>Inference is running in the background.</Text>}
        </Flex>
      </Form>
    </Flex>
  );
}

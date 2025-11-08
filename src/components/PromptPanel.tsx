import { FormEvent, useState } from "react";
import {
  Button,
  Divider,
  Flex,
  Form,
  Item,
  Picker,
  Slider,
  Text,
  TextArea,
} from "@adobe/react-spectrum";
import { GenerationRequest, InferenceModel } from "../services/inference";

interface PromptPanelProps {
  isGenerating: boolean;
  onSubmit: (request: GenerationRequest) => void;
}

const DEFAULT_REQUEST: GenerationRequest = {
  prompt: "Cinematic macro shot of a painted tabletop miniature, dramatic lighting",
  negativePrompt: "low detail, blurred, unfinished",
  model: "flux-kontext",
  steps: 30,
  guidanceScale: 6.5,
};

export function PromptPanel({ isGenerating, onSubmit }: PromptPanelProps): JSX.Element {
  const [formState, setFormState] = useState<GenerationRequest>(DEFAULT_REQUEST);

  const updateField = <K extends keyof GenerationRequest>(key: K, value: GenerationRequest[K]) => {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <Flex direction="column" gap="size-200" height="100%">
      <Text>Prompt Composer</Text>
      <Divider size="S" />
      <Form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit(formState);
        }}
        aria-label="Prompt configuration"
      >
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
          onSelectionChange={(key) => updateField("model", key as InferenceModel)}
        >
          <Item key="flux-kontext">FLUX Kontext (recommended)</Item>
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
          <Button variant="cta" type="submit" isDisabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate concept"}
          </Button>
          {isGenerating && <Text>Inference is running in the background.</Text>}
        </Flex>
      </Form>
    </Flex>
  );
}

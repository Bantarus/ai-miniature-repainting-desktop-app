import { FormEvent } from "react";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { Button } from "@react-spectrum/s2/Button";
import { Divider } from "@react-spectrum/s2/Divider";
import { Form } from "@react-spectrum/s2/Form";
import { Picker, PickerItem } from "@react-spectrum/s2/Picker";
import { Slider } from "@react-spectrum/s2/Slider";
import { TextArea } from "@react-spectrum/s2/TextArea";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { GenerationController } from "../hooks/useGenerationController";
import type { InferenceModel } from "../services/inference";
import { baseName } from "../services/layers";

interface PromptPanelProps {
  controller: GenerationController;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"];

export function PromptPanel({ controller }: PromptPanelProps): JSX.Element {
  const { settings, baseImage, colorGuidance, isGenerating, selectedLayer } = controller;

  const chooseImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: "Select a miniature image to edit",
        filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
      });
      if (typeof selected === "string") {
        controller.setBaseImage(selected, baseName(selected));
      }
    } catch (error) {
      console.error("Failed to open the image picker", error);
    }
  };

  const editingFrom = selectedLayer ? selectedLayer.name : "Base original";

  return (
    <div className={style({ display: "flex", flexDirection: "column", gap: 16, height: "full" })}>
      <h2 className={style({ font: "heading-sm", margin: 0 })}>Prompt Composer</h2>
      <Divider size="S" />
      <Form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void controller.generate();
        }}
        aria-label="Prompt configuration"
      >
        <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
          <span className={style({ font: "ui-sm" })}>Source miniature image</span>
          {baseImage ? (
            <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
              <div
                className={style({
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "gray-300",
                  borderRadius: "lg",
                  padding: 8,
                  backgroundColor: "gray-50",
                })}
              >
                <img
                  src={convertFileSrc(baseImage.sourceImagePath)}
                  alt="Base miniature"
                  className={style({
                    display: "block",
                    width: "full",
                    maxHeight: 200,
                    objectFit: "contain",
                    borderRadius: "sm",
                  })}
                />
              </div>
              <span
                className={style({
                  font: "body-xs",
                  color: "neutral-subdued",
                  wordBreak: "break-all",
                })}
              >
                {baseImage.name}
              </span>
              <ActionButton onPress={() => void chooseImage()}>Replace image…</ActionButton>
            </div>
          ) : (
            <div
              className={style({
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: "gray-300",
                borderRadius: "lg",
                padding: 24,
                backgroundColor: "gray-50",
              })}
            >
              <div
                className={style({
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                })}
              >
                <span
                  className={style({ font: "body-sm", textAlign: "center", color: "neutral-subdued" })}
                >
                  Choose a miniature photo to repaint
                </span>
                <Button variant="primary" onPress={() => void chooseImage()}>
                  Choose image…
                </Button>
              </div>
            </div>
          )}
        </div>

        <TextArea
          label="Positive prompt"
          value={settings.prompt}
          onChange={(value) => controller.setSetting("prompt", value)}
          isRequired
          maxLength={500}
        />

        {colorGuidance ? (
          <div
            className={style({
              display: "flex",
              flexDirection: "column",
              gap: 4,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "gray-300",
              borderRadius: "sm",
              padding: 8,
              backgroundColor: "gray-50",
            })}
          >
            <span className={style({ font: "ui-sm" })}>Palette guidance</span>
            <span className={style({ font: "body-xs", color: "neutral-subdued" })}>
              {colorGuidance}
            </span>
            <ActionButton isQuiet onPress={() => controller.setColorGuidance("")}>
              Clear palette guidance
            </ActionButton>
          </div>
        ) : null}

        {/* Advanced controls + model choice are dev-only; hobbyists always get
            the curated production model (FLUX.2 Klein) with no decisions to make. */}
        {controller.devMode && (
          <>
            <span className={style({ font: "ui-sm", color: "neutral-subdued" })}>
              Advanced (dev mode)
            </span>
            <TextArea
              label="Negative prompt"
              value={settings.negativePrompt}
              onChange={(value) => controller.setSetting("negativePrompt", value)}
              maxLength={300}
            />
            <Picker
              label="Model"
              value={settings.model}
              onChange={(key) => controller.setModel(key as InferenceModel)}
            >
              <PickerItem id="flux2-klein">FLUX.2 Klein (recommended)</PickerItem>
              <PickerItem id="flux-kontext">FLUX.1 Kontext</PickerItem>
              <PickerItem id="qwen-image-edit">Qwen Image Edit (experimental)</PickerItem>
            </Picker>
            <Slider
              label="Steps"
              minValue={1}
              maxValue={80}
              step={1}
              value={settings.steps}
              onChange={(value) => controller.setSetting("steps", Number(value))}
            />
            <Slider
              label="Guidance scale"
              minValue={0}
              maxValue={12}
              step={0.5}
              value={settings.guidanceScale}
              onChange={(value) => controller.setSetting("guidanceScale", Number(value))}
            />
          </>
        )}

        <div className={style({ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 })}>
          {baseImage ? (
            <span className={style({ font: "body-xs", color: "neutral-subdued" })}>
              Editing from: <strong>{editingFrom}</strong>
            </span>
          ) : null}
          <Button variant="accent" type="submit" isDisabled={isGenerating || !baseImage}>
            {isGenerating ? "Generating…" : "Generate"}
          </Button>
          {!baseImage && (
            <span className={style({ font: "body-xs", color: "neutral-subdued" })}>
              Select a source image to enable generation.
            </span>
          )}
        </div>
      </Form>
    </div>
  );
}

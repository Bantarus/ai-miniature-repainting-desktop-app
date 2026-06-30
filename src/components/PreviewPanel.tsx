import { ProgressBar } from "@react-spectrum/s2/ProgressBar";
import { StatusLight } from "@react-spectrum/s2/StatusLight";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { convertFileSrc } from "@tauri-apps/api/core";
import type { GenerationController } from "../hooks/useGenerationController";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

interface PreviewPanelProps {
  controller: GenerationController;
}

export function PreviewPanel({ controller }: PreviewPanelProps): JSX.Element {
  const { isGenerating, progress, error, baseImage, selectedLayer } = controller;

  const progressLabel = progress
    ? progress.message ?? `Step ${progress.current} of ${progress.total}`
    : "Preparing inference runtime";

  // The selected layer's aligned "before" is the exact preprocessed image the
  // model edited (same dimensions as the output); fall back to its raw source.
  const layerBefore = selectedLayer
    ? selectedLayer.preparedSourcePath ?? selectedLayer.sourceImagePath
    : null;

  const showLayer = !isGenerating && selectedLayer;
  const showBase = !isGenerating && !selectedLayer && baseImage;

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        gap: 24,
        height: "full",
        minHeight: 0,
      })}
    >
      <h2 className={style({ font: "heading-sm", margin: 0 })}>
        {showLayer ? selectedLayer.name : "Generation Output"}
      </h2>
      <div
        className={style({
          flexGrow: 1,
          minHeight: 0,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "gray-300",
          borderRadius: "lg",
          padding: 24,
          backgroundColor: "gray-100",
        })}
      >
        {showLayer ? (
          <div
            className={style({
              display: "flex",
              flexDirection: "column",
              height: "full",
              minHeight: 0,
              gap: 16,
            })}
          >
            <div className={style({ flexGrow: 1, minHeight: 0 })}>
              {layerBefore ? (
                <BeforeAfterSlider
                  beforeSrc={convertFileSrc(layerBefore)}
                  afterSrc={convertFileSrc(selectedLayer.resultPath)}
                />
              ) : (
                <img
                  src={convertFileSrc(selectedLayer.resultPath)}
                  alt="Repainted miniature result"
                  className={style({
                    width: "full",
                    height: "full",
                    objectFit: "contain",
                    borderRadius: "sm",
                  })}
                />
              )}
            </div>
            <div
              className={style({
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                justifyContent: "center",
                font: "body-sm",
              })}
            >
              <span>
                Model: <strong>{selectedLayer.model}</strong>
              </span>
              <span>
                Steps: <strong>{selectedLayer.steps}</strong>
              </span>
              <span>
                Guidance: <strong>{selectedLayer.guidanceScale.toFixed(1)}</strong>
              </span>
            </div>
          </div>
        ) : showBase ? (
          <div
            className={style({
              display: "flex",
              flexDirection: "column",
              height: "full",
              minHeight: 0,
              gap: 16,
              alignItems: "center",
            })}
          >
            <img
              src={convertFileSrc(baseImage.sourceImagePath)}
              alt="Base miniature"
              className={style({
                width: "full",
                flexGrow: 1,
                minHeight: 0,
                objectFit: "contain",
                borderRadius: "sm",
              })}
            />
            <span className={style({ font: "body-sm", color: "neutral-subdued" })}>
              Base original — generate an edit to start your layer stack.
            </span>
          </div>
        ) : (
          <div
            className={style({
              display: "flex",
              flexDirection: "column",
              height: "full",
              minHeight: 0,
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            })}
          >
            {!isGenerating && !baseImage && !error && (
              <p className={style({ font: "body", textAlign: "center", color: "neutral-subdued" })}>
                Choose a miniature photo and click Generate to start a repaint.
              </p>
            )}
            {isGenerating && (
              <div
                className={style({
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "full",
                  maxWidth: 368,
                })}
              >
                <p className={style({ font: "body", margin: 0, textAlign: "center" })}>
                  Generating imagery with the selected model…
                </p>
                <ProgressBar
                  label={progressLabel}
                  value={progress?.percentage}
                  minValue={0}
                  maxValue={100}
                  isIndeterminate={!progress}
                  styles={style({ width: "full" })}
                />
              </div>
            )}
            {!isGenerating && error && <StatusLight variant="negative">{error}</StatusLight>}
          </div>
        )}
      </div>
    </div>
  );
}

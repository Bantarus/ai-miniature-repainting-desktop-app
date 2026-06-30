import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { ActionButtonGroup } from "@react-spectrum/s2/ActionButtonGroup";
import { Button } from "@react-spectrum/s2/Button";
import { Image } from "@react-spectrum/s2/Image";
import { ListView, ListViewItem, Text, type Selection } from "@react-spectrum/s2/ListView";
import { ToggleButton } from "@react-spectrum/s2/ToggleButton";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { convertFileSrc } from "@tauri-apps/api/core";
import Delete from "@react-spectrum/s2/icons/Delete";
import Refresh from "@react-spectrum/s2/icons/Refresh";
import Visibility from "@react-spectrum/s2/icons/Visibility";
import VisibilityOff from "@react-spectrum/s2/icons/VisibilityOff";
import type { GenerationController } from "../hooks/useGenerationController";

interface LayersPanelProps {
  controller: GenerationController;
}

export function LayersPanel({ controller }: LayersPanelProps): JSX.Element {
  const { layers, selectedLayerId, baseImage, isGenerating } = controller;

  const onSelectionChange = (keys: Selection) => {
    if (keys === "all") return;
    const first = [...keys][0];
    controller.selectLayer(first != null ? String(first) : null);
  };

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "full",
        minHeight: 0,
      })}
    >
      <div
        className={style({
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        })}
      >
        <h2 className={style({ font: "heading-sm", margin: 0 })}>Layers</h2>
        <span className={style({ font: "body-xs", color: "neutral-subdued" })}>
          {layers.length}
        </span>
      </div>

      <ToggleButton
        isSelected={Boolean(baseImage) && selectedLayerId === null}
        isDisabled={!baseImage}
        onPress={() => controller.selectLayer(null)}
        styles={style({ width: "full" })}
      >
        Base original
      </ToggleButton>

      <ListView
        aria-label="Layer stack"
        items={layers}
        selectionMode="single"
        selectedKeys={selectedLayerId ? [selectedLayerId] : []}
        onSelectionChange={onSelectionChange}
        renderEmptyState={() => (
          <div
            className={style({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "full",
              padding: 16,
            })}
          >
            <span
              className={style({
                font: "body-xs",
                color: "neutral-subdued",
                textAlign: "center",
              })}
            >
              No layers yet. Generate an edit to create your first layer.
            </span>
          </div>
        )}
        styles={style({ flexGrow: 1, minHeight: 0, width: "full" })}
      >
        {(layer) => (
          <ListViewItem id={layer.id} textValue={layer.name}>
            <Image src={convertFileSrc(layer.resultPath)} alt="" />
            <Text>{layer.name}</Text>
            <Text slot="description">
              {layer.model} · {layer.steps} steps{layer.visible ? "" : " · hidden"}
            </Text>
            <ActionButtonGroup aria-label="Layer actions">
              <ActionButton
                aria-label={layer.visible ? "Hide layer" : "Show layer"}
                onPress={() => controller.toggleLayerVisibility(layer.id)}
              >
                {layer.visible ? <Visibility /> : <VisibilityOff />}
              </ActionButton>
              <ActionButton
                aria-label="Regenerate from this layer"
                isDisabled={isGenerating}
                onPress={() => void controller.regenerateFromLayer(layer.id)}
              >
                <Refresh />
              </ActionButton>
              <ActionButton
                aria-label="Delete layer"
                onPress={() => controller.deleteLayer(layer.id)}
              >
                <Delete />
              </ActionButton>
            </ActionButtonGroup>
          </ListViewItem>
        )}
      </ListView>

      <Button
        variant="secondary"
        isDisabled={!baseImage || isGenerating}
        onPress={() => void controller.regenerateFromBase()}
        styles={style({ width: "full" })}
      >
        Regenerate from base
      </Button>
    </div>
  );
}

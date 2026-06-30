import { useCallback, useRef, useState } from "react";

interface BeforeAfterSliderProps {
  /** Resolved asset URL for the original ("before") image. */
  beforeSrc: string;
  /** Resolved asset URL for the edited ("after") image. */
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

const HANDLE_SIZE = 36;

/**
 * A draggable before/after comparison slider.
 *
 * The "before" image is the backend's *preprocessed* source (same dimensions as
 * the output), so the two layers share one box. We still size a single "stage"
 * to the output's aspect ratio (measured on load) and `object-fit: contain` both
 * images into it — with matching dimensions that fills the stage exactly, keeping
 * the wipe aligned pixel-for-pixel without ever distorting either image.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterSliderProps): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  // Divider position as a percentage of the stage width (0 = all "after").
  const [position, setPosition] = useState(50);
  // Natural dimensions of the output image, used to shape the shared stage.
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((prev) => Math.max(0, prev - 2));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((prev) => Math.min(100, prev + 2));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPosition(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPosition(100);
    }
  }, []);

  // Until the output's dimensions are known, the stage fills the container; once
  // measured it takes the output's aspect ratio (contained within the container).
  const stageSizing: React.CSSProperties = dims
    ? { width: "100%", aspectRatio: `${dims.w} / ${dims.h}`, maxHeight: "100%" }
    : { width: "100%", height: "100%" };

  // Both layers are contained in the stage. The output matches the stage aspect
  // exactly (fills it); the preprocessed source shares its dimensions, so it fills
  // it too — aligned, never stretched.
  const imageStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    pointerEvents: "none",
    userSelect: "none",
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: 8,
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    background: "rgba(0, 0, 0, 0.55)",
    pointerEvents: "none",
    userSelect: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          ...stageSizing,
          position: "relative",
          overflow: "hidden",
          borderRadius: 8,
          touchAction: "none",
          cursor: "ew-resize",
          userSelect: "none",
        }}
      >
        {/* Base layer: the edited result. Measuring it shapes the stage. */}
        <img
          src={afterSrc}
          alt="Repainted miniature result"
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setDims({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
          style={imageStyle}
        />

        {/* Overlay layer: the original, clipped to the divider position. */}
        <img
          src={beforeSrc}
          alt="Original miniature"
          draggable={false}
          style={{
            ...imageStyle,
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        />

        <span style={{ ...labelStyle, left: 8 }}>{beforeLabel}</span>
        <span style={{ ...labelStyle, right: 8 }}>{afterLabel}</span>

        {/* Divider line. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${position}%`,
            width: 2,
            marginLeft: -1,
            background: "rgba(255, 255, 255, 0.9)",
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.6)",
            pointerEvents: "none",
          }}
        />

        {/* Draggable handle (keyboard-accessible slider thumb). */}
        <div
          role="slider"
          aria-label="Before/after comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{
            position: "absolute",
            top: "50%",
            left: `${position}%`,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            marginLeft: -HANDLE_SIZE / 2,
            marginTop: -HANDLE_SIZE / 2,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.95)",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#333",
            fontSize: 14,
            lineHeight: 1,
            cursor: "ew-resize",
          }}
        >
          {"↔"}
        </div>
      </div>
    </div>
  );
}

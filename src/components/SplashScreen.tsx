import { useEffect, useState } from "react";
import { DEFAULT_MODEL, listenToModelLoading, preloadModel } from "../services/inference";
import { isTauri } from "../services/env";

interface SplashScreenProps {
  /** Called once the model is resident (or the user chooses to continue anyway). */
  onReady: () => void;
}

/**
 * Modern bootstrap screen shown while the default model is preloaded into VRAM.
 * Listens to `model-loading-progress` events for live status, then hands off to
 * the main app. On failure it offers a retry or a "continue anyway" escape hatch
 * (the backend still lazy-loads on first generation).
 */
export function SplashScreen({ onReady }: SplashScreenProps): JSX.Element {
  const [status, setStatus] = useState("Starting up…");
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the preload effect (used by the Retry button).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      setError(null);
      setStatus("Starting up…");

      // The model, file dialog, generation, and library all go through Tauri's
      // IPC, which only exists in the desktop webview. In a plain browser, skip
      // the preload and hand off so the UI can still be previewed.
      if (!isTauri()) {
        if (!cancelled) {
          onReady();
        }
        return;
      }

      try {
        unlisten = await listenToModelLoading((event) => {
          if (!cancelled && event.message) {
            setStatus(event.message);
          }
        });
      } catch {
        // Progress is best-effort; the preload below still drives readiness.
      }

      try {
        await preloadModel(DEFAULT_MODEL);
        if (!cancelled) {
          onReady();
        }
      } catch (preloadError) {
        if (!cancelled) {
          setError(
            preloadError instanceof Error ? preloadError.message : String(preloadError),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [attempt, onReady]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(120% 120% at 50% 0%, #2a2150 0%, #171728 45%, #0e0e16 100%)",
        color: "#f3f3f7",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          width: 420,
          maxWidth: "80vw",
          padding: 24,
          animation: "splash-fade-in 480ms ease-out",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
            background: "linear-gradient(135deg, #7c5cff 0%, #c14bd8 100%)",
            boxShadow: "0 8px 28px rgba(124, 92, 255, 0.45)",
            animation: error ? "none" : "splash-logo-pulse 1.8s ease-in-out infinite",
          }}
        >
          {"🎨"}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.2 }}>
            AI Miniature Repainting
          </div>
          <div style={{ fontSize: 13, opacity: 0.62, marginTop: 4 }}>
            Real FLUX image editing · on-device
          </div>
        </div>

        {error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div
              style={{
                fontSize: 13,
                color: "#ff9b9b",
                textAlign: "center",
                maxWidth: 360,
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: "auto",
              }}
            >
              Couldn’t preload the model:
              <br />
              {error}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                style={primaryButtonStyle}
              >
                Retry
              </button>
              <button type="button" onClick={onReady} style={secondaryButtonStyle}>
                Continue anyway
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Indeterminate progress bar */}
            <div
              style={{
                position: "relative",
                height: 6,
                width: "100%",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #7c5cff, #c14bd8)",
                  animation: "splash-bar-indeterminate 1.25s ease-in-out infinite",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.78,
                textAlign: "center",
                minHeight: 18,
              }}
            >
              {status}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: "linear-gradient(135deg, #7c5cff 0%, #c14bd8 100%)",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "1px solid rgba(255, 255, 255, 0.25)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: "#e8e8ef",
  background: "transparent",
};

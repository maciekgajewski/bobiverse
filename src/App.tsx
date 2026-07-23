import { useCallback, useEffect, useRef, useState } from "react";
import { StarMap, type MapScale } from "./components/MapScene";
import { SystemDetails } from "./components/SystemDetails";
import { SystemDirectory } from "./components/SystemDirectory";
import { nearbySystems, nearbySystemsResult } from "./domain/data";
import {
  GALACTIC_STARFIELD_SOURCE_URL,
  GALACTIC_STARFIELD_UI_CREDIT,
} from "./domain/galactic-starfield";
import type { DistanceUnit } from "./domain/types";
import "./styles.css";

function canRenderWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function App() {
  const [unit, setUnit] = useState<DistanceUnit>("ly");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<
    "browser" | "inspector" | null
  >(null);
  const browserButton = useRef<HTMLButtonElement>(null);
  const inspectorButton = useRef<HTMLButtonElement>(null);
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [resetToken, setResetToken] = useState(0);
  const [mapScale, setMapScale] = useState<MapScale>({
    label: "1 ly",
    pixelWidth: 50,
  });
  const systems = nearbySystems?.systems ?? [];
  const selected = systems.find((system) => system.id === selectedId) ?? null;
  const updateMapScale = useCallback((nextScale: MapScale) => {
    setMapScale((current) =>
      current.label === nextScale.label &&
      current.pixelWidth === nextScale.pixelWidth
        ? current
        : nextScale,
    );
  }, []);

  useEffect(() => {
    const check = window.setTimeout(
      () => setWebgl(canRenderWebgl() ? "ready" : "unsupported"),
      0,
    );
    return () => window.clearTimeout(check);
  }, []);
  useEffect(() => {
    const update = window.setTimeout(
      () =>
        setMapScale((current) =>
          current.label.endsWith(` ${unit}`)
            ? current
            : { label: `1 ${unit}`, pixelWidth: 50 },
        ),
      0,
    );
    return () => window.clearTimeout(update);
  }, [unit]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !mobilePanel) return;
      const invoker =
        mobilePanel === "browser" ? browserButton : inspectorButton;
      setMobilePanel(null);
      window.setTimeout(() => invoker.current?.focus(), 0);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobilePanel]);
  const selectSystem = (id: string) => {
    setSelectedId(id);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    )
      setMobilePanel("inspector");
  };

  if (nearbySystemsResult.error || !nearbySystems)
    return (
      <main className="terminal-state error-state">
        <h1>Catalogue data error</h1>
        <p>
          {nearbySystemsResult.error ?? "The map dataset could not be loaded."}
        </p>
      </main>
    );
  if (systems.length === 0)
    return (
      <main className="terminal-state">
        <h1>No stellar systems available</h1>
        <p>The validated dataset contains no map markers.</p>
      </main>
    );

  return (
    <main className="app-shell">
      <a className="skip-link" href="#map-stage">
        Skip to star map
      </a>
      <header className="topbar">
        <div>
          <p className="eyebrow">Bobiverse · astronomy atlas</p>
          <h1>Near-star tactical map</h1>
        </div>
        <div className="topbar-actions">
          <button
            ref={browserButton}
            className="button mobile-command"
            aria-expanded={mobilePanel === "browser"}
            onClick={() => setMobilePanel("browser")}
          >
            Browse systems
          </button>
          {selected && (
            <button
              ref={inspectorButton}
              className="button mobile-command inspect-command"
              aria-expanded={mobilePanel === "inspector"}
              onClick={() => setMobilePanel("inspector")}
            >
              Inspect selection
            </button>
          )}
          <div className="unit-switch" aria-label="Distance unit">
            <button
              className={unit === "ly" ? "active" : ""}
              onClick={() => setUnit("ly")}
            >
              ly
            </button>
            <button
              className={unit === "pc" ? "active" : ""}
              onClick={() => setUnit("pc")}
            >
              pc
            </button>
          </div>
          <button
            className="button quiet"
            onClick={() => setResetToken((value) => value + 1)}
          >
            Reset view
          </button>
        </div>
      </header>
      <section className="atlas-grid" aria-label="Astronomy atlas workspace">
        <aside className="left-rail" aria-label="System browser">
          <div className="rail-heading">
            <p className="eyebrow">21 markers</p>
            <h2>Local volume</h2>
          </div>
          <SystemDirectory
            systems={systems}
            selectedId={selectedId}
            onSelect={selectSystem}
          />
        </aside>
        <section
          id="map-stage"
          className="map-frame"
          aria-label="Interactive three dimensional nearby stellar-system map"
        >
          {webgl === "checking" && (
            <div className="map-state">Preparing WebGL map…</div>
          )}
          {webgl === "unsupported" && (
            <div className="map-state error-state">
              <h2>WebGL unavailable</h2>
              <p>
                This browser cannot display the 3D map. You can still select and
                inspect systems in the directory.
              </p>
            </div>
          )}
          {webgl === "ready" && (
            <StarMap
              systems={systems}
              selectedId={selectedId}
              unit={unit}
              resetToken={resetToken}
              onSelect={selectSystem}
              onDeselect={() => setSelectedId(null)}
              onReady={() => undefined}
              onScaleChange={updateMapScale}
            />
          )}
          <div className="map-overlay">
            <span
              className="scale-line"
              style={{ width: `${mapScale.pixelWidth}px` }}
            />
            <span data-testid="map-scale-label">{mapScale.label}</span>
            <span className="orientation">
              Galactic plane · true linear scale
            </span>
          </div>
        </section>
        <aside className="right-rail">
          <SystemDetails system={selected} unit={unit} />
          <p className="shell-reserve">
            Narrative inspection will appear here as chapters are introduced.
          </p>
        </aside>
      </section>
      {mobilePanel && (
        <div
          className={`mobile-panel ${mobilePanel}`}
          role="dialog"
          aria-modal="true"
          aria-label={
            mobilePanel === "browser" ? "System browser" : "Selected system"
          }
        >
          <button
            className="button close-panel"
            onClick={() => {
              const invoker =
                mobilePanel === "browser" ? browserButton : inspectorButton;
              setMobilePanel(null);
              window.setTimeout(() => invoker.current?.focus(), 0);
            }}
          >
            Close
          </button>
          {mobilePanel === "browser" ? (
            <SystemDirectory
              systems={systems}
              selectedId={selectedId}
              onSelect={selectSystem}
            />
          ) : (
            <SystemDetails system={selected} unit={unit} />
          )}
        </div>
      )}
      <footer>
        <span>
          {nearbySystems.metadata.source.catalogue} ·{" "}
          {nearbySystems.metadata.source.release}
        </span>
        <span>{nearbySystems.metadata.source.acknowledgement}</span>
        <a
          href={GALACTIC_STARFIELD_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
        >
          {GALACTIC_STARFIELD_UI_CREDIT}
        </a>
      </footer>
    </main>
  );
}

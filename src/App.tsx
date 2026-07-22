import { useCallback, useEffect, useMemo, useState } from "react";
import { StarMap, type MapScale } from "./components/MapScene";
import { SystemDetails } from "./components/SystemDetails";
import { SystemDirectory } from "./components/SystemDirectory";
import { nearbySystems, nearbySystemsResult } from "./domain/data";
import { measurementDistancePc } from "./domain/measurement";
import type { DistanceUnit } from "./domain/types";
import { formatDistance } from "./domain/units";
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
  const [measurement, setMeasurement] = useState<
    [string | null, string | null]
  >([null, null]);
  const [measurementMode, setMeasurementMode] = useState(false);
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
  const endpointA = systems.find((system) => system.id === measurement[0]);
  const endpointB = systems.find((system) => system.id === measurement[1]);
  const measuredDistance = measurementDistancePc(endpointA, endpointB);
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

  const selectSystem = (id: string) => {
    setSelectedId(id);
    if (!measurementMode) return;
    setMeasurement(([first, second]) =>
      !first || (first && second)
        ? [id, null]
        : first === id
          ? [null, null]
          : [first, id],
    );
  };
  const status = useMemo(
    () =>
      measurementMode
        ? measurement[0]
          ? measurement[1]
            ? "Measurement locked"
            : "Choose endpoint B"
          : "Choose endpoint A"
        : "Navigation mode",
    [measurement, measurementMode],
  );

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
      <header className="topbar">
        <div>
          <p className="eyebrow">Bobiverse · astronomy atlas</p>
          <h1>Near-star tactical map</h1>
        </div>
        <div className="topbar-actions">
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
      <section className="atlas-grid">
        <aside className="left-rail">
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
              measurementIds={measurement}
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
          <section className="measurement-panel">
            <div className="measurement-header">
              <div>
                <p className="eyebrow">Straight-line tool</p>
                <h2>Measure systems</h2>
              </div>
              <button
                className={
                  measurementMode ? "button active-measurement" : "button"
                }
                aria-pressed={measurementMode}
                onClick={() => setMeasurementMode((active) => !active)}
              >
                {measurementMode ? "Stop" : "Measure"}
              </button>
            </div>
            <p className="measurement-status">{status}</p>
            <div className="endpoints">
              <span>
                <b>A</b> {endpointA?.name ?? "—"}
              </span>
              <span>
                <b>B</b> {endpointB?.name ?? "—"}
              </span>
            </div>
            {measuredDistance !== null ? (
              <output aria-label="Measured separation">
                {formatDistance(measuredDistance, unit)} straight-line
                separation
              </output>
            ) : (
              <p className="hint">
                In measure mode, select two systems from the map or directory.
              </p>
            )}
            <button
              className="button"
              onClick={() => setMeasurement([null, null])}
            >
              Clear endpoints
            </button>
          </section>
        </aside>
      </section>
      <footer>
        <span>
          {nearbySystems.metadata.source.catalogue} ·{" "}
          {nearbySystems.metadata.source.release}
        </span>
        <span>{nearbySystems.metadata.source.acknowledgement}</span>
      </footer>
    </main>
  );
}

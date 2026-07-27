import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StarMap, type MapScale } from "./components/MapScene";
import { ObjectBrowser } from "./components/ObjectBrowser";
import { ObjectInspector } from "./components/ObjectInspector";
import { TimelineDock } from "./components/TimelineDock";
import { nearbySystems, nearbySystemsResult } from "./domain/data";
import { mapDisplayConfig } from "./domain/config";
import {
  GALACTIC_STARFIELD_SOURCE_URL,
  GALACTIC_STARFIELD_UI_CREDIT,
} from "./domain/galactic-starfield";
import type { SelectionIdentity } from "./domain/selection";
import type { DistanceUnit, StellarSystem } from "./domain/types";
import { buildNarrativeBrowserGroups } from "./narrative/browser";
import {
  focusSystemIdForSelection,
  isSelectionEligibleForMap,
  projectNarrativeMap,
} from "./narrative/map";
import {
  generateNarrativeWorld,
  meaningfulNarrativeDateOptions,
  meaningfulNarrativeDates,
} from "./narrative/model";
import {
  confirmReadThrough,
  loadReaderProgress,
  normalizeReaderProgress,
  persistReaderProgress,
  returnToZeroState,
  selectDisplayDate,
  selectKnowledgeChapter,
  selectZeroKnowledgeView,
  setTimelineViewport,
  type ReaderProgress,
} from "./narrative/progress";
import { narrativeChapters, narrativeCorpus } from "./narrative/runtime";
import "./styles.css";

const EMPTY_SYSTEMS: StellarSystem[] = [];

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
  const [selection, setSelection] = useState<SelectionIdentity | null>(null);
  const [browserQuery, setBrowserQuery] = useState("");
  const [selectionStatus, setSelectionStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<
    "browser" | "inspector" | null
  >(null);
  const browserButton = useRef<HTMLButtonElement>(null);
  const inspectorButton = useRef<HTMLButtonElement>(null);
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [resetToken, setResetToken] = useState(0);
  const [progress, setProgress] = useState<ReaderProgress>(() => {
    const preliminary = loadReaderProgress(narrativeChapters, []);
    const dates = preliminary.viewChapter
      ? meaningfulNarrativeDates(narrativeCorpus, preliminary.viewChapter)
      : [];
    return loadReaderProgress(narrativeChapters, dates);
  });
  const [pendingReadThrough, setPendingReadThrough] = useState<string | null>(
    null,
  );
  const [mapScale, setMapScale] = useState<MapScale>({
    label: "1 ly",
    pixelWidth: 50,
  });
  const systems = nearbySystems?.systems ?? EMPTY_SYSTEMS;
  const meaningfulDateOptions = useMemo(
    () =>
      progress.viewChapter
        ? meaningfulNarrativeDateOptions(narrativeCorpus, progress.viewChapter)
        : [],
    [progress.viewChapter],
  );
  const meaningfulDates = useMemo(
    () => meaningfulDateOptions.map(({ date }) => date),
    [meaningfulDateOptions],
  );
  const meaningfulDateSources = useMemo(
    () =>
      new Map(
        meaningfulDateOptions.map(({ date, source_chapters }) => [
          date,
          source_chapters,
        ]),
      ),
    [meaningfulDateOptions],
  );
  const narrativeWorld = useMemo(
    () =>
      generateNarrativeWorld(
        narrativeCorpus,
        progress.viewChapter,
        progress.mode === "date" ? progress.displayDate : null,
      ),
    [progress.displayDate, progress.mode, progress.viewChapter],
  );
  const allBrowserGroups = useMemo(
    () => buildNarrativeBrowserGroups(narrativeWorld, progress.mode),
    [narrativeWorld, progress.mode],
  );
  const visibleBrowserGroups = useMemo(
    () =>
      buildNarrativeBrowserGroups(narrativeWorld, progress.mode, browserQuery),
    [browserQuery, narrativeWorld, progress.mode],
  );
  const mapProjection = useMemo(
    () =>
      projectNarrativeMap(
        narrativeWorld,
        systems,
        mapDisplayConfig.context_radius_ly,
        progress.mode,
      ),
    [narrativeWorld, progress.mode, systems],
  );
  const contextSystemIds = useMemo(
    () => new Set(mapProjection.contextSystems.map((system) => system.id)),
    [mapProjection.contextSystems],
  );
  const astronomySearchSystems = useMemo(
    () =>
      mapProjection.contextSystems.filter(
        (system) => !mapProjection.knownSystemIds.has(system.id),
      ),
    [mapProjection.contextSystems, mapProjection.knownSystemIds],
  );
  const viewStatus =
    progress.viewChapter && progress.displayDate
      ? `Universe in ${progress.displayDate.split(".", 1)[0]} · Knowledge through Chapter ${progress.viewChapter}`
      : "Pre-book zero state";
  const selectedNarrativeItem =
    selection?.kind === "narrative"
      ? (allBrowserGroups
          .flatMap((group) => group.items)
          .find((item) => item.entity.id === selection.id) ?? null)
      : null;
  const selectedMapId = focusSystemIdForSelection(
    selection,
    narrativeWorld,
    contextSystemIds,
  );
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
    persistReaderProgress(progress);
  }, [progress]);

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
  const selectObject = (nextSelection: SelectionIdentity) => {
    setSelection(nextSelection);
    const name =
      nextSelection.kind === "astronomy"
        ? systems.find((system) => system.id === nextSelection.id)?.name
        : narrativeWorld.entities.find(
            (entity) => entity.id === nextSelection.id,
          )?.name;
    setSelectionStatus(`${String(name ?? "Object")} selected.`);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    )
      setMobilePanel("inspector");
  };
  const updateProgress = (next: ReaderProgress) => {
    const dates = next.viewChapter
      ? meaningfulNarrativeDates(narrativeCorpus, next.viewChapter)
      : [];
    const normalized = normalizeReaderProgress(next, narrativeChapters, dates);
    if (selection) {
      const nextWorld = generateNarrativeWorld(
        narrativeCorpus,
        normalized.viewChapter,
        normalized.mode === "date" ? normalized.displayDate : null,
      );
      const nextProjection = projectNarrativeMap(
        nextWorld,
        systems,
        mapDisplayConfig.context_radius_ly,
        normalized.mode,
      );
      const nextContextIds = new Set(
        nextProjection.contextSystems.map((system) => system.id),
      );
      if (!isSelectionEligibleForMap(selection, nextWorld, nextContextIds)) {
        setSelection(null);
        setSelectionStatus(
          "Selection cleared because the object is not eligible in this view.",
        );
      }
    }
    setProgress(normalized);
  };
  const selectKnowledge = (chapter: string) =>
    updateProgress(
      selectKnowledgeChapter(progress, chapter, narrativeChapters),
    );
  const selectDate = (date: string) =>
    updateProgress(selectDisplayDate(progress, date, meaningfulDates));
  const toggleBrowserGroup = (group: keyof ReaderProgress["browserGroups"]) =>
    setProgress((current) => ({
      ...current,
      browserGroups: {
        ...current.browserGroups,
        [group]: !current.browserGroups[group],
      },
    }));

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
          <p className="view-status" aria-live="polite">
            {viewStatus}
          </p>
          <button
            ref={browserButton}
            className="button mobile-command"
            aria-expanded={mobilePanel === "browser"}
            onClick={() => setMobilePanel("browser")}
          >
            Browse objects
          </button>
          {selection && (
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
      <p className="selection-status" role="status" aria-live="polite">
        {selectionStatus}
      </p>
      <section className="atlas-grid" aria-label="Narrative atlas workspace">
        <aside className="left-rail" aria-label="Object browser">
          <div className="rail-heading">
            <p className="eyebrow">Spoiler-safe projection</p>
            <h2>Object browser</h2>
          </div>
          <ObjectBrowser
            groups={visibleBrowserGroups}
            astronomySystems={astronomySearchSystems}
            mode={progress.mode}
            query={browserQuery}
            idPrefix="desktop"
            expanded={progress.browserGroups}
            selection={selection}
            onQuery={setBrowserQuery}
            onToggle={toggleBrowserGroup}
            onSelect={selectObject}
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
              systems={mapProjection.contextSystems}
              selectedId={selectedMapId}
              knownSystemIds={mapProjection.knownSystemIds}
              activeSystemIds={mapProjection.activeSystemIds}
              unit={unit}
              resetToken={resetToken}
              onSelect={(id) => {
                const narrativeId =
                  mapProjection.narrativeSystemIdsByAstronomyId.get(id);
                selectObject(
                  narrativeId
                    ? { kind: "narrative", id: narrativeId }
                    : { kind: "astronomy", id },
                );
              }}
              onDeselect={() => {
                setSelection(null);
                setSelectionStatus("Selection cleared.");
              }}
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
            <span className="map-narrative-badge" aria-live="polite">
              {viewStatus}
            </span>
            <span className="narrative-projection-status">
              {narrativeWorld.view.chapter
                ? `${narrativeWorld.entities.length} projected narrative records`
                : "Pre-book projection"}
            </span>
          </div>
        </section>
        <aside className="right-rail" aria-label="Object inspector">
          <ObjectInspector
            selection={selection}
            narrativeItem={selectedNarrativeItem}
            world={narrativeWorld}
            systems={mapProjection.contextSystems}
            knownAstronomySystemIds={mapProjection.knownSystemIds}
            assets={narrativeCorpus.assets}
            unit={unit}
            headingId="desktop-object-details-heading"
            onSelect={selectObject}
          />
        </aside>
      </section>
      <TimelineDock
        chapters={narrativeChapters}
        progress={progress}
        meaningfulDates={meaningfulDates}
        meaningfulDateSources={meaningfulDateSources}
        pendingReadThrough={pendingReadThrough}
        onReadThroughChoice={setPendingReadThrough}
        onConfirmReadThrough={() => {
          if (pendingReadThrough === null) return;
          updateProgress(
            pendingReadThrough === ""
              ? returnToZeroState(progress)
              : confirmReadThrough(
                  progress,
                  pendingReadThrough,
                  narrativeChapters,
                ),
          );
          setPendingReadThrough(null);
        }}
        onCancelReadThrough={() => setPendingReadThrough(null)}
        onReturnToZeroState={() => {
          updateProgress(selectZeroKnowledgeView(progress));
          setPendingReadThrough(null);
        }}
        onKnowledgeChapter={selectKnowledge}
        onDate={selectDate}
        onChapterMode={() => {
          if (!progress.viewChapter) return;
          updateProgress(
            selectKnowledgeChapter(
              { ...progress, mode: "chapter" },
              progress.viewChapter,
              narrativeChapters,
            ),
          );
        }}
        onZoom={(delta) =>
          updateProgress(
            setTimelineViewport(
              progress,
              progress.timelineZoom + delta,
              progress.timelinePan,
            ),
          )
        }
        onPan={(delta) =>
          updateProgress(
            setTimelineViewport(
              progress,
              progress.timelineZoom,
              progress.timelinePan + delta,
            ),
          )
        }
      />
      {mobilePanel && (
        <div
          className={`mobile-panel ${mobilePanel}`}
          role="dialog"
          aria-modal="true"
          aria-label={
            mobilePanel === "browser" ? "Object browser" : "Selected object"
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
            <ObjectBrowser
              groups={visibleBrowserGroups}
              astronomySystems={astronomySearchSystems}
              mode={progress.mode}
              query={browserQuery}
              idPrefix="compact"
              expanded={progress.browserGroups}
              selection={selection}
              onQuery={setBrowserQuery}
              onToggle={toggleBrowserGroup}
              onSelect={selectObject}
            />
          ) : (
            <ObjectInspector
              selection={selection}
              narrativeItem={selectedNarrativeItem}
              world={narrativeWorld}
              systems={mapProjection.contextSystems}
              knownAstronomySystemIds={mapProjection.knownSystemIds}
              assets={narrativeCorpus.assets}
              unit={unit}
              headingId="compact-object-details-heading"
              onSelect={selectObject}
            />
          )}
        </div>
      )}
      <footer>
        <span>GCNS · CNS5 · Gaia DR3 · WDS</span>
        <span>
          {Object.values(nearbySystems.metadata.sources)
            .map((source) => source.acknowledgement)
            .join(" ")}
        </span>
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

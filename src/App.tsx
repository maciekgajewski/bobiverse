import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
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
import type { StellarSystem } from "./domain/types";
import { DISPLAY_DISTANCE_UNIT } from "./domain/units";
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
  type NarrativeWorld,
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
const EMPTY_NARRATIVE_WORLD: NarrativeWorld = {
  entities: [],
  activity: [],
  view: { chapter: null, display_date: null },
};
const FOCUSABLE_PANEL_ELEMENTS =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function projectionErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown narrative projection error.";
}

function loadInitialReaderState(): {
  progress: ReaderProgress;
  projectionError: string | null;
} {
  const preliminary = loadReaderProgress(narrativeChapters, []);
  try {
    const dates = preliminary.viewChapter
      ? meaningfulNarrativeDates(narrativeCorpus, preliminary.viewChapter)
      : [];
    return {
      progress: loadReaderProgress(narrativeChapters, dates),
      projectionError: null,
    };
  } catch (error) {
    return {
      progress: preliminary,
      projectionError: projectionErrorMessage(error),
    };
  }
}

function canRenderWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function App() {
  const [selection, setSelection] = useState<SelectionIdentity | null>(null);
  const [browserQuery, setBrowserQuery] = useState("");
  const [selectionStatus, setSelectionStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<
    "browser" | "inspector" | "timeline" | null
  >(null);
  const browserButton = useRef<HTMLButtonElement>(null);
  const inspectorButton = useRef<HTMLButtonElement>(null);
  const timelineButton = useRef<HTMLButtonElement>(null);
  const mobilePanelElement = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [resetToken, setResetToken] = useState(0);
  const [initialReaderState] = useState(loadInitialReaderState);
  const [progress, setProgress] = useState<ReaderProgress>(
    initialReaderState.progress,
  );
  const [transitionProjectionError, setTransitionProjectionError] = useState<
    string | null
  >(initialReaderState.projectionError);
  const [pendingReadThrough, setPendingReadThrough] = useState<string | null>(
    null,
  );
  const [mapScale, setMapScale] = useState<MapScale>({
    label: `1 ${DISPLAY_DISTANCE_UNIT}`,
    pixelWidth: 50,
  });
  const systems = nearbySystems?.systems ?? EMPTY_SYSTEMS;
  const narrativeProjectionResult = useMemo(() => {
    try {
      const dateOptions = progress.viewChapter
        ? meaningfulNarrativeDateOptions(narrativeCorpus, progress.viewChapter)
        : [];
      const world = generateNarrativeWorld(
        narrativeCorpus,
        progress.viewChapter,
        progress.mode === "date" ? progress.displayDate : null,
      );
      return { dateOptions, error: null, world };
    } catch (error) {
      return {
        dateOptions: [],
        error: projectionErrorMessage(error),
        world: EMPTY_NARRATIVE_WORLD,
      };
    }
  }, [progress.displayDate, progress.mode, progress.viewChapter]);
  const meaningfulDateOptions = narrativeProjectionResult.dateOptions;
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
  const narrativeWorld = narrativeProjectionResult.world;
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
    persistReaderProgress(progress);
  }, [progress]);

  const invokerForPanel = useCallback(
    (
      panel: "browser" | "inspector" | "timeline",
    ): RefObject<HTMLButtonElement | null> =>
      panel === "browser"
        ? browserButton
        : panel === "inspector"
          ? inspectorButton
          : timelineButton,
    [],
  );
  const closeMobilePanel = useCallback(() => {
    if (!mobilePanel) return;
    const invoker = invokerForPanel(mobilePanel);
    setMobilePanel(null);
    window.setTimeout(() => invoker.current?.focus(), 0);
  }, [invokerForPanel, mobilePanel]);

  useEffect(() => {
    if (!mobilePanel) return;
    const focus = window.setTimeout(() => {
      mobilePanelElement.current
        ?.querySelector<HTMLElement>(FOCUSABLE_PANEL_ELEMENTS)
        ?.focus();
    }, 0);
    return () => window.clearTimeout(focus);
  }, [mobilePanel]);

  useEffect(() => {
    if (!mobilePanel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pendingReadThrough === null) {
        event.preventDefault();
        closeMobilePanel();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeMobilePanel, mobilePanel, pendingReadThrough]);

  useEffect(() => {
    if (!mobilePanel || typeof window.matchMedia !== "function") return;
    const compactLayout = window.matchMedia("(max-width: 1199px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) return;
      const panel = mobilePanel;
      setPendingReadThrough(null);
      setMobilePanel(null);
      window.setTimeout(() => {
        const destination =
          panel === "timeline"
            ? document.getElementById("desktop-read-through")
            : panel === "browser"
              ? document.querySelector<HTMLElement>(".left-rail input")
              : document.querySelector<HTMLElement>(
                  ".right-rail button, .right-rail a, .topbar .button",
                );
        destination?.focus();
      }, 0);
    };
    compactLayout.addEventListener("change", closeAtDesktop);
    return () => compactLayout.removeEventListener("change", closeAtDesktop);
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
    try {
      const dates = next.viewChapter
        ? meaningfulNarrativeDates(narrativeCorpus, next.viewChapter)
        : [];
      const normalized = normalizeReaderProgress(
        next,
        narrativeChapters,
        dates,
      );
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
      setTransitionProjectionError(null);
    } catch (error) {
      setTransitionProjectionError(projectionErrorMessage(error));
    }
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
  const confirmPendingReadThrough = () => {
    if (pendingReadThrough === null) return;
    updateProgress(
      pendingReadThrough === ""
        ? returnToZeroState(progress)
        : confirmReadThrough(progress, pendingReadThrough, narrativeChapters),
    );
    setPendingReadThrough(null);
  };
  const returnToZeroKnowledge = () => {
    updateProgress(selectZeroKnowledgeView(progress));
    setPendingReadThrough(null);
  };
  const returnToChapterMode = () => {
    if (!progress.viewChapter) return;
    updateProgress(
      selectKnowledgeChapter(
        { ...progress, mode: "chapter" },
        progress.viewChapter,
        narrativeChapters,
      ),
    );
  };
  const zoomTimeline = (delta: number) =>
    updateProgress(
      setTimelineViewport(
        progress,
        progress.timelineZoom + delta,
        progress.timelinePan,
      ),
    );
  const panTimeline = (delta: number) =>
    updateProgress(
      setTimelineViewport(
        progress,
        progress.timelineZoom,
        progress.timelinePan + delta,
      ),
    );

  if (nearbySystemsResult.error || !nearbySystems)
    return (
      <main className="terminal-state error-state">
        <h1>Catalogue data error</h1>
        <p>
          {nearbySystemsResult.error ?? "The map dataset could not be loaded."}
        </p>
        <p>
          Reload the application. If the problem persists, report this message.
        </p>
      </main>
    );
  if (systems.length === 0)
    return (
      <main className="terminal-state">
        <h1>No stellar systems available</h1>
        <p>
          The validated dataset contains no map markers. Regenerate the
          astronomy catalogue before opening the atlas again.
        </p>
      </main>
    );
  const projectionError =
    transitionProjectionError ?? narrativeProjectionResult.error;
  if (projectionError)
    return (
      <main className="terminal-state error-state">
        <h1>Narrative projection unavailable</h1>
        <p>{projectionError}</p>
        <p>
          Reload the application. If the problem persists, report this message.
        </p>
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
          <button
            ref={timelineButton}
            className="button mobile-command timeline-command"
            aria-expanded={mobilePanel === "timeline"}
            onClick={() => setMobilePanel("timeline")}
          >
            Timeline and progress
          </button>
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
          {mapProjection.missingAstronomySystemIds.size > 0 ? (
            <div className="map-state error-state">
              <h2>Astronomy coverage unavailable</h2>
              <p>
                The validated catalogue is missing{" "}
                {[...mapProjection.missingAstronomySystemIds].join(", ")}. The
                object browser and reader-safe details remain available.
              </p>
            </div>
          ) : (
            <>
              {webgl === "checking" && (
                <div className="map-state">Preparing WebGL map…</div>
              )}
              {webgl === "unsupported" && (
                <div className="map-state error-state">
                  <h2>WebGL unavailable</h2>
                  <p>
                    This browser cannot display the 3D map. You can still select
                    and inspect systems in the object browser.
                  </p>
                </div>
              )}
              {webgl === "ready" && (
                <StarMap
                  systems={mapProjection.contextSystems}
                  selectedId={selectedMapId}
                  knownSystemIds={mapProjection.knownSystemIds}
                  activeSystemIds={mapProjection.activeSystemIds}
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
            </>
          )}
          <span className="map-narrative-badge" aria-live="polite">
            {viewStatus}
          </span>
          <div className="map-overlay">
            <span
              className="scale-line"
              style={{ width: `${mapScale.pixelWidth}px` }}
            />
            <span data-testid="map-scale-label">{mapScale.label}</span>
            <span className="orientation">
              Galactic plane · true linear scale
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
            headingId="desktop-object-details-heading"
            onSelect={selectObject}
          />
        </aside>
      </section>
      <TimelineDock
        idPrefix="desktop"
        renderConfirmation={mobilePanel !== "timeline"}
        chapters={narrativeChapters}
        progress={progress}
        meaningfulDates={meaningfulDates}
        meaningfulDateSources={meaningfulDateSources}
        pendingReadThrough={pendingReadThrough}
        onReadThroughChoice={setPendingReadThrough}
        onConfirmReadThrough={confirmPendingReadThrough}
        onCancelReadThrough={() => setPendingReadThrough(null)}
        onReturnToZeroState={returnToZeroKnowledge}
        onKnowledgeChapter={selectKnowledge}
        onDate={selectDate}
        onChapterMode={returnToChapterMode}
        onZoom={zoomTimeline}
        onPan={panTimeline}
      />
      {mobilePanel && (
        <>
          <div className="compact-panel-backdrop" aria-hidden="true" />
          <div
            className={`mobile-panel ${mobilePanel}`}
            ref={mobilePanelElement}
            role="dialog"
            aria-modal="true"
            aria-label={
              mobilePanel === "browser"
                ? "Object browser"
                : mobilePanel === "inspector"
                  ? "Selected object"
                  : "Timeline and progress"
            }
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable =
                mobilePanelElement.current?.querySelectorAll<HTMLElement>(
                  FOCUSABLE_PANEL_ELEMENTS,
                );
              if (!focusable?.length) return;
              const first = focusable[0]!;
              const last = focusable[focusable.length - 1]!;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <button className="button close-panel" onClick={closeMobilePanel}>
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
            ) : mobilePanel === "inspector" ? (
              <ObjectInspector
                selection={selection}
                narrativeItem={selectedNarrativeItem}
                world={narrativeWorld}
                systems={mapProjection.contextSystems}
                knownAstronomySystemIds={mapProjection.knownSystemIds}
                assets={narrativeCorpus.assets}
                headingId="compact-object-details-heading"
                onSelect={selectObject}
              />
            ) : (
              <>
                <div className="compact-timeline-heading">
                  <p className="eyebrow">Spoiler-safe navigation</p>
                  <h2>Timeline and progress</h2>
                </div>
                <TimelineDock
                  idPrefix="compact"
                  chapters={narrativeChapters}
                  progress={progress}
                  meaningfulDates={meaningfulDates}
                  meaningfulDateSources={meaningfulDateSources}
                  pendingReadThrough={pendingReadThrough}
                  onReadThroughChoice={setPendingReadThrough}
                  onConfirmReadThrough={confirmPendingReadThrough}
                  onCancelReadThrough={() => setPendingReadThrough(null)}
                  onReturnToZeroState={returnToZeroKnowledge}
                  onKnowledgeChapter={selectKnowledge}
                  onDate={selectDate}
                  onChapterMode={returnToChapterMode}
                  onZoom={zoomTimeline}
                  onPan={panTimeline}
                />
              </>
            )}
          </div>
        </>
      )}
      <footer>
        <span>GCNS · CNS5 · Gaia DR3 · WDS · Kirkpatrick 20-pc census</span>
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

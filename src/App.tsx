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
import {
  focusPath as buildSystemFocusPath,
  initialSystemFocusPath,
  nearestSystemViewNode,
  projectSystemView,
  retreatSystemFocusPath,
  type SystemViewModel,
} from "./domain/system-view";
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
  projectNarrativeChapterDetail,
  type MeaningfulNarrativeDate,
  type NarrativeChapterDetail,
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
import {
  narrativeChapters,
  narrativeCorpus,
  narrativePreparationError,
} from "./narrative/runtime";
import "./styles.css";

const EMPTY_SYSTEMS: StellarSystem[] = [];
const EMPTY_NARRATIVE_WORLD: NarrativeWorld = {
  entities: [],
  activity: [],
  view: { chapter: null, display_date: null },
};
type NarrativeMapProjection = ReturnType<typeof projectNarrativeMap>;
interface ApplicationProjection {
  progress: ReaderProgress;
  dateOptions: readonly MeaningfulNarrativeDate[];
  world: NarrativeWorld;
  chapterDetail: NarrativeChapterDetail | null;
  map: NarrativeMapProjection;
  error: string | null;
}
interface InspectorHistory {
  entries: readonly SelectionIdentity[];
  index: number;
}
interface SystemModeState {
  systemId: string;
  focusPath: readonly string[];
  preEntrySelection: SelectionIdentity | null;
  preEntryInspectorHistory: InspectorHistory;
}
const EMPTY_INSPECTOR_HISTORY: InspectorHistory = {
  entries: [],
  index: -1,
};
const FOCUSABLE_PANEL_ELEMENTS =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function projectionErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown narrative projection error.";
}

function emptyMapProjection(): NarrativeMapProjection {
  return {
    knownSystemIds: new Set(),
    missingAstronomySystemIds: new Set(),
    narrativeSystemIdsByAstronomyId: new Map(),
    activeSystemIds: new Set(),
    contextSystems: [],
  };
}

function sameSelection(
  left: SelectionIdentity,
  right: SelectionIdentity,
): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function rootInspectorHistory(selection: SelectionIdentity): InspectorHistory {
  return { entries: [selection], index: 0 };
}

function projectReaderProgress(
  next: ReaderProgress,
  systems: readonly StellarSystem[],
): ApplicationProjection {
  if (!narrativeCorpus) {
    throw new Error(
      narrativePreparationError ?? "Narrative corpus preparation failed.",
    );
  }
  const initialOptions = next.viewChapter
    ? meaningfulNarrativeDateOptions(narrativeCorpus, next.viewChapter)
    : [];
  const progress = normalizeReaderProgress(
    next,
    narrativeChapters,
    initialOptions.map(({ date }) => date),
  );
  const dateOptions =
    progress.viewChapter === next.viewChapter
      ? initialOptions
      : progress.viewChapter
        ? meaningfulNarrativeDateOptions(narrativeCorpus, progress.viewChapter)
        : [];
  const world = generateNarrativeWorld(
    narrativeCorpus,
    progress.viewChapter,
    progress.mode === "date" ? progress.displayDate : null,
  );
  const chapterDetail =
    progress.mode === "chapter" && progress.viewChapter
      ? projectNarrativeChapterDetail(
          narrativeCorpus,
          progress.viewChapter,
          world,
        )
      : null;
  return {
    progress,
    dateOptions,
    world,
    chapterDetail,
    map: projectNarrativeMap(
      world,
      systems,
      mapDisplayConfig.context_radius_ly,
      progress.mode,
    ),
    error: null,
  };
}

function loadInitialProjection(
  systems: readonly StellarSystem[],
): ApplicationProjection {
  const preliminary = loadReaderProgress(narrativeChapters, []);
  try {
    if (!narrativeCorpus) {
      throw new Error(
        narrativePreparationError ?? "Narrative corpus preparation failed.",
      );
    }
    const initialOptions = preliminary.viewChapter
      ? meaningfulNarrativeDateOptions(narrativeCorpus, preliminary.viewChapter)
      : [];
    return projectReaderProgress(
      loadReaderProgress(
        narrativeChapters,
        initialOptions.map(({ date }) => date),
      ),
      systems,
    );
  } catch (error) {
    return {
      progress: preliminary,
      dateOptions: [],
      world: EMPTY_NARRATIVE_WORLD,
      chapterDetail: null,
      map: emptyMapProjection(),
      error: projectionErrorMessage(error),
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
  const systems = nearbySystems?.systems ?? EMPTY_SYSTEMS;
  const [selection, setSelection] = useState<SelectionIdentity | null>(null);
  const [inspectorHistory, setInspectorHistory] = useState<InspectorHistory>(
    EMPTY_INSPECTOR_HISTORY,
  );
  const [browserQuery, setBrowserQuery] = useState("");
  const [selectionStatus, setSelectionStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<
    "browser" | "inspector" | "timeline" | null
  >(null);
  const browserButton = useRef<HTMLButtonElement>(null);
  const inspectorButton = useRef<HTMLButtonElement>(null);
  const timelineButton = useRef<HTMLButtonElement>(null);
  const mobilePanelElement = useRef<HTMLDivElement>(null);
  const systemExitSelectionOverride = useRef<SelectionIdentity | undefined>(
    undefined,
  );
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [resetToken, setResetToken] = useState(0);
  const [systemMode, setSystemMode] = useState<SystemModeState | null>(null);
  const [systemKeyboardFocusId, setSystemKeyboardFocusId] = useState<
    string | null
  >(null);
  const [applicationProjection, setApplicationProjection] = useState(() =>
    loadInitialProjection(systems),
  );
  const progress = applicationProjection.progress;
  const [pendingReadThrough, setPendingReadThrough] = useState<string | null>(
    null,
  );
  const [mapScale, setMapScale] = useState<MapScale>({
    label: `1 ${DISPLAY_DISTANCE_UNIT}`,
    pixelWidth: 50,
  });
  const meaningfulDateOptions = applicationProjection.dateOptions;
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
  const narrativeWorld = applicationProjection.world;
  const projectedSystemView = useMemo<SystemViewModel | null>(
    () =>
      systemMode
        ? projectSystemView(narrativeWorld, systemMode.systemId, progress.mode)
        : null,
    [narrativeWorld, progress.mode, systemMode],
  );
  const selectedChapterDetail =
    selection?.kind === "chapter" &&
    applicationProjection.chapterDetail?.chapter === selection.id
      ? applicationProjection.chapterDetail
      : null;
  const allBrowserGroups = useMemo(
    () => buildNarrativeBrowserGroups(narrativeWorld, progress.mode),
    [narrativeWorld, progress.mode],
  );
  const visibleBrowserGroups = useMemo(
    () =>
      buildNarrativeBrowserGroups(narrativeWorld, progress.mode, browserQuery),
    [browserQuery, narrativeWorld, progress.mode],
  );
  const mapProjection = applicationProjection.map;
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
  const selectedEntrySystemView = useMemo(
    () =>
      selectedNarrativeItem?.entity.entity_type === "location" &&
      selectedNarrativeItem.entity.kind === "star_system"
        ? projectSystemView(
            narrativeWorld,
            selectedNarrativeItem.entity.id,
            progress.mode,
          )
        : null,
    [narrativeWorld, progress.mode, selectedNarrativeItem],
  );
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
  useEffect(() => {
    const leaveOnBack = () => {
      if (!systemMode) return;
      const override = systemExitSelectionOverride.current;
      const exitSelection = override ?? systemMode.preEntrySelection;
      setSelection(exitSelection);
      setInspectorHistory(
        override
          ? rootInspectorHistory(override)
          : systemMode.preEntryInspectorHistory,
      );
      systemExitSelectionOverride.current = undefined;
      setSystemKeyboardFocusId(null);
      setSelectionStatus("Returned to the interstellar map.");
      setSystemMode(null);
    };
    window.addEventListener("popstate", leaveOnBack);
    return () => window.removeEventListener("popstate", leaveOnBack);
  }, [systemMode]);
  useEffect(() => {
    if (!systemMode) return;
    if (!projectedSystemView) {
      setSelection(systemMode.preEntrySelection);
      setInspectorHistory(systemMode.preEntryInspectorHistory);
      setSystemKeyboardFocusId(null);
      setSystemMode(null);
      setSelectionStatus(
        "System view closed because its reader-visible composition is no longer eligible.",
      );
      if (window.history.state?.bobSystemView) window.history.back();
      return;
    }
    const nextPath = retreatSystemFocusPath(
      projectedSystemView,
      systemMode.focusPath,
    );
    if (nextPath.join("\u0000") !== systemMode.focusPath.join("\u0000")) {
      setSystemMode({ ...systemMode, focusPath: nextPath });
      setSelectionStatus(
        "System focus returned to the nearest reader-visible ancestor.",
      );
    }
  }, [projectedSystemView, systemMode]);

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
  const selectionName = (nextSelection: SelectionIdentity): string => {
    const name =
      nextSelection.kind === "astronomy"
        ? systems.find((system) => system.id === nextSelection.id)?.name
        : nextSelection.kind === "narrative"
          ? narrativeWorld.entities.find(
              (entity) => entity.id === nextSelection.id,
            )?.name
          : `Chapter ${nextSelection.id}`;
    return String(name ?? "Object");
  };
  const showSelection = (nextSelection: SelectionIdentity) => {
    setSelection(nextSelection);
    setSelectionStatus(`${selectionName(nextSelection) || "Object"} selected.`);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    )
      setMobilePanel("inspector");
  };
  const syncSystemFocusForSelection = (nextSelection: SelectionIdentity) => {
    if (!projectedSystemView || nextSelection.kind !== "narrative") return;
    const nearest = nearestSystemViewNode(
      projectedSystemView,
      narrativeWorld,
      nextSelection.id,
    );
    if (nearest) {
      setSystemMode((current) =>
        current
          ? {
              ...current,
              focusPath: buildSystemFocusPath(projectedSystemView, nearest),
            }
          : current,
      );
      return;
    }
    const destination = focusSystemIdForSelection(
      nextSelection,
      narrativeWorld,
      contextSystemIds,
    );
    if (destination && destination !== projectedSystemView.astronomyId) {
      systemExitSelectionOverride.current = nextSelection;
      if (window.history.state?.bobSystemView) window.history.back();
      else setSystemMode(null);
    }
  };
  const selectExternalObject = (nextSelection: SelectionIdentity) => {
    setInspectorHistory(rootInspectorHistory(nextSelection));
    showSelection(nextSelection);
    syncSystemFocusForSelection(nextSelection);
  };
  const enterSelectedSystem = () => {
    if (!selectedEntrySystemView) return;
    const next: SystemModeState = {
      systemId: selectedEntrySystemView.systemId,
      focusPath: initialSystemFocusPath(selectedEntrySystemView),
      preEntrySelection: selection,
      preEntryInspectorHistory: inspectorHistory,
    };
    window.history.pushState(
      { ...(window.history.state ?? {}), bobSystemView: true },
      "",
    );
    setSystemMode(next);
    setSystemKeyboardFocusId(null);
    setMobilePanel(null);
    setSelectionStatus(
      `${String(selectedEntrySystemView.nodes.get(next.systemId)?.entity.name)} system view entered.`,
    );
  };
  const returnToMap = () => {
    if (!systemMode) return;
    if (window.history.state?.bobSystemView) {
      window.history.back();
    } else {
      setSelection(systemMode.preEntrySelection);
      setInspectorHistory(systemMode.preEntryInspectorHistory);
      setSystemKeyboardFocusId(null);
      setSystemMode(null);
      setSelectionStatus("Returned to the interstellar map.");
    }
  };
  const focusSystemNode = (id: string) => {
    if (!projectedSystemView || !projectedSystemView.nodes.has(id)) return;
    const entity = projectedSystemView.nodes.get(id)!.entity;
    const nextSelection: SelectionIdentity = { kind: "narrative", id };
    setSelection(nextSelection);
    setInspectorHistory(rootInspectorHistory(nextSelection));
    setSystemMode((current) =>
      current
        ? {
            ...current,
            focusPath: buildSystemFocusPath(projectedSystemView, id),
          }
        : current,
    );
    setSelectionStatus(
      `${String(entity.name)} selected in schematic system view.`,
    );
  };
  const focusSystemAncestor = (id: string) => {
    if (!projectedSystemView || !projectedSystemView.nodes.has(id)) return;
    setSystemMode((current) =>
      current
        ? {
            ...current,
            focusPath: buildSystemFocusPath(projectedSystemView, id),
          }
        : current,
    );
    setSelectionStatus(
      `${String(projectedSystemView.nodes.get(id)!.entity.name)} ancestor view restored.`,
    );
  };
  const selectInspectorRelationship = (nextSelection: SelectionIdentity) => {
    setInspectorHistory((current) => {
      const currentEntry = current.entries[current.index];
      const base =
        selection && currentEntry && sameSelection(currentEntry, selection)
          ? current.entries.slice(0, current.index + 1)
          : selection
            ? [selection]
            : [];
      const previous = base.at(-1);
      if (previous && sameSelection(previous, nextSelection))
        return { entries: base, index: base.length - 1 };
      return {
        entries: [...base, nextSelection],
        index: base.length,
      };
    });
    showSelection(nextSelection);
    syncSystemFocusForSelection(nextSelection);
  };
  const navigateInspectorHistory = (offset: -1 | 1) => {
    const nextIndex = inspectorHistory.index + offset;
    const nextSelection = inspectorHistory.entries[nextIndex];
    if (!nextSelection) return;
    setInspectorHistory((current) => ({ ...current, index: nextIndex }));
    setSelection(nextSelection);
    setSelectionStatus(
      `${selectionName(nextSelection) || "Object"} restored from inspector history.`,
    );
  };
  const updateProgress = (
    next: ReaderProgress,
    requestedSelection?: SelectionIdentity | null,
  ) => {
    try {
      const projected = projectReaderProgress(next, systems);
      let nextSelection =
        requestedSelection === undefined ? selection : requestedSelection;
      const nextContextIds = new Set(
        projected.map.contextSystems.map((system) => system.id),
      );
      const isEligible = (candidate: SelectionIdentity): boolean =>
        candidate.kind === "chapter"
          ? projected.progress.mode === "chapter" &&
            projected.progress.viewChapter === candidate.id &&
            projected.chapterDetail?.chapter === candidate.id
          : isSelectionEligibleForMap(
              candidate,
              projected.world,
              nextContextIds,
            );
      if (nextSelection) {
        if (!isEligible(nextSelection)) {
          const closedInDateMode =
            nextSelection.kind === "chapter" &&
            projected.progress.mode === "date";
          nextSelection = null;
          setSelectionStatus(
            closedInDateMode
              ? "Chapter inspection closed in Date mode."
              : "Selection cleared because the object is not eligible in this view.",
          );
        }
      }
      if (requestedSelection !== undefined) {
        setInspectorHistory(
          nextSelection
            ? rootInspectorHistory(nextSelection)
            : EMPTY_INSPECTOR_HISTORY,
        );
      } else if (nextSelection) {
        const retained = inspectorHistory.entries
          .map((entry, originalIndex) => ({ entry, originalIndex }))
          .filter(({ entry }) => isEligible(entry));
        let retainedIndex = retained.findIndex(
          ({ originalIndex }) => originalIndex === inspectorHistory.index,
        );
        if (
          retainedIndex < 0 ||
          !sameSelection(retained[retainedIndex]!.entry, nextSelection)
        ) {
          retainedIndex = -1;
          for (let index = retained.length - 1; index >= 0; index -= 1) {
            if (sameSelection(retained[index]!.entry, nextSelection)) {
              retainedIndex = index;
              break;
            }
          }
        }
        setInspectorHistory(
          retainedIndex >= 0
            ? {
                entries: retained.map(({ entry }) => entry),
                index: retainedIndex,
              }
            : rootInspectorHistory(nextSelection),
        );
      } else {
        setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
      }
      setSelection(nextSelection);
      setApplicationProjection(projected);
    } catch (error) {
      setApplicationProjection((current) => ({
        ...current,
        error: projectionErrorMessage(error),
      }));
    }
  };
  const selectKnowledge = (chapter: string) => {
    const next = selectKnowledgeChapter(progress, chapter, narrativeChapters);
    if (next === progress) return;
    updateProgress(next);
  };
  const selectTimelineChapter = (chapter: string) => {
    const next = selectKnowledgeChapter(progress, chapter, narrativeChapters);
    if (next === progress) return;
    updateProgress(next, { kind: "chapter", id: chapter });
    setSelectionStatus(`Chapter ${chapter} selected.`);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    ) {
      setMobilePanel("inspector");
    }
  };
  const selectDate = (date: string) =>
    updateProgress(selectDisplayDate(progress, date, meaningfulDates));
  const toggleBrowserGroup = (group: keyof ReaderProgress["browserGroups"]) =>
    setApplicationProjection((current) => ({
      ...current,
      progress: {
        ...current.progress,
        browserGroups: {
          ...current.progress.browserGroups,
          [group]: !current.progress.browserGroups[group],
        },
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
    setApplicationProjection((current) => ({
      ...current,
      progress: setTimelineViewport(
        current.progress,
        current.progress.timelineZoom + delta,
        current.progress.timelinePan,
      ),
    }));
  const panTimeline = (delta: number) =>
    setApplicationProjection((current) => ({
      ...current,
      progress: setTimelineViewport(
        current.progress,
        current.progress.timelineZoom,
        current.progress.timelinePan + delta,
      ),
    }));

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
  const projectionError = applicationProjection.error;
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
  if (!narrativeCorpus)
    throw new Error("Narrative corpus is unavailable after preparation.");

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
            disabled={Boolean(systemMode)}
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
            onSelect={selectExternalObject}
          />
        </aside>
        <section
          id="map-stage"
          className="map-frame"
          aria-label={
            systemMode
              ? "Guided schematic stellar-system view"
              : "Interactive three dimensional nearby stellar-system map"
          }
        >
          {projectedSystemView && systemMode && (
            <nav
              className="system-view-navigation"
              aria-label="System view breadcrumb"
            >
              <button className="button return-map" onClick={returnToMap}>
                Return to map
              </button>
              <ol>
                {systemMode.focusPath.map((id) => {
                  const node = projectedSystemView.nodes.get(id);
                  return node ? (
                    <li key={id}>
                      <button
                        onClick={() => focusSystemAncestor(id)}
                        onFocus={() => setSystemKeyboardFocusId(id)}
                        onBlur={() => setSystemKeyboardFocusId(null)}
                      >
                        {String(node.entity.name)}
                      </button>
                    </li>
                  ) : null;
                })}
              </ol>
              <p>Schematic view · orbital spacing is not to scale</p>
            </nav>
          )}
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
                    selectExternalObject(
                      narrativeId
                        ? { kind: "narrative", id: narrativeId }
                        : { kind: "astronomy", id },
                    );
                  }}
                  onDeselect={() => {
                    setSelection(null);
                    setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
                    setSelectionStatus("Selection cleared.");
                  }}
                  onReady={() => undefined}
                  onScaleChange={updateMapScale}
                  systemView={projectedSystemView}
                  systemFocusId={systemMode?.focusPath.at(-1) ?? null}
                  narrativeSelectedId={
                    selection?.kind === "narrative" ? selection.id : null
                  }
                  systemKeyboardFocusedId={systemKeyboardFocusId}
                  assets={narrativeCorpus.assets}
                  onSystemSelect={focusSystemNode}
                  onSystemKeyboardFocus={setSystemKeyboardFocusId}
                />
              )}
            </>
          )}
          <span className="map-narrative-badge" aria-live="polite">
            {viewStatus}
          </span>
          <div
            className={`map-overlay ${systemMode ? "system-mode-hidden" : ""}`}
            aria-hidden={Boolean(systemMode)}
          >
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
            chapterDetail={selectedChapterDetail}
            world={narrativeWorld}
            systems={mapProjection.contextSystems}
            knownAstronomySystemIds={mapProjection.knownSystemIds}
            assets={narrativeCorpus.assets}
            headingId="desktop-object-details-heading"
            canGoBack={inspectorHistory.index > 0}
            canGoForward={
              inspectorHistory.index >= 0 &&
              inspectorHistory.index < inspectorHistory.entries.length - 1
            }
            onBack={() => navigateInspectorHistory(-1)}
            onForward={() => navigateInspectorHistory(1)}
            onSelect={selectInspectorRelationship}
            canEnterSystem={Boolean(selectedEntrySystemView && !systemMode)}
            onEnterSystem={enterSelectedSystem}
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
        onChapterTimeline={selectTimelineChapter}
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
                onSelect={selectExternalObject}
              />
            ) : mobilePanel === "inspector" ? (
              <ObjectInspector
                selection={selection}
                narrativeItem={selectedNarrativeItem}
                chapterDetail={selectedChapterDetail}
                world={narrativeWorld}
                systems={mapProjection.contextSystems}
                knownAstronomySystemIds={mapProjection.knownSystemIds}
                assets={narrativeCorpus.assets}
                headingId="compact-object-details-heading"
                canGoBack={inspectorHistory.index > 0}
                canGoForward={
                  inspectorHistory.index >= 0 &&
                  inspectorHistory.index < inspectorHistory.entries.length - 1
                }
                onBack={() => navigateInspectorHistory(-1)}
                onForward={() => navigateInspectorHistory(1)}
                onSelect={selectInspectorRelationship}
                canEnterSystem={Boolean(selectedEntrySystemView && !systemMode)}
                onEnterSystem={enterSelectedSystem}
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
                  onChapterTimeline={selectTimelineChapter}
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

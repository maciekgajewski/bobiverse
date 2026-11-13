import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StarMap, type MapScale } from "./components/MapScene";
import { ObjectBrowser } from "./components/ObjectBrowser";
import { ObjectInspector } from "./components/ObjectInspector";
import {
  KnowledgeThroughSelect,
  ResetViewIcon,
  TimelineModeToggle,
  TopbarReadThrough,
} from "./components/ProgressControls";
import { TimelineDock } from "./components/TimelineDock";
import { nearbySystems, nearbySystemsResult } from "./domain/data";
import { mapDisplayConfig } from "./domain/config";
import {
  GALACTIC_STARFIELD_SOURCE_URL,
  GALACTIC_STARFIELD_SHORT_CREDIT,
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
  systemViewEntryForNarrativeSelection,
  type SystemViewEntry,
} from "./system-view";
import {
  generateNarrativeWorld,
  characterTravelLegs,
  projectCharacterTravelHistories,
  meaningfulNarrativeDateOptions,
  projectNarrativeChapterDetail,
  formatNarrativeDate,
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
import { resolveSpeciesPresentations } from "./narrative/species-presentation";
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
const EMPTY_INSPECTOR_HISTORY: InspectorHistory = {
  entries: [],
  index: -1,
};
const SYSTEM_VIEW_HISTORY_KEY = "bobiverse.system-view";
interface SystemMode {
  entry: SystemViewEntry;
}
type MobilePanel = "menu" | "browser" | "inspector" | "timeline";
const ASTRONOMY_CATALOGUE_LINE =
  "GCNS · CNS5 · Gaia DR3 · WDS · Kirkpatrick 20-pc census · VizieR IV/27A";
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
    astronomySearchAliasesByNarrativeId: new Map(),
    systemStatuses: new Map(),
  };
}

function sameSelection(
  left: SelectionIdentity,
  right: SelectionIdentity,
): boolean {
  return (
    left.kind === right.kind &&
    left.id === right.id &&
    (left.kind !== "component" ||
      right.kind !== "component" ||
      left.systemId === right.systemId)
  );
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
  const generatedWorld = generateNarrativeWorld(
    narrativeCorpus,
    progress.viewChapter,
    progress.mode === "date" ? progress.displayDate : null,
  );
  const world = generatedWorld;
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
  const [systemMode, setSystemMode] = useState<SystemMode | null>(null);
  const systemModeRef = useRef<SystemMode | null>(null);
  const pendingSystemExitReason = useRef<string | null>(null);
  const [inspectorHistory, setInspectorHistory] = useState<InspectorHistory>(
    EMPTY_INSPECTOR_HISTORY,
  );
  const [browserQuery, setBrowserQuery] = useState("");
  const [selectionStatus, setSelectionStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobilePanelElement = useRef<HTMLDivElement>(null);
  const [astronomyNoticeOpen, setAstronomyNoticeOpen] = useState(false);
  const astronomyNoticeButton = useRef<HTMLButtonElement>(null);
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [resetToken, setResetToken] = useState(0);
  const [applicationProjection, setApplicationProjection] = useState(() =>
    loadInitialProjection(systems),
  );
  const progress = applicationProjection.progress;
  const [pendingReadThrough, setPendingReadThrough] = useState<string | null>(
    null,
  );
  // Which Read through control opened the pending confirmation. The top-bar
  // control renders its own dialog because the desktop dock is hidden on
  // compact layouts.
  const [readThroughOrigin, setReadThroughOrigin] = useState<"topbar" | "dock">(
    "dock",
  );
  const [dateContext, setDateContext] = useState<string | null>(null);
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
  const activeDateContext =
    progress.mode === "date" && dateContext === progress.displayDate
      ? dateContext
      : null;
  const selectedChapterDetail =
    selection?.kind === "chapter" &&
    applicationProjection.chapterDetail?.chapter === selection.id
      ? applicationProjection.chapterDetail
      : null;
  const mapProjection = applicationProjection.map;
  const speciesPresentations = useMemo(
    () =>
      narrativeCorpus
        ? resolveSpeciesPresentations(narrativeCorpus, narrativeWorld)
        : new Map(),
    [narrativeWorld],
  );
  const allBrowserGroups = useMemo(
    () =>
      buildNarrativeBrowserGroups(
        narrativeWorld,
        progress.mode,
        "",
        mapProjection.astronomySearchAliasesByNarrativeId,
        speciesPresentations,
      ),
    [
      mapProjection.astronomySearchAliasesByNarrativeId,
      narrativeWorld,
      progress.mode,
      speciesPresentations,
    ],
  );
  const visibleBrowserGroups = useMemo(
    () =>
      buildNarrativeBrowserGroups(
        narrativeWorld,
        progress.mode,
        browserQuery,
        mapProjection.astronomySearchAliasesByNarrativeId,
        speciesPresentations,
      ),
    [
      browserQuery,
      mapProjection.astronomySearchAliasesByNarrativeId,
      narrativeWorld,
      progress.mode,
      speciesPresentations,
    ],
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
  // Chapter view has no story-time cutoff (ADR-0028), so it names no date.
  const viewStatus =
    progress.viewChapter && progress.displayDate
      ? progress.mode === "chapter"
        ? `Latest known · Knowledge through Chapter ${progress.viewChapter}`
        : `Universe in ${formatNarrativeDate(progress.displayDate)} · Knowledge through Chapter ${progress.viewChapter}`
      : "Pre-book zero state";
  const selectedNarrativeItem =
    selection?.kind === "narrative"
      ? (allBrowserGroups
          .flatMap((group) => group.items)
          .find((item) => item.entity.id === selection.id) ?? null)
      : null;
  const selectedMapId = systemMode
    ? systemMode.entry.astronomySystemId
    : focusSystemIdForSelection(selection, narrativeWorld, contextSystemIds);
  const characterTravelHistories = useMemo(
    () =>
      narrativeCorpus
        ? projectCharacterTravelHistories(narrativeCorpus, narrativeWorld)
        : new Map(),
    [narrativeWorld],
  );
  const selectedCharacterTravel = useMemo(() => {
    if (
      systemMode ||
      selection?.kind !== "narrative" ||
      !narrativeWorld.entities.some(
        (entity) =>
          entity.id === selection.id && entity.entity_type === "character",
      )
    ) {
      return { stops: [], legs: [] };
    }
    const stops = characterTravelHistories.get(selection.id) ?? [];
    return { stops, legs: characterTravelLegs(stops) };
  }, [characterTravelHistories, narrativeWorld, selection, systemMode]);
  const selectedSystemEntry = systemViewEntryForNarrativeSelection(
    narrativeWorld,
    mapProjection.contextSystems,
    selection?.kind === "narrative" ? selection.id : null,
  );
  const enteredSystem = systemMode
    ? (mapProjection.contextSystems.find(
        (system) => system.id === systemMode.entry.astronomySystemId,
      ) ?? null)
    : null;
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
    systemModeRef.current = systemMode;
  }, [systemMode]);
  const restoreSystemMode = useCallback(
    (reason: string, fromHistory = false) => {
      const current = systemModeRef.current;
      if (!current) return;
      if (
        !fromHistory &&
        window.history.state?.[SYSTEM_VIEW_HISTORY_KEY] ===
          current.entry.astronomySystemId
      ) {
        pendingSystemExitReason.current = reason;
        window.history.back();
        return;
      }
      pendingSystemExitReason.current = null;
      setSystemMode(null);
      setSelection({ kind: "narrative", id: current.entry.narrativeSystemId });
      setInspectorHistory(
        rootInspectorHistory({
          kind: "narrative",
          id: current.entry.narrativeSystemId,
        }),
      );
      setSelectionStatus(reason);
    },
    [],
  );
  useEffect(() => {
    const onPopState = () => {
      if (!systemModeRef.current) return;
      restoreSystemMode(
        pendingSystemExitReason.current ?? "Returned to the interstellar map.",
        true,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [restoreSystemMode]);
  useEffect(() => {
    const current = systemMode;
    if (
      current &&
      !systemViewEntryForNarrativeSelection(
        narrativeWorld,
        mapProjection.contextSystems,
        current.entry.narrativeSystemId,
      )
    ) {
      restoreSystemMode(
        "Returned to the interstellar map because this system is no longer available.",
      );
    }
  }, [
    mapProjection.contextSystems,
    narrativeWorld,
    restoreSystemMode,
    systemMode,
  ]);

  // Every compact panel is reached from the top-bar menu, so focus returns
  // to the menu button when any of them closes.
  const closeMobilePanel = useCallback(() => {
    if (!mobilePanel) return;
    setMobilePanel(null);
    window.setTimeout(() => menuButton.current?.focus(), 0);
  }, [mobilePanel]);
  const closeAstronomyNotice = useCallback(() => {
    setAstronomyNoticeOpen(false);
    window.setTimeout(() => astronomyNoticeButton.current?.focus(), 0);
  }, []);
  const resetView = () => setResetToken((value) => value + 1);

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
              : panel === "menu"
                ? document.getElementById("topbar-read-through")
                : document.querySelector<HTMLElement>(
                    ".right-rail button, .right-rail a, .topbar select",
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
        : nextSelection.kind === "component"
          ? systems
              .find((system) => system.id === nextSelection.systemId)
              ?.components.find(
                (component) => component.id === nextSelection.id,
              )?.designation
          : nextSelection.kind === "narrative"
            ? narrativeWorld.entities.find(
                (entity) => entity.id === nextSelection.id,
              )?.name
            : `Chapter ${nextSelection.id}`;
    return String(name ?? "Object");
  };
  const enterSystemMode = (entry: SystemViewEntry) => {
    if (systemMode) return;
    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        [SYSTEM_VIEW_HISTORY_KEY]: entry.astronomySystemId,
      },
      "",
    );
    setSystemMode({ entry });
    setSelection({ kind: "narrative", id: entry.narrativeSystemId });
    setInspectorHistory(
      rootInspectorHistory({ kind: "narrative", id: entry.narrativeSystemId }),
    );
    setSelectionStatus("Entered stellar-system view.");
  };
  const selectSystemComponent = (componentId: string) => {
    const current = systemModeRef.current;
    const system = current
      ? systems.find(
          (candidate) => candidate.id === current.entry.astronomySystemId,
        )
      : null;
    if (!current || !system?.components.some((item) => item.id === componentId))
      return;
    setSelection({
      kind: "component",
      systemId: system.id,
      id: componentId,
    });
    setSelectionStatus(
      `${system.components.find((item) => item.id === componentId)?.designation ?? "Component"} selected.`,
    );
  };
  const showSelection = (nextSelection: SelectionIdentity) => {
    setDateContext(null);
    setSelection(nextSelection);
    setSelectionStatus(`${selectionName(nextSelection) || "Object"} selected.`);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    )
      setMobilePanel("inspector");
  };
  const selectExternalObject = (nextSelection: SelectionIdentity) => {
    setInspectorHistory(rootInspectorHistory(nextSelection));
    showSelection(nextSelection);
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
  };
  const navigateInspectorHistory = (offset: -1 | 1) => {
    const nextIndex = inspectorHistory.index + offset;
    const nextSelection = inspectorHistory.entries[nextIndex];
    if (!nextSelection) return;
    setInspectorHistory((current) => ({ ...current, index: nextIndex }));
    setDateContext(null);
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
          : candidate.kind === "component"
            ? false
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
    const chapterSelection: SelectionIdentity = {
      kind: "chapter",
      id: chapter,
    };
    if (next === progress) {
      if (progress.mode !== "chapter" || progress.viewChapter !== chapter)
        return;
      setSelection(chapterSelection);
      setInspectorHistory(rootInspectorHistory(chapterSelection));
    } else {
      updateProgress(next, chapterSelection);
    }
    setSelectionStatus(`Chapter ${chapter} selected.`);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    ) {
      setMobilePanel("inspector");
    }
  };
  const selectDate = (date: string, showContext = false) => {
    setDateContext(showContext ? date : null);
    updateProgress(selectDisplayDate(progress, date, meaningfulDates));
    if (
      showContext &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    ) {
      setMobilePanel("inspector");
    }
  };
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
    setDateContext(null);
    if (!progress.viewChapter) return;
    updateProgress(
      selectKnowledgeChapter(
        { ...progress, mode: "chapter" },
        progress.viewChapter,
        narrativeChapters,
      ),
    );
  };
  const zoomTimeline = (zoom: number, pan: number) =>
    setApplicationProjection((current) => ({
      ...current,
      progress: setTimelineViewport(current.progress, zoom, pan),
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
        <div className="topbar-title">
          <p className="eyebrow">
            <span className="eyebrow-brand">Bobiverse</span>
            <span className="eyebrow-detail"> · astronomy atlas</span>
          </p>
          <nav className="map-breadcrumb" aria-label="Star map breadcrumb">
            {systemMode ? (
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  restoreSystemMode("Returned to the interstellar map.")
                }
              >
                Star Map
              </button>
            ) : (
              <h1>Star Map</h1>
            )}
            {enteredSystem && (
              <span aria-current="page">/ {enteredSystem.name}</span>
            )}
          </nav>
        </div>
        <div className="topbar-actions">
          <p className="view-status" aria-live="polite">
            {viewStatus}
          </p>
          <TopbarReadThrough
            chapters={narrativeChapters}
            progress={progress}
            pendingReadThrough={pendingReadThrough}
            ownsConfirmation={readThroughOrigin === "topbar"}
            onReadThroughChoice={(chapter) => {
              setReadThroughOrigin("topbar");
              setPendingReadThrough(chapter);
            }}
            onConfirmReadThrough={confirmPendingReadThrough}
            onCancelReadThrough={() => setPendingReadThrough(null)}
          />
          {systemMode && (
            <button
              className="button return-to-map"
              type="button"
              onClick={() =>
                restoreSystemMode("Returned to the interstellar map.")
              }
            >
              Return to map
            </button>
          )}
          <button
            ref={menuButton}
            type="button"
            className="button menu-button"
            aria-label="Menu"
            aria-haspopup="dialog"
            aria-expanded={mobilePanel === "menu"}
            onClick={() => setMobilePanel("menu")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M5 12h14M5 17h14" />
            </svg>
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
          className={`map-frame${systemMode ? " system-mode" : ""}`}
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
                  systemStatuses={mapProjection.systemStatuses}
                  speciesPresentations={speciesPresentations}
                  activeSystemIds={mapProjection.activeSystemIds}
                  travelLegs={selectedCharacterTravel.legs}
                  travelSystems={systems}
                  resetToken={resetToken}
                  zoomedSystemId={systemMode?.entry.astronomySystemId ?? null}
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
                    if (systemMode) return;
                    setDateContext(null);
                    setSelection(null);
                    setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
                    setSelectionStatus("Selection cleared.");
                  }}
                  onReady={() => undefined}
                  onScaleChange={updateMapScale}
                  onComponentSelect={selectSystemComponent}
                />
              )}
            </>
          )}
          <span className="map-narrative-badge" aria-live="polite">
            {viewStatus}
          </span>
          <div className="map-controls">
            <button
              type="button"
              className="reset-view"
              aria-label="Reset view"
              onClick={resetView}
              disabled={Boolean(systemMode)}
            >
              <ResetViewIcon />
            </button>
            <span className="reset-view-tooltip" role="tooltip">
              Reset view
            </span>
          </div>
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
          <footer
            className={`astronomy-notice${astronomyNoticeOpen ? " expanded" : ""}`}
            onKeyDown={(event) => {
              if (event.key === "Escape" && astronomyNoticeOpen) {
                event.preventDefault();
                event.stopPropagation();
                closeAstronomyNotice();
              }
            }}
          >
            {astronomyNoticeOpen && (
              <div
                id="astronomy-notice-card"
                className="astronomy-notice-card"
                role="region"
                aria-label="Astronomy data credits"
              >
                <p className="astronomy-notice-catalogues">
                  {ASTRONOMY_CATALOGUE_LINE}
                </p>
                <p>
                  {Object.values(nearbySystems.metadata.sources)
                    .map((source) => source.acknowledgement)
                    .join(" ")}
                </p>
                <p>
                  <a
                    href={GALACTIC_STARFIELD_SOURCE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {GALACTIC_STARFIELD_UI_CREDIT}
                  </a>
                </p>
              </div>
            )}
            <button
              ref={astronomyNoticeButton}
              type="button"
              className="astronomy-notice-chip"
              aria-expanded={astronomyNoticeOpen}
              aria-controls={
                astronomyNoticeOpen ? "astronomy-notice-card" : undefined
              }
              onClick={() => setAstronomyNoticeOpen((open) => !open)}
            >
              <span className="astronomy-notice-icon" aria-hidden="true">
                i
              </span>
              <span className="visually-hidden">Astronomy data credits:</span>{" "}
              <span className="astronomy-notice-summary">
                {GALACTIC_STARFIELD_SHORT_CREDIT}
              </span>
            </button>
          </footer>
        </section>
        <aside className="right-rail" aria-label="Object inspector">
          <ObjectInspector
            selection={selection}
            narrativeItem={selectedNarrativeItem}
            chapterDetail={selectedChapterDetail}
            dateContext={
              activeDateContext
                ? {
                    date: activeDateContext,
                    sourceChapters:
                      meaningfulDateSources.get(activeDateContext) ?? [],
                  }
                : null
            }
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
            onChapterSelect={selectTimelineChapter}
            travelStops={selectedCharacterTravel.stops}
            sectionState={progress.characterInspectorSections}
            onToggleSection={(section) =>
              setApplicationProjection((current) => ({
                ...current,
                progress: {
                  ...current.progress,
                  characterInspectorSections: {
                    ...current.progress.characterInspectorSections,
                    [section]:
                      !current.progress.characterInspectorSections[section],
                  },
                },
              }))
            }
            systemEntry={selectedSystemEntry}
            enteredSystem={enteredSystem}
            onEnterSystem={enterSystemMode}
            onComponentSelect={selectSystemComponent}
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
        pendingReadThrough={
          readThroughOrigin === "topbar" ? null : pendingReadThrough
        }
        onReadThroughChoice={(chapter) => {
          setReadThroughOrigin("dock");
          setPendingReadThrough(chapter);
        }}
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
          <div
            className="compact-panel-backdrop"
            aria-hidden="true"
            onClick={closeMobilePanel}
          />
          <div
            className={`mobile-panel ${mobilePanel}`}
            ref={mobilePanelElement}
            role="dialog"
            aria-modal="true"
            aria-label={
              mobilePanel === "menu"
                ? "Menu"
                : mobilePanel === "browser"
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
            {mobilePanel === "menu" ? (
              <nav className="compact-menu" aria-label="Atlas menu">
                <div className="compact-menu-heading">
                  <p className="eyebrow">Bobiverse · astronomy atlas</p>
                  <h2>Star Map</h2>
                </div>
                <KnowledgeThroughSelect
                  id="menu-knowledge-through"
                  chapters={narrativeChapters}
                  progress={progress}
                  onKnowledgeChapter={selectKnowledge}
                  onReturnToZeroState={returnToZeroKnowledge}
                />
                <TimelineModeToggle
                  progress={progress}
                  meaningfulDates={meaningfulDates}
                  onDate={selectDate}
                  onChapterMode={returnToChapterMode}
                />
                <button
                  type="button"
                  className="button menu-row"
                  onClick={() => setMobilePanel("browser")}
                >
                  Browse objects
                </button>
                {(selection || activeDateContext) && (
                  <button
                    type="button"
                    className="button menu-row inspect-command"
                    onClick={() => setMobilePanel("inspector")}
                  >
                    Inspect selection
                  </button>
                )}
                <button
                  type="button"
                  className="button menu-row timeline-command"
                  onClick={() => setMobilePanel("timeline")}
                >
                  Timeline and progress
                </button>
                <button
                  type="button"
                  className="button menu-row menu-reset-view"
                  disabled={Boolean(systemMode)}
                  onClick={() => {
                    resetView();
                    closeMobilePanel();
                  }}
                >
                  <ResetViewIcon />
                  Reset view
                </button>
              </nav>
            ) : mobilePanel === "browser" ? (
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
                dateContext={
                  activeDateContext
                    ? {
                        date: activeDateContext,
                        sourceChapters:
                          meaningfulDateSources.get(activeDateContext) ?? [],
                      }
                    : null
                }
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
                onChapterSelect={selectTimelineChapter}
                travelStops={selectedCharacterTravel.stops}
                sectionState={progress.characterInspectorSections}
                onToggleSection={(section) =>
                  setApplicationProjection((current) => ({
                    ...current,
                    progress: {
                      ...current.progress,
                      characterInspectorSections: {
                        ...current.progress.characterInspectorSections,
                        [section]:
                          !current.progress.characterInspectorSections[section],
                      },
                    },
                  }))
                }
                systemEntry={selectedSystemEntry}
                enteredSystem={enteredSystem}
                onEnterSystem={enterSystemMode}
                onComponentSelect={selectSystemComponent}
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
                  pendingReadThrough={
                    readThroughOrigin === "topbar" ? null : pendingReadThrough
                  }
                  onReadThroughChoice={(chapter) => {
                    setReadThroughOrigin("dock");
                    setPendingReadThrough(chapter);
                  }}
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
    </main>
  );
}

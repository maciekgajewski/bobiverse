import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ABOUT_CAPTION_ENTITY_ID, AboutDialog } from "./components/AboutDialog";
import {
  WHATS_NEW_CAPTION_ENTITY_ID,
  WhatsNewDialog,
} from "./components/WhatsNewDialog";
import { markWhatsNewSeen, shouldAutoShowWhatsNew } from "./whats-new";
import {
  AppHistorySync,
  isAppHistoryState,
  loadHistoryGen,
  projectAppHistory,
  sameInspectorStack,
  stackFromState,
  storeHistoryGen,
  type AppDialog,
  type AppHistoryState,
} from "./app-history";
import { DetailSheet } from "./components/DetailSheet";
import { InspectorBreadcrumb } from "./components/InspectorBreadcrumb";
import { StarMap, type MapScale } from "./components/MapScene";
import { ObjectBrowser } from "./components/ObjectBrowser";
import {
  ChapterLink,
  InspectorHistoryControls,
  ObjectInspector,
} from "./components/ObjectInspector";
import {
  CloseIcon,
  ResetViewIcon,
  SearchIcon,
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
import type { SheetSnap } from "./domain/sheet-snap";
import type { StellarSystem } from "./domain/types";
import { DISPLAY_DISTANCE_UNIT } from "./domain/units";
import { inspectorBreadcrumbTrail } from "./narrative/breadcrumb";
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
  preparedInlineLinkFallbackLabels,
  type MeaningfulNarrativeDate,
  type NarrativeChapterDetail,
  type NarrativeWorld,
} from "./narrative/model";
import {
  confirmReadThrough,
  forgetReaderProgress,
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
import { ENABLE_ENTER_SYSTEM } from "./features";
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

// Whether a selection may be shown in a projection: the rule
// `updateProgress` applies to the open card and its history.
function isSelectionEligibleInProjection(
  candidate: SelectionIdentity,
  projection: Pick<
    ApplicationProjection,
    "progress" | "world" | "chapterDetail" | "map"
  >,
): boolean {
  if (candidate.kind === "chapter")
    return (
      projection.progress.mode === "chapter" &&
      projection.progress.viewChapter === candidate.id &&
      projection.chapterDetail?.chapter === candidate.id
    );
  if (candidate.kind === "component") return false;
  return isSelectionEligibleForMap(
    candidate,
    projection.world,
    new Set(projection.map.contextSystems.map((system) => system.id)),
  );
}

interface HistoryBoot {
  projection: ApplicationProjection;
  gen: number;
  stack: InspectorHistory;
  /** What the browser holds from the base entry up to the current one. */
  model: AppHistoryState[];
}

/** The last start-up generation bump, so a repeated boot does not redo it. */
let lastBootBump: { staleGen: number; gen: number } | null = null;

// On reload the browser keeps `history.state`. The card stack is restored
// only when the entry is from this tab's current generation and every
// selection is still eligible; otherwise a new generation starts and the
// first sync walks back to the base entry and rewrites it. Restoring never
// touches reader progress (BOB-20261116-ZBZF9F).
function bootHistory(projection: ApplicationProjection): HistoryBoot {
  const gen = loadHistoryGen();
  const state: unknown = window.history.state;
  if (!isAppHistoryState(state))
    return { projection, gen, stack: EMPTY_INSPECTOR_HISTORY, model: [] };
  const stack = stackFromState(state);
  if (
    state.gen === gen &&
    !projection.error &&
    stack.entries.every((entry) =>
      isSelectionEligibleInProjection(entry, projection),
    )
  ) {
    const model = projectAppHistory(stack, null, gen);
    // About and What's new are not restored; the first sync steps off the
    // dialog entry.
    if (state.layer === "dialog") model.push(state);
    return {
      projection,
      gen,
      stack: stack.index >= 0 ? stack : EMPTY_INSPECTOR_HISTORY,
      model,
    };
  }
  const below = Math.max(
    0,
    Math.min(state.depth, (window.history.length || 1) - 1),
  );
  // StrictMode runs this twice in development; the second run must not bump
  // the generation again, or the stored one would run ahead of the app's.
  const repeat =
    lastBootBump !== null &&
    lastBootBump.staleGen === state.gen &&
    lastBootBump.gen === gen;
  const nextGen = repeat ? gen : storeHistoryGen(gen + 1);
  lastBootBump = { staleGen: state.gen, gen: nextGen };
  return {
    projection,
    gen: nextGen,
    stack: EMPTY_INSPECTOR_HISTORY,
    model: Array.from({ length: below + 1 }, () => state),
  };
}

function isCompactLayout(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1199px)").matches
  );
}

export default function App() {
  const systems = nearbySystems?.systems ?? EMPTY_SYSTEMS;
  const [boot] = useState(() => bootHistory(loadInitialProjection(systems)));
  const [selection, setSelection] = useState<SelectionIdentity | null>(
    () => boot.stack.entries[boot.stack.index] ?? null,
  );
  const [systemMode, setSystemMode] = useState<SystemMode | null>(null);
  const systemModeRef = useRef<SystemMode | null>(null);
  const pendingSystemExitReason = useRef<string | null>(null);
  const [inspectorHistory, setInspectorHistory] = useState<InspectorHistory>(
    boot.stack,
  );
  // Browser history projects the card stack plus one dialog
  // (src/app-history.ts). `historyGen` changes whenever the stack is cleared
  // or replaced rather than stepped.
  const [historyGen, setHistoryGen] = useState(boot.gen);
  const [historySync] = useState(() => new AppHistorySync(window.history));
  const popStateHandler = useRef<(state: unknown) => void>(() => undefined);
  const [browserQuery, setBrowserQuery] = useState("");
  const [selectionStatus, setSelectionStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null);
  // Compact detail sheet height. Map taps open it at peek so the map stays
  // in view; the browser, timeline and menu open it at half.
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("half");
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const searchOrigin = useRef<"pill" | "menu" | null>(null);
  const mobilePanelElement = useRef<HTMLDivElement>(null);
  const [astronomyNoticeOpen, setAstronomyNoticeOpen] = useState(false);
  const astronomyNoticeButton = useRef<HTMLButtonElement>(null);
  const aboutLink = useRef<HTMLButtonElement>(null);
  const [aboutOrigin, setAboutOrigin] = useState<"topbar" | "menu" | null>(
    null,
  );
  const whatsNewLink = useRef<HTMLButtonElement>(null);
  // Decided before any reader state is loaded or written, so a first visit is
  // told apart from a returning reader (src/whats-new.ts).
  const [whatsNewOrigin, setWhatsNewOrigin] = useState<
    "auto" | "topbar" | "menu" | null
  >(() => (shouldAutoShowWhatsNew() ? "auto" : null));
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [resetToken, setResetToken] = useState(0);
  const [applicationProjection, setApplicationProjection] = useState(
    () => boot.projection,
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
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
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
  // The atlas is a fixed full-screen app and the document never scrolls
  // (styles.css clips the root). If something still scrolls it vertically,
  // such as a browser scrolling a focused element into view, snap back so
  // the top bar stays on screen (BOB-20261115-HT8509). While a text field is
  // focused the browser may scroll it above the on-screen keyboard (iOS
  // Safari does), so the snap-back waits until focus leaves the field.
  useEffect(() => {
    const editableFocused = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        (active.isContentEditable || active.matches("input, textarea, select"))
      );
    };
    const keepTopBarOnScreen = () => {
      if (window.scrollY !== 0 && !editableFocused())
        window.scrollTo(window.scrollX, 0);
    };
    const afterFocusLeaves = () => window.setTimeout(keepTopBarOnScreen, 0);
    window.addEventListener("scroll", keepTopBarOnScreen, { passive: true });
    document.addEventListener("focusout", afterFocusLeaves);
    return () => {
      window.removeEventListener("scroll", keepTopBarOnScreen);
      document.removeEventListener("focusout", afterFocusLeaves);
    };
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

  // Menu, timeline and Search-from-menu return focus to the Menu button.
  // Search opened from the map pill returns focus to the pill.
  // X and Escape on the detail sheet fully dismiss the card, as an empty map
  // tap does; browser history then walks back to the base entry
  // (BOB-20261116-ZBZF9F).
  const closeMobilePanel = useCallback(() => {
    if (!mobilePanel) return;
    const panel = mobilePanel;
    const origin = searchOrigin.current;
    searchOrigin.current = null;
    setMobilePanel(null);
    if (panel === "inspector") {
      setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
      if (selection) {
        setSelection(null);
        setSelectionStatus("Selection cleared.");
      }
    }
    window.setTimeout(() => {
      if (panel === "browser" && origin === "pill") {
        searchButton.current?.focus();
      } else {
        menuButton.current?.focus();
      }
    }, 0);
  }, [mobilePanel, selection]);
  const openSearch = (origin: "pill" | "menu") => {
    searchOrigin.current = origin;
    setMobilePanel("browser");
  };
  const closeAstronomyNotice = useCallback(() => {
    setAstronomyNoticeOpen(false);
    window.setTimeout(() => astronomyNoticeButton.current?.focus(), 0);
  }, []);
  const resetView = () => setResetToken((value) => value + 1);
  // The compact menu closes when About opens, so focus returns to the Menu
  // button (as for every compact panel); on desktop it returns to the
  // "What is this?" link. If the layout crossed the breakpoint while the
  // dialog was open, focus goes to whichever of the two is visible.
  const closeAbout = useCallback(() => {
    const origin = aboutOrigin;
    setAboutOrigin(null);
    window.setTimeout(() => {
      const compact =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(max-width: 1199px)").matches
          : origin === "menu";
      (compact ? menuButton.current : aboutLink.current)?.focus();
    }, 0);
  }, [aboutOrigin]);

  // What's new records the newest notes as seen when it closes. Focus returns
  // to whatever opened it; after the start-up auto-show there is no opener.
  const closeWhatsNew = useCallback(() => {
    const origin = whatsNewOrigin;
    markWhatsNewSeen();
    setWhatsNewOrigin(null);
    if (origin === "auto") return;
    window.setTimeout(() => {
      const compact =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(max-width: 1199px)").matches
          : origin === "menu";
      (compact ? menuButton.current : whatsNewLink.current)?.focus();
    }, 0);
  }, [whatsNewOrigin]);

  // The About caption names GUPPI. It opens GUPPI's card only while GUPPI is
  // a reader-visible entity at the knowledge chapter, and never in the
  // pre-book zero state, so the caption cannot reveal or open a hidden card.
  const aboutCaptionEntityKnown =
    progress.viewChapter !== null &&
    isSelectionEligibleForMap(
      { kind: "narrative", id: ABOUT_CAPTION_ENTITY_ID },
      narrativeWorld,
      contextSystemIds,
    );

  // The What's new caption names Jeeves, with the same rule as GUPPI above.
  const whatsNewCaptionEntityKnown =
    progress.viewChapter !== null &&
    isSelectionEligibleForMap(
      { kind: "narrative", id: WHATS_NEW_CAPTION_ENTITY_ID },
      narrativeWorld,
      contextSystemIds,
    );

  useEffect(() => {
    if (!mobilePanel) return;
    // The X takes initial focus in every compact panel, wherever it sits in
    // the header row.
    const focus = window.setTimeout(() => {
      const panel = mobilePanelElement.current;
      (
        panel?.querySelector<HTMLElement>(".close-panel") ??
        panel?.querySelector<HTMLElement>(FOCUSABLE_PANEL_ELEMENTS)
      )?.focus();
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
                    ".right-rail button, .right-rail a, #topbar-read-through",
                  );
        destination?.focus();
      }, 0);
    };
    compactLayout.addEventListener("change", closeAtDesktop);
    return () => compactLayout.removeEventListener("change", closeAtDesktop);
  }, [mobilePanel]);
  // Every compact panel, the non-modal detail sheet included, keeps Tab and
  // Shift+Tab inside itself so focus never disappears behind it.
  const containPanelFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = mobilePanelElement.current?.querySelectorAll<HTMLElement>(
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
  };
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
    // The flag hides the inspector entry point; this guard keeps any other
    // caller from starting the disabled flow.
    if (!ENABLE_ENTER_SYSTEM || systemMode) return;
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
  // Opens the compact detail sheet at the given snap; a sheet that is
  // already open keeps the height the reader chose.
  const openInspectorSheet = (snap: SheetSnap) => {
    if (mobilePanel !== "inspector") setSheetSnap(snap);
    setMobilePanel("inspector");
  };
  const showSelection = (
    nextSelection: SelectionIdentity,
    openSnap: SheetSnap = "half",
  ) => {
    setDateContext(null);
    setSelection(nextSelection);
    setSelectionStatus(`${selectionName(nextSelection) || "Object"} selected.`);
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches
    )
      openInspectorSheet(openSnap);
  };
  const bumpHistoryGen = () =>
    setHistoryGen((current) => storeHistoryGen(current + 1));
  const selectExternalObject = (
    nextSelection: SelectionIdentity,
    openSnap: SheetSnap = "half",
  ) => {
    const next = rootInspectorHistory(nextSelection);
    // A fresh root over an open card or dialog replaces the stack: the old
    // entries leave browser history and the new root is pushed once.
    if (
      (inspectorHistory.index >= 0 &&
        !sameInspectorStack(inspectorHistory, next)) ||
      aboutOrigin !== null ||
      whatsNewOrigin !== null
    )
      bumpHistoryGen();
    setInspectorHistory(next);
    showSelection(nextSelection, openSnap);
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
  // Closes About and selects GUPPI as a fresh inspector root, as a browser
  // pick does. The compact detail sheet then focuses its X; on desktop focus
  // returns to the "What is this?" link and the inspector updates in place.
  const forgetProgress = () => {
    const next = forgetReaderProgress();
    try {
      setApplicationProjection(projectReaderProgress(next, systems));
    } catch (error) {
      setApplicationProjection({
        progress: next,
        dateOptions: [],
        world: EMPTY_NARRATIVE_WORLD,
        chapterDetail: null,
        map: emptyMapProjection(),
        error: projectionErrorMessage(error),
      });
    }
    setSelection(null);
    setSystemMode(null);
    // Never backable: the cleared stack leaves browser history too.
    bumpHistoryGen();
    setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
    setPendingReadThrough(null);
    setBrowserQuery("");
  };

  const openAboutCaptionEntity = () => {
    if (!aboutCaptionEntityKnown) return;
    setAboutOrigin(null);
    selectExternalObject({ kind: "narrative", id: ABOUT_CAPTION_ENTITY_ID });
    const compact =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches;
    if (!compact) window.setTimeout(() => aboutLink.current?.focus(), 0);
  };
  const openWhatsNewCaptionEntity = () => {
    if (!whatsNewCaptionEntityKnown) return;
    markWhatsNewSeen();
    setWhatsNewOrigin(null);
    selectExternalObject({
      kind: "narrative",
      id: WHATS_NEW_CAPTION_ENTITY_ID,
    });
    const compact =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches;
    if (!compact) window.setTimeout(() => whatsNewLink.current?.focus(), 0);
  };
  // The notes' "What is this?" swaps What's new for About; About's close then
  // returns focus to the Menu button or the title link as usual.
  const openAboutFromWhatsNew = () => {
    markWhatsNewSeen();
    const compact =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1199px)").matches;
    setWhatsNewOrigin(null);
    setAboutOrigin(compact ? "menu" : "topbar");
  };
  // Browsers skip history entries pushed before the reader has interacted
  // with the page (Chrome's history-manipulation intervention, Firefox's
  // user-interaction requirement), and the entry it was pushed from with
  // them. The auto-shown What's new entry is therefore pushed only after the
  // first user activation; before that, Back behaves as it did without it.
  // A touch pointerdown and Escape are not activations, so the listeners
  // wait for pointerup, click or another key, and defer to
  // `navigator.userActivation` where the browser has it.
  const [userActivated, setUserActivated] = useState(
    () => navigator.userActivation?.hasBeenActive ?? false,
  );
  useEffect(() => {
    if (userActivated) return;
    const activate = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") return;
      if (navigator.userActivation?.hasBeenActive === false) return;
      setUserActivated(true);
    };
    const events = ["pointerup", "click", "keydown"] as const;
    for (const type of events) window.addEventListener(type, activate, true);
    return () => {
      for (const type of events)
        window.removeEventListener(type, activate, true);
    };
  }, [userActivated]);
  const openDialog: AppDialog | null = aboutOrigin
    ? "about"
    : whatsNewOrigin && (whatsNewOrigin !== "auto" || userActivated)
      ? "whats-new"
      : null;
  const desiredHistory = useMemo(
    () => projectAppHistory(inspectorHistory, openDialog, historyGen),
    [historyGen, inspectorHistory, openDialog],
  );
  useEffect(() => {
    historySync.start(boot.model);
  }, [boot.model, historySync]);
  useEffect(() => {
    // The disabled Enter system flow keeps its own history entry.
    if (systemMode) return;
    historySync.sync(desiredHistory);
    if (!historySync.pending) return;
    const fallback = window.setTimeout(
      () => historySync.abandonPending(),
      3000,
    );
    return () => window.clearTimeout(fallback);
  }, [desiredHistory, historySync, systemMode]);
  const isLiveHistoryState = (state: AppHistoryState) =>
    state.gen === historyGen &&
    stackFromState(state).entries.every((entry) =>
      isSelectionEligibleInProjection(entry, applicationProjection),
    );
  // Shows a live browser entry: the card stack at its index (or no card) and
  // its dialog, if any. Menu, Search, Timeline, the read-through
  // confirmation and the astronomy notice are not in history; they close as
  // a side effect.
  const showHistoryState = (state: AppHistoryState) => {
    setAstronomyNoticeOpen(false);
    setPendingReadThrough(null);
    const compact = isCompactLayout();
    const dialog = state.layer === "dialog" ? state.dialog : null;
    if (aboutOrigin && dialog !== "about") closeAbout();
    if (whatsNewOrigin && dialog !== "whats-new") closeWhatsNew();
    if (dialog === "about" && !aboutOrigin)
      setAboutOrigin(compact ? "menu" : "topbar");
    if (dialog === "whats-new" && !whatsNewOrigin)
      setWhatsNewOrigin(compact ? "menu" : "topbar");
    if (mobilePanel && mobilePanel !== "inspector") setMobilePanel(null);
    const target = stackFromState(state);
    if (target.index < 0) {
      setDateContext(null);
      setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
      if (mobilePanel) setMobilePanel(null);
      if (selection) {
        setSelection(null);
        setSelectionStatus("Selection cleared.");
      }
      return;
    }
    const keepsForward =
      inspectorHistory.entries.length > target.index &&
      target.entries.every((entry, index) =>
        sameSelection(entry, inspectorHistory.entries[index]!),
      );
    const entries = keepsForward ? inspectorHistory.entries : target.entries;
    const nextSelection = entries[target.index]!;
    if (
      inspectorHistory.index === target.index &&
      keepsForward &&
      selection &&
      sameSelection(selection, nextSelection)
    )
      return;
    setInspectorHistory({ entries, index: target.index });
    setDateContext(null);
    setSelection(nextSelection);
    setSelectionStatus(
      `${selectionName(nextSelection) || "Object"} restored from inspector history.`,
    );
    if (compact) openInspectorSheet("half");
  };
  useEffect(() => {
    popStateHandler.current = (state: unknown) => {
      if (systemModeRef.current) return;
      const outcome = historySync.handlePop(state, isLiveHistoryState);
      if (outcome.kind === "navigate") showHistoryState(outcome.state);
    };
  });
  useEffect(() => {
    const onPopState = (event: PopStateEvent) =>
      popStateHandler.current(event.state);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const navigateInspectorHistory = (offset: -1 | 1) => {
    const nextIndex = inspectorHistory.index + offset;
    const nextSelection = inspectorHistory.entries[nextIndex];
    if (!nextSelection) return;
    // Soft Back and Forward walk browser history, and the popstate handler
    // is the only writer, so device Back equals soft Back. The direct update
    // below is only a fallback when the browser has no matching entry.
    if (
      !systemMode &&
      !historySync.pending &&
      (offset < 0 ? historySync.depth > 0 : historySync.canGoForward)
    ) {
      if (offset < 0) window.history.back();
      else window.history.forward();
      return;
    }
    setInspectorHistory((current) => ({ ...current, index: nextIndex }));
    setDateContext(null);
    setSelection(nextSelection);
    setSelectionStatus(
      `${selectionName(nextSelection) || "Object"} restored from inspector history.`,
    );
  };
  // `clearHistory` is the never-backable read-through change: the card
  // closes and the whole stack, browser entries included, is cleared.
  const updateProgress = (
    next: ReaderProgress,
    requestedSelection?: SelectionIdentity | null,
    { clearHistory = false }: { clearHistory?: boolean } = {},
  ) => {
    try {
      const projected = projectReaderProgress(next, systems);
      if (clearHistory) {
        bumpHistoryGen();
        setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
        if (selection)
          setSelectionStatus(
            isSelectionEligibleInProjection(selection, projected)
              ? "Selection cleared."
              : "Selection cleared because the object is not eligible in this view.",
          );
        if (mobilePanel === "inspector") setMobilePanel(null);
        setSelection(null);
        setApplicationProjection(projected);
        return;
      }
      let nextSelection =
        requestedSelection === undefined ? selection : requestedSelection;
      const isEligible = (candidate: SelectionIdentity): boolean =>
        isSelectionEligibleInProjection(candidate, projected);
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
        const nextHistory =
          retainedIndex >= 0
            ? {
                entries: retained.map(({ entry }) => entry),
                index: retainedIndex,
              }
            : rootInspectorHistory(nextSelection);
        // Dropped entries are a rewrite, not a step.
        if (!sameInspectorStack(nextHistory, inspectorHistory))
          bumpHistoryGen();
        setInspectorHistory(nextHistory);
      } else {
        if (inspectorHistory.index >= 0) bumpHistoryGen();
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
      openInspectorSheet("half");
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
      openInspectorSheet("half");
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
    setDateContext(null);
    updateProgress(
      pendingReadThrough === ""
        ? returnToZeroState(progress)
        : confirmReadThrough(progress, pendingReadThrough, narrativeChapters),
      undefined,
      { clearHistory: true },
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
  const inlineLinkFallbacks = preparedInlineLinkFallbackLabels(narrativeCorpus);

  return (
    <main
      className="app-shell"
      inert={
        aboutOrigin !== null || whatsNewOrigin !== null || chapterPickerOpen
      }
    >
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
          <button
            ref={aboutLink}
            type="button"
            className="about-link"
            aria-haspopup="dialog"
            onClick={() => setAboutOrigin("topbar")}
          >
            What is this?
          </button>
          <button
            ref={whatsNewLink}
            type="button"
            className="about-link whats-new-link"
            aria-haspopup="dialog"
            onClick={() => setWhatsNewOrigin("topbar")}
          >
            What&rsquo;s new
          </button>
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
            onPickerOpenChange={setChapterPickerOpen}
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
                      "peek",
                    );
                  }}
                  onDeselect={() => {
                    if (systemMode) return;
                    setDateContext(null);
                    setSelection(null);
                    setInspectorHistory(EMPTY_INSPECTOR_HISTORY);
                    setSelectionStatus("Selection cleared.");
                    // The detail sheet leaves the map tappable; an empty
                    // tap clears the selection and closes the sheet.
                    if (mobilePanel === "inspector") setMobilePanel(null);
                  }}
                  onReady={() => undefined}
                  onScaleChange={updateMapScale}
                  onComponentSelect={selectSystemComponent}
                />
              )}
            </>
          )}
          <div className="map-top-chrome">
            <span className="map-narrative-badge" aria-live="polite">
              {progress.viewChapter && progress.displayDate ? (
                <>
                  {progress.mode === "chapter"
                    ? "Latest known · Knowledge through "
                    : `Universe in ${formatNarrativeDate(progress.displayDate)} · Knowledge through `}
                  <ChapterLink
                    chapter={progress.viewChapter}
                    readThroughChapter={progress.furthestChapterRead}
                    onChapterSelect={selectTimelineChapter}
                  />
                </>
              ) : (
                viewStatus
              )}
            </span>
            <button
              ref={searchButton}
              type="button"
              className="search-pill"
              aria-label="Search"
              aria-haspopup="dialog"
              aria-expanded={mobilePanel === "browser"}
              hidden={Boolean(mobilePanel && mobilePanel !== "inspector")}
              onClick={() => openSearch("pill")}
            >
              <SearchIcon />
              Search
            </button>
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
            inlineLinkFallbacks={inlineLinkFallbacks}
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
            readThroughChapter={progress.furthestChapterRead}
            chapters={narrativeChapters}
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
      {mobilePanel === "inspector" && (
        <DetailSheet
          sheetRef={mobilePanelElement}
          label="Selected object"
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          onKeyDown={containPanelFocus}
          header={
            <>
              {/* Matches ObjectInspector: history shows for a selection,
                  never for a Date context. DOM order follows the visual
                  order (history, trail, X); the X still takes initial
                  focus. */}
              {selection && !activeDateContext && (
                <>
                  <InspectorHistoryControls
                    canGoBack={inspectorHistory.index > 0}
                    canGoForward={
                      inspectorHistory.index >= 0 &&
                      inspectorHistory.index <
                        inspectorHistory.entries.length - 1
                    }
                    onBack={() => navigateInspectorHistory(-1)}
                    onForward={() => navigateInspectorHistory(1)}
                  />
                  <InspectorBreadcrumb
                    trail={inspectorBreadcrumbTrail(
                      selection,
                      narrativeWorld,
                      mapProjection.contextSystems,
                    )}
                    onSelect={selectInspectorRelationship}
                  />
                </>
              )}
              <button
                type="button"
                className="button quiet close-panel"
                aria-label="Close"
                title="Close"
                onClick={closeMobilePanel}
              >
                <CloseIcon />
              </button>
            </>
          }
        >
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
            inlineLinkFallbacks={inlineLinkFallbacks}
            headingId="compact-object-details-heading"
            showHistoryControls={false}
            canGoBack={inspectorHistory.index > 0}
            canGoForward={
              inspectorHistory.index >= 0 &&
              inspectorHistory.index < inspectorHistory.entries.length - 1
            }
            onBack={() => navigateInspectorHistory(-1)}
            onForward={() => navigateInspectorHistory(1)}
            onSelect={selectInspectorRelationship}
            onChapterSelect={selectTimelineChapter}
            readThroughChapter={progress.furthestChapterRead}
            chapters={narrativeChapters}
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
        </DetailSheet>
      )}
      {mobilePanel && mobilePanel !== "inspector" && (
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
                  ? "Search"
                  : "Timeline and progress"
            }
            onKeyDown={containPanelFocus}
          >
            <div className="compact-panel-header">
              <button
                type="button"
                className="button quiet close-panel"
                aria-label="Close"
                title="Close"
                onClick={closeMobilePanel}
              >
                <CloseIcon />
              </button>
            </div>
            {mobilePanel === "menu" ? (
              <nav className="compact-menu" aria-label="Atlas menu">
                <div className="compact-menu-heading">
                  <p className="eyebrow">Bobiverse · astronomy atlas</p>
                  <h2>Star Map</h2>
                </div>
                <TimelineModeToggle
                  progress={progress}
                  meaningfulDates={meaningfulDates}
                  onDate={selectDate}
                  onChapterMode={returnToChapterMode}
                />
                <button
                  type="button"
                  className="button menu-row menu-search"
                  onClick={() => openSearch("menu")}
                >
                  <SearchIcon />
                  Search
                </button>
                {(selection || activeDateContext) && (
                  <button
                    type="button"
                    className="button menu-row inspect-command"
                    onClick={() => openInspectorSheet("half")}
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
                <button
                  type="button"
                  className="button menu-row menu-about menu-whats-new"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setMobilePanel(null);
                    setWhatsNewOrigin("menu");
                  }}
                >
                  What&rsquo;s new
                </button>
                <button
                  type="button"
                  className="button menu-row menu-about"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setMobilePanel(null);
                    setAboutOrigin("menu");
                  }}
                >
                  What is this?
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
      {aboutOrigin && (
        <AboutDialog
          onClose={closeAbout}
          onOpenGuppi={aboutCaptionEntityKnown ? openAboutCaptionEntity : null}
          onForgetProgress={forgetProgress}
        />
      )}
      {whatsNewOrigin && !aboutOrigin && (
        <WhatsNewDialog
          onClose={closeWhatsNew}
          onOpenJeeves={
            whatsNewCaptionEntityKnown ? openWhatsNewCaptionEntity : null
          }
          onOpenAbout={openAboutFromWhatsNew}
        />
      )}
    </main>
  );
}

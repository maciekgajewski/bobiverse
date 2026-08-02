import { compareNarrativeChapters } from "./model";
import {
  defaultBrowserGroupState,
  normalizeBrowserGroupState,
  type BrowserGroupState,
} from "./browser";

export type TimelineMode = "chapter" | "date";

export interface NarrativeChapterSummary {
  chapter: string;
  title: string;
  date: string;
  bookTitle: string;
}

export function chapterTimelineLabel(
  chapter: Pick<NarrativeChapterSummary, "chapter" | "title">,
): string {
  const localNumber = chapter.chapter.split(".")[1]!;
  const title = chapter.title.trim();
  if (title === localNumber) return localNumber;
  const prefixedTitle = new RegExp(`^${localNumber}\\s*(?:-|–|—|:)\\s+\\S`);
  return prefixedTitle.test(title) ? title : `${localNumber} — ${title}`;
}

export interface ReaderProgress {
  furthestChapterRead: string | null;
  viewChapter: string | null;
  displayDate: string | null;
  mode: TimelineMode;
  timelineZoom: number;
  timelinePan: number;
  browserGroups: BrowserGroupState;
  characterInspectorSections: CharacterInspectorSectionState;
}

export interface CharacterInspectorSectionState {
  overview: boolean;
  lineage: boolean;
  travelHistory: boolean;
}

export function defaultCharacterInspectorSectionState(): CharacterInspectorSectionState {
  return { overview: true, lineage: false, travelHistory: false };
}

export function normalizeCharacterInspectorSectionState(
  candidate: unknown,
): CharacterInspectorSectionState {
  const record =
    candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : {};
  const defaults = defaultCharacterInspectorSectionState();
  return {
    overview:
      typeof record.overview === "boolean"
        ? record.overview
        : defaults.overview,
    lineage:
      typeof record.lineage === "boolean" ? record.lineage : defaults.lineage,
    travelHistory:
      typeof record.travelHistory === "boolean"
        ? record.travelHistory
        : defaults.travelHistory,
  };
}

const storageKey = "bobiverse.app-state.v1";
const defaultProgress: ReaderProgress = {
  furthestChapterRead: null,
  viewChapter: null,
  displayDate: null,
  mode: "chapter",
  timelineZoom: 1,
  timelinePan: 0,
  browserGroups: defaultBrowserGroupState(),
  characterInspectorSections: defaultCharacterInspectorSectionState(),
};

function knownChapter(
  chapters: readonly NarrativeChapterSummary[],
  chapter: unknown,
): string | null {
  if (typeof chapter !== "string") return null;
  return chapters.some((candidate) => candidate.chapter === chapter)
    ? chapter
    : null;
}

function chapterDate(
  chapters: readonly NarrativeChapterSummary[],
  chapter: string,
): string {
  const selected = chapters.find((candidate) => candidate.chapter === chapter);
  if (!selected) throw new Error(`Unknown chapter: ${chapter}.`);
  return selected.date;
}

export function normalizeReaderProgress(
  candidate: unknown,
  chapters: readonly NarrativeChapterSummary[],
  meaningfulDates: readonly string[],
): ReaderProgress {
  const record =
    candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : {};
  const furthest = knownChapter(chapters, record.furthestChapterRead);
  if (!furthest)
    return {
      ...defaultProgress,
      browserGroups: normalizeBrowserGroupState(record.browserGroups),
      characterInspectorSections: normalizeCharacterInspectorSectionState(
        record.characterInspectorSections,
      ),
    };
  const requestedView = knownChapter(chapters, record.viewChapter);
  const view =
    record.viewChapter === null
      ? null
      : requestedView && compareNarrativeChapters(requestedView, furthest) <= 0
        ? requestedView
        : furthest;
  const mode: TimelineMode =
    view && record.mode === "date" ? "date" : "chapter";
  const requestedDate =
    typeof record.displayDate === "string" ? record.displayDate : null;
  const displayDate = view
    ? mode === "date" &&
      requestedDate &&
      meaningfulDates.includes(requestedDate)
      ? requestedDate
      : mode === "date" && meaningfulDates[0]
        ? meaningfulDates[0]
        : chapterDate(chapters, view)
    : null;
  const zoom =
    typeof record.timelineZoom === "number" &&
    Number.isFinite(record.timelineZoom) &&
    record.timelineZoom >= 1 &&
    record.timelineZoom <= 16
      ? record.timelineZoom
      : 1;
  const pan =
    typeof record.timelinePan === "number" &&
    Number.isFinite(record.timelinePan)
      ? Math.max(0, Math.min(1, record.timelinePan))
      : 0;
  return {
    furthestChapterRead: furthest,
    viewChapter: view,
    displayDate,
    mode,
    timelineZoom: zoom,
    timelinePan: pan,
    browserGroups: normalizeBrowserGroupState(record.browserGroups),
    characterInspectorSections: normalizeCharacterInspectorSectionState(
      record.characterInspectorSections,
    ),
  };
}

export function loadReaderProgress(
  chapters: readonly NarrativeChapterSummary[],
  meaningfulDates: readonly string[],
): ReaderProgress {
  try {
    return normalizeReaderProgress(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "null"),
      chapters,
      meaningfulDates,
    );
  } catch {
    return { ...defaultProgress };
  }
}

export function persistReaderProgress(progress: ReaderProgress): void {
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

/** This is the only transition that can advance the spoiler ceiling. */
export function confirmReadThrough(
  current: ReaderProgress,
  chapter: string,
  chapters: readonly NarrativeChapterSummary[],
): ReaderProgress {
  if (!knownChapter(chapters, chapter))
    throw new Error(`Unknown chapter: ${chapter}.`);
  if (
    current.furthestChapterRead &&
    compareNarrativeChapters(chapter, current.furthestChapterRead) < 0
  ) {
    const view =
      current.viewChapter === null
        ? null
        : compareNarrativeChapters(current.viewChapter, chapter) <= 0
          ? current.viewChapter
          : chapter;
    return {
      ...current,
      furthestChapterRead: chapter,
      viewChapter: view,
      displayDate:
        current.mode === "chapter"
          ? view
            ? chapterDate(chapters, view)
            : null
          : current.displayDate,
    };
  }
  if (!current.furthestChapterRead) {
    return {
      ...current,
      furthestChapterRead: chapter,
      viewChapter: chapter,
      displayDate: chapterDate(chapters, chapter),
      mode: "chapter",
    };
  }
  return { ...current, furthestChapterRead: chapter };
}

export function returnToZeroState(current?: ReaderProgress): ReaderProgress {
  return {
    ...defaultProgress,
    browserGroups: current
      ? { ...current.browserGroups }
      : defaultBrowserGroupState(),
    characterInspectorSections: current
      ? { ...current.characterInspectorSections }
      : defaultCharacterInspectorSectionState(),
  };
}

export function selectZeroKnowledgeView(
  current: ReaderProgress,
): ReaderProgress {
  return {
    ...current,
    viewChapter: null,
    displayDate: null,
    mode: "chapter",
  };
}

export function selectKnowledgeChapter(
  current: ReaderProgress,
  chapter: string,
  chapters: readonly NarrativeChapterSummary[],
): ReaderProgress {
  if (
    !current.furthestChapterRead ||
    !knownChapter(chapters, chapter) ||
    compareNarrativeChapters(chapter, current.furthestChapterRead) > 0
  ) {
    return current;
  }
  return {
    ...current,
    viewChapter: chapter,
    displayDate: chapterDate(chapters, chapter),
    mode: "chapter",
  };
}

export function selectDisplayDate(
  current: ReaderProgress,
  date: string,
  meaningfulDates: readonly string[],
): ReaderProgress {
  if (!current.viewChapter || !meaningfulDates.includes(date)) return current;
  return { ...current, mode: "date", displayDate: date };
}

export function setTimelineViewport(
  current: ReaderProgress,
  zoom: number,
  pan: number,
): ReaderProgress {
  return {
    ...current,
    timelineZoom: Math.max(1, Math.min(16, zoom)),
    timelinePan: Math.max(0, Math.min(1, pan)),
  };
}

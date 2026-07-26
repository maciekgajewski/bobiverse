import { compareNarrativeChapters } from "./model";

export type TimelineMode = "chapter" | "date";

export interface NarrativeChapterSummary {
  chapter: string;
  title: string;
  date: string;
  bookTitle: string;
}

export interface ReaderProgress {
  furthestChapterRead: string | null;
  viewChapter: string | null;
  displayDate: string | null;
  mode: TimelineMode;
  timelineZoom: number;
  timelinePan: number;
}

const storageKey = "bobiverse.app-state.v1";
const defaultProgress: ReaderProgress = {
  furthestChapterRead: null,
  viewChapter: null,
  displayDate: null,
  mode: "chapter",
  timelineZoom: 1,
  timelinePan: 0,
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
  if (!furthest) return { ...defaultProgress };
  const requestedView = knownChapter(chapters, record.viewChapter);
  const view =
    requestedView && compareNarrativeChapters(requestedView, furthest) <= 0
      ? requestedView
      : furthest;
  const mode: TimelineMode = record.mode === "date" ? "date" : "chapter";
  const requestedDate =
    typeof record.displayDate === "string" ? record.displayDate : null;
  const displayDate =
    mode === "date" && requestedDate && meaningfulDates.includes(requestedDate)
      ? requestedDate
      : mode === "date" && meaningfulDates[0]
        ? meaningfulDates[0]
        : chapterDate(chapters, view);
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
      current.viewChapter &&
      compareNarrativeChapters(current.viewChapter, chapter) <= 0
        ? current.viewChapter
        : chapter;
    return {
      ...current,
      furthestChapterRead: chapter,
      viewChapter: view,
      displayDate:
        current.mode === "chapter"
          ? chapterDate(chapters, view)
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

export function returnToZeroState(): ReaderProgress {
  return { ...defaultProgress };
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

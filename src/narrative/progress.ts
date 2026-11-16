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

export const PRE_BOOK_LABEL = "Pre-book zero state";

/** Book number of a canonical chapter ID such as "1.43". */
export function chapterBook(chapter: string): string {
  return chapter.split(".")[0]!;
}

/** Chapter number within its book of a canonical chapter ID such as "1.43". */
export function chapterNumber(chapter: string): string {
  return chapter.split(".")[1]!;
}

/**
 * Full Read through label, e.g. "Book 1 · Chapter 43", or the pre-book zero
 * state for "".
 */
export function readThroughLabel(chapter: string): string {
  return chapter
    ? `Book ${chapterBook(chapter)} · Chapter ${chapterNumber(chapter)}`
    : PRE_BOOK_LABEL;
}

/** Compact chip label, e.g. "1 · Ch 43", or "Pre-book" for "". */
export function compactReadThroughLabel(chapter: string): string {
  return chapter
    ? `${chapterBook(chapter)} · Ch ${chapterNumber(chapter)}`
    : "Pre-book";
}

/** Separator between a chapter reference and its title, e.g. "Chapter 2.3 · Title". */
export const CHAPTER_TITLE_SEPARATOR = " · ";

/**
 * Display title derived from a chapter's required `title`, or null when the
 * chapter is untitled (BOB-20261116-35B47D). The extraction contract stores
 * the bare local number ("3") for an untitled chapter and
 * "<number> - <source title>" for a titled one; the prefix is stripped. Any
 * other nonempty text that is not just the number is used as is. Book 1's
 * 1.1 and 1.2 therefore show "Bob Version 1.0" and "Bob Version 2.0"
 * (approved by the manager, 2026-11-16).
 */
export function chapterDisplayTitle(
  chapter: Pick<NarrativeChapterSummary, "chapter" | "title">,
): string | null {
  const title = chapter.title.trim();
  const localNumber = chapterNumber(chapter.chapter);
  if (!title || title === localNumber) return null;
  const prefixed = numberPrefixedTitle(localNumber).exec(title);
  const display = (prefixed ? prefixed[1]! : title).trim();
  return display && display !== localNumber ? display : null;
}

function numberPrefixedTitle(localNumber: string): RegExp {
  return new RegExp(`^${localNumber}\\s*(?:-|–|—|:)\\s+(\\S.*)$`, "su");
}

/**
 * Spoiler-gated chapter title: a title is chapter content, so it is returned
 * only for a chapter at or before Read through. Later chapters, and every
 * chapter in the pre-book zero state, stay number-only.
 */
export function visibleChapterTitle(
  chapters: readonly Pick<NarrativeChapterSummary, "chapter" | "title">[],
  chapter: string,
  readThroughChapter: string | null,
): string | null {
  if (
    !readThroughChapter ||
    compareNarrativeChapters(chapter, readThroughChapter) > 0
  )
    return null;
  const summary = chapters.find((candidate) => candidate.chapter === chapter);
  return summary ? chapterDisplayTitle(summary) : null;
}

/** "Chapter 2.3 · Title", or the plain "Chapter 2.3" when untitled. */
export function chapterReferenceLabel(
  chapter: string,
  title: string | null,
): string {
  return title
    ? `Chapter ${chapter}${CHAPTER_TITLE_SEPARATOR}${title}`
    : `Chapter ${chapter}`;
}

/**
 * Shortens a title to at most `maxLength` characters with an ellipsis, for
 * places that cannot ellipsize with CSS (native select options). The full
 * title stays available in a tooltip.
 */
export function truncateChapterTitle(title: string, maxLength = 40): string {
  const characters = Array.from(title);
  if (characters.length <= maxLength) return title;
  return `${characters
    .slice(0, maxLength - 1)
    .join("")
    .trimEnd()}…`;
}

export function chapterTimelineLabel(
  chapter: Pick<NarrativeChapterSummary, "chapter" | "title">,
): string {
  // Book 1 keeps its established per-book label. Later books carry the full
  // reference ("2.1 — Title", or "2.5") so a track entry stays unambiguous
  // once the "Book N" divider has scrolled out of view (BOB-20261116-35B47D).
  if (chapterBook(chapter.chapter) !== "1") {
    const title = chapterDisplayTitle(chapter);
    return title ? `${chapter.chapter} — ${title}` : chapter.chapter;
  }
  const localNumber = chapter.chapter.split(".")[1]!;
  const title = chapter.title.trim();
  if (!title || title === localNumber) return localNumber;
  return numberPrefixedTitle(localNumber).test(title)
    ? title
    : `${localNumber} — ${title}`;
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

/** Prefix for every app-owned localStorage key. New keys must use it. */
export const APP_STORAGE_PREFIX = "bobiverse.";
const storageKey = `${APP_STORAGE_PREFIX}app-state.v2`;
const legacyStorageKey = `${APP_STORAGE_PREFIX}app-state.v1`;

function clearAppOwnedStorage(): void {
  // Storage can be blocked (even reading window.localStorage can throw);
  // forgetting then only resets the in-memory state.
  try {
    const storage = window.localStorage;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(APP_STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Nothing stored that can be cleared.
  }
}

export function emptyReaderProgress(): ReaderProgress {
  return {
    furthestChapterRead: null,
    viewChapter: null,
    displayDate: null,
    mode: "chapter",
    timelineZoom: 1,
    timelinePan: 0,
    browserGroups: defaultBrowserGroupState(),
    characterInspectorSections: defaultCharacterInspectorSectionState(),
  };
}

export function isDefaultReaderProgress(progress: ReaderProgress): boolean {
  const empty = emptyReaderProgress();
  return (
    progress.furthestChapterRead === empty.furthestChapterRead &&
    progress.viewChapter === empty.viewChapter &&
    progress.displayDate === empty.displayDate &&
    progress.mode === empty.mode &&
    progress.timelineZoom === empty.timelineZoom &&
    progress.timelinePan === empty.timelinePan &&
    JSON.stringify(progress.browserGroups) ===
      JSON.stringify(empty.browserGroups) &&
    JSON.stringify(progress.characterInspectorSections) ===
      JSON.stringify(empty.characterInspectorSections)
  );
}

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
      ...emptyReaderProgress(),
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
    record.timelineZoom <= 16384
      ? record.timelineZoom
      : 1;
  const pan =
    typeof record.timelinePan === "number" &&
    Number.isFinite(record.timelinePan)
      ? Math.max(-1, Math.min(1, record.timelinePan))
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
    window.localStorage.removeItem(legacyStorageKey);
    return normalizeReaderProgress(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "null"),
      chapters,
      meaningfulDates,
    );
  } catch {
    return emptyReaderProgress();
  }
}

export function persistReaderProgress(progress: ReaderProgress): void {
  // Blocked or full storage keeps progress in memory for this visit only.
  try {
    if (isDefaultReaderProgress(progress)) {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(legacyStorageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Nothing to do; the app keeps working without saving.
  }
}

/** Remove every app-owned localStorage key and return a fresh default state. */
export function forgetReaderProgress(): ReaderProgress {
  clearAppOwnedStorage();
  return emptyReaderProgress();
}

/**
 * This is the only transition that can change the spoiler ceiling. Confirming a
 * Read through chapter, forwards or backwards, also shows that chapter's
 * universe: the knowledge chapter follows the new ceiling, in Chapter mode, at
 * the chapter's story date (BOB-20261114-CTS3FN).
 */
export function confirmReadThrough(
  current: ReaderProgress,
  chapter: string,
  chapters: readonly NarrativeChapterSummary[],
): ReaderProgress {
  if (!knownChapter(chapters, chapter))
    throw new Error(`Unknown chapter: ${chapter}.`);
  return {
    ...current,
    furthestChapterRead: chapter,
    viewChapter: chapter,
    displayDate: chapterDate(chapters, chapter),
    mode: "chapter",
  };
}

export function returnToZeroState(current?: ReaderProgress): ReaderProgress {
  return {
    ...emptyReaderProgress(),
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

/**
 * Previous and next chapters the eyebrow stepper may move to. Next never
 * goes past Read through, so the stepper cannot raise the spoiler ceiling.
 */
export function adjacentKnowledgeChapters(
  chapter: string,
  furthestChapterRead: string | null,
  chapters: readonly Pick<NarrativeChapterSummary, "chapter">[],
): {
  prev: string | null;
  next: string | null;
  atReadThrough: boolean;
  atLastChapter: boolean;
} {
  const sorted = chapters
    .map((item) => item.chapter)
    .slice()
    .sort(compareNarrativeChapters);
  const index = sorted.indexOf(chapter);
  const last = sorted.at(-1) ?? null;
  const atLastChapter = last !== null && chapter === last;
  const atReadThrough =
    furthestChapterRead !== null && chapter === furthestChapterRead;
  if (index < 0) {
    return { prev: null, next: null, atReadThrough, atLastChapter };
  }
  const prev = index > 0 ? sorted[index - 1]! : null;
  const rawNext = index < sorted.length - 1 ? sorted[index + 1]! : null;
  const next =
    rawNext &&
    furthestChapterRead &&
    compareNarrativeChapters(rawNext, furthestChapterRead) <= 0
      ? rawNext
      : null;
  return { prev, next, atReadThrough, atLastChapter };
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
    timelineZoom: Math.max(1, Math.min(16384, zoom)),
    timelinePan: Math.max(-1, Math.min(1, pan)),
  };
}

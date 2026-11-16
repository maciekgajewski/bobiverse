import { useEffect } from "react";
import {
  adjacentKnowledgeChapters,
  type NarrativeChapterSummary,
} from "../narrative/progress";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']") ??
    (target.isContentEditable ? target : null) ??
    target.closest("[contenteditable]"),
  );
}

function hasBlockingDialog(): boolean {
  for (const dialog of document.querySelectorAll<HTMLElement>(
    '[role="dialog"]',
  )) {
    if (dialog.getAttribute("aria-label") === "Selected object") continue;
    if (dialog.hidden) continue;
    const style = window.getComputedStyle(dialog);
    if (style.display === "none" || style.visibility === "hidden") continue;
    return true;
  }
  return false;
}

function SeqChevron({ dir }: { dir: "prev" | "next" }) {
  const d =
    dir === "prev" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5";
  return (
    <svg className="chapter-seq-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const LIMIT_TITLE =
  "Already at your read-through chapter. Use Read through to reveal later chapters.";

export function ChapterStepper({
  chapter,
  chapters,
  readThroughChapter,
  onChapterSelect,
}: {
  chapter: string;
  chapters: readonly NarrativeChapterSummary[];
  readThroughChapter: string | null;
  onChapterSelect: (chapter: string) => void;
}) {
  const { prev, next, atReadThrough, atLastChapter } =
    adjacentKnowledgeChapters(chapter, readThroughChapter, chapters);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "[" && event.key !== "]") return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.defaultPrevented) return;
      if (
        isEditableTarget(event.target) ||
        isEditableTarget(document.activeElement)
      ) {
        return;
      }
      if (hasBlockingDialog()) return;
      const dest = event.key === "[" ? prev : next;
      if (!dest) return;
      event.preventDefault();
      onChapterSelect(dest);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [prev, next, onChapterSelect]);

  const prevLabel = prev
    ? `Previous chapter, Chapter ${prev}`
    : "Previous chapter, unavailable, first chapter";
  const nextLabel = next
    ? `Next chapter, Chapter ${next}`
    : atLastChapter
      ? "Next chapter, unavailable, last chapter"
      : atReadThrough
        ? "Next chapter, unavailable, at your read-through chapter"
        : "Next chapter, unavailable";
  const prevTitle = prev ? `Previous chapter, ${prev}` : "First chapter";
  const nextTitle = next
    ? `Next chapter, ${next}`
    : atLastChapter
      ? "Last chapter"
      : LIMIT_TITLE;
  const showDot = !next && (atReadThrough || atLastChapter);

  return (
    <nav className="chapter-seq-stepper" aria-label="Chapter">
      <button
        type="button"
        className="chapter-seq-hit prev"
        aria-label={prevLabel}
        title={prevTitle}
        disabled={!prev}
        onClick={() => {
          if (prev) onChapterSelect(prev);
        }}
      >
        <SeqChevron dir="prev" />
      </button>
      <span className="chapter-seq-current">{chapter}</span>
      <button
        type="button"
        className="chapter-seq-hit next"
        aria-label={nextLabel}
        title={nextTitle}
        disabled={!next}
        onClick={() => {
          if (next) onChapterSelect(next);
        }}
      >
        <SeqChevron dir="next" />
      </button>
      {showDot ? (
        <span
          className="chapter-seq-dot"
          title={atLastChapter ? "Last chapter" : LIMIT_TITLE}
          aria-hidden="true"
        />
      ) : null}
    </nav>
  );
}

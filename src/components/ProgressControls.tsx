import { useRef, type RefObject } from "react";
import { useReadThroughConfirmationFocus } from "./useReadThroughConfirmationFocus";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../narrative/progress";
import { compareNarrativeChapters } from "../narrative/model";

export function ShieldIcon() {
  return (
    <svg className="shield-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20 6v5.6c0 4.7-3.2 8.7-8 9.9-4.8-1.2-8-5.2-8-9.9V6l8-3.5Z" />
      <path d="m8.5 12 2.1 2.1 4.9-4.9" />
    </svg>
  );
}

export function ResetViewIcon() {
  return (
    <svg className="reset-view-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 11.2 12 4.8l7.5 6.4" />
      <path d="M7 10.4V19h10v-8.6" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function ReadThroughOptions({
  chapters,
}: {
  chapters: readonly NarrativeChapterSummary[];
}) {
  return (
    <>
      <option value="">Pre-book zero state</option>
      {chapters.map((chapter) => (
        <option key={chapter.chapter} value={chapter.chapter}>
          Book {chapter.chapter.split(".")[0]} · Chapter{" "}
          {chapter.chapter.split(".")[1]}
        </option>
      ))}
    </>
  );
}

function unlockedChapters(
  chapters: readonly NarrativeChapterSummary[],
  progress: ReaderProgress,
): readonly NarrativeChapterSummary[] {
  return progress.furthestChapterRead
    ? chapters.filter(
        (chapter) =>
          compareNarrativeChapters(
            chapter.chapter,
            progress.furthestChapterRead!,
          ) <= 0,
      )
    : [];
}

interface KnowledgeThroughSelectProps {
  id: string;
  chapters: readonly NarrativeChapterSummary[];
  progress: ReaderProgress;
  onKnowledgeChapter: (chapter: string) => void;
  onReturnToZeroState: () => void;
}

export function KnowledgeThroughSelect({
  id,
  chapters,
  progress,
  onKnowledgeChapter,
  onReturnToZeroState,
}: KnowledgeThroughSelectProps) {
  return (
    <div className="knowledge-control">
      <label htmlFor={id}>Knowledge through</label>
      <select
        id={id}
        value={progress.viewChapter ?? ""}
        disabled={!progress.furthestChapterRead}
        onChange={(event) =>
          event.target.value
            ? onKnowledgeChapter(event.target.value)
            : onReturnToZeroState()
        }
      >
        <option value="">Zero state</option>
        {unlockedChapters(chapters, progress).map((chapter) => (
          <option key={chapter.chapter} value={chapter.chapter}>
            Chapter {chapter.chapter}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TimelineModeToggleProps {
  progress: ReaderProgress;
  meaningfulDates: readonly string[];
  onDate: (date: string, showContext?: boolean) => void;
  onChapterMode: () => void;
}

export function TimelineModeToggle({
  progress,
  meaningfulDates,
  onDate,
  onChapterMode,
}: TimelineModeToggleProps) {
  return (
    <div className="timeline-mode" role="group" aria-label="Timeline mode">
      <button
        className={progress.mode === "chapter" ? "active" : ""}
        aria-pressed={progress.mode === "chapter"}
        onClick={onChapterMode}
      >
        Chapter mode
      </button>
      <button
        className={progress.mode === "date" ? "active" : ""}
        aria-pressed={progress.mode === "date"}
        disabled={!progress.viewChapter || meaningfulDates.length === 0}
        onClick={() =>
          meaningfulDates[0] &&
          onDate(
            progress.displayDate &&
              meaningfulDates.includes(progress.displayDate)
              ? progress.displayDate
              : meaningfulDates[0],
          )
        }
      >
        Date mode
      </button>
    </div>
  );
}

interface ReadThroughConfirmationProps {
  headingId: string;
  pendingReadThrough: string;
  confirmButton: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation shared by every Read through control. */
export function ReadThroughConfirmation({
  headingId,
  pendingReadThrough,
  confirmButton,
  onConfirm,
  onCancel,
}: ReadThroughConfirmationProps) {
  const dialog = useRef<HTMLDivElement>(null);
  return (
    <div className="confirmation-layer">
      <div className="confirmation-backdrop" aria-hidden="true" />
      <div
        ref={dialog}
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            onCancel();
            return;
          }
          if (event.key !== "Tab") return;
          const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          );
          if (!buttons?.length) return;
          const first = buttons[0]!;
          const last = buttons[buttons.length - 1]!;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="confirmation-heading">
          <ShieldIcon />
          <h2 id={headingId}>Confirm read progress</h2>
        </div>
        <p>
          {pendingReadThrough
            ? `Set spoiler progress through Chapter ${pendingReadThrough}? This reveals its chapter information.`
            : "Return to the pre-book zero state? This hides every chapter-derived fact."}
        </p>
        <button ref={confirmButton} className="button" onClick={onConfirm}>
          Confirm read through
        </button>
        <button className="button quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

interface TopbarReadThroughProps {
  chapters: readonly NarrativeChapterSummary[];
  progress: ReaderProgress;
  pendingReadThrough: string | null;
  /** True while this control owns the open confirmation. */
  ownsConfirmation: boolean;
  onReadThroughChoice: (chapter: string) => void;
  onConfirmReadThrough: () => void;
  onCancelReadThrough: () => void;
}

/** Compact Read through control for the top bar (Variant A). */
export function TopbarReadThrough({
  chapters,
  progress,
  pendingReadThrough,
  ownsConfirmation,
  onReadThroughChoice,
  onConfirmReadThrough,
  onCancelReadThrough,
}: TopbarReadThroughProps) {
  const select = useRef<HTMLSelectElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  useReadThroughConfirmationFocus(
    ownsConfirmation,
    ownsConfirmation ? pendingReadThrough : null,
    confirmButton,
    select,
  );
  return (
    <div className="topbar-read-through">
      <label htmlFor="topbar-read-through">
        <ShieldIcon />
        <span className="topbar-read-through-label">Read through</span>
      </label>
      <select
        ref={select}
        id="topbar-read-through"
        value={
          (ownsConfirmation ? pendingReadThrough : null) ??
          progress.furthestChapterRead ??
          ""
        }
        onChange={(event) => onReadThroughChoice(event.target.value)}
      >
        <ReadThroughOptions chapters={chapters} />
      </select>
      {ownsConfirmation && pendingReadThrough !== null && (
        <ReadThroughConfirmation
          headingId="topbar-read-through-confirmation"
          pendingReadThrough={pendingReadThrough}
          confirmButton={confirmButton}
          onConfirm={onConfirmReadThrough}
          onCancel={onCancelReadThrough}
        />
      )}
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useReadThroughConfirmationFocus } from "./useReadThroughConfirmationFocus";
import {
  PRE_BOOK_LABEL,
  chapterBook,
  chapterNumber,
  CHAPTER_TITLE_SEPARATOR,
  compactReadThroughLabel,
  readThroughLabel,
  truncateChapterTitle,
  visibleChapterTitle,
  type NarrativeChapterSummary,
  type ReaderProgress,
} from "../narrative/progress";
import { compareNarrativeChapters } from "../narrative/model";
import { ChapterPicker } from "./ChapterPicker";
import { BookGlyph, ChevronIcon, ShieldIcon } from "./icons";

export { CloseIcon, ResetViewIcon, SearchIcon, ShieldIcon } from "./icons";

/**
 * A native option's text cannot ellipsize with CSS, so a long title is
 * shortened in the text and given in full in the option's tooltip.
 */
function TitledOption({
  value,
  label,
  title,
}: {
  value: string;
  label: string;
  title: string | null;
}) {
  return (
    <option
      value={value}
      title={title ? `${label}${CHAPTER_TITLE_SEPARATOR}${title}` : undefined}
    >
      {title
        ? `${label}${CHAPTER_TITLE_SEPARATOR}${truncateChapterTitle(title)}`
        : label}
    </option>
  );
}

/**
 * Every chapter is listed, so only those at or before the confirmed Read
 * through carry a title; later chapters stay number-only (spoiler gate).
 */
export function ReadThroughOptions({
  chapters,
  readThroughChapter = null,
}: {
  chapters: readonly NarrativeChapterSummary[];
  readThroughChapter?: string | null;
}) {
  return (
    <>
      <option value="">{PRE_BOOK_LABEL}</option>
      {chapters.map((chapter) => (
        <TitledOption
          key={chapter.chapter}
          value={chapter.chapter}
          label={readThroughLabel(chapter.chapter)}
          title={visibleChapterTitle(
            chapters,
            chapter.chapter,
            readThroughChapter,
          )}
        />
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
          <TitledOption
            key={chapter.chapter}
            value={chapter.chapter}
            label={`Chapter ${chapter.chapter}`}
            title={visibleChapterTitle(
              chapters,
              chapter.chapter,
              progress.furthestChapterRead,
            )}
          />
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
  /** Reports whether the chapter picker is open, so the shell can go inert. */
  onPickerOpenChange?: (open: boolean) => void;
}

/**
 * Compact Read through chip for the top bar (compact chapter selector,
 * Variant A). It opens the chapter picker; a different choice goes through
 * the shared confirmation before the spoiler ceiling changes.
 */
export function TopbarReadThrough({
  chapters,
  progress,
  pendingReadThrough,
  ownsConfirmation,
  onReadThroughChoice,
  onConfirmReadThrough,
  onCancelReadThrough,
  onPickerOpenChange,
}: TopbarReadThroughProps) {
  const chip = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useReadThroughConfirmationFocus(
    ownsConfirmation,
    ownsConfirmation ? pendingReadThrough : null,
    confirmButton,
    chip,
  );
  const value = progress.furthestChapterRead ?? "";
  const setOpen = useCallback(
    (open: boolean) => {
      setPickerOpen(open);
      onPickerOpenChange?.(open);
    },
    [onPickerOpenChange],
  );
  const closePicker = useCallback(() => {
    setOpen(false);
    // The shell may be inert until the next render; return focus after it.
    window.setTimeout(() => chip.current?.focus(), 0);
  }, [setOpen]);
  // The picker has no browser history entry. Browser Back while it is open
  // closes it as a side effect of the same popstate (BOB-20261116-ZBZF9F).
  useEffect(() => {
    if (!pickerOpen) return;
    window.addEventListener("popstate", closePicker);
    return () => window.removeEventListener("popstate", closePicker);
  }, [closePicker, pickerOpen]);
  return (
    <div className="topbar-read-through">
      <span className="topbar-read-through-caption" aria-hidden="true">
        <ShieldIcon />
        <span className="topbar-read-through-label">Read through</span>
      </span>
      <button
        ref={chip}
        id="topbar-read-through"
        type="button"
        className="read-through-chip"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        aria-label={`Read through, ${readThroughLabel(value).replace(" · ", " ")}`}
        onClick={() => setOpen(true)}
      >
        <span className="read-through-chip-pill">
          <BookGlyph />
          <span className="read-through-chip-value">
            {value ? (
              <>
                {chapterBook(value)}
                <span className="read-through-chip-separator"> · </span>
                Ch {chapterNumber(value)}
              </>
            ) : (
              compactReadThroughLabel(value)
            )}
          </span>
          <ChevronIcon />
        </span>
      </button>
      {pickerOpen && (
        <ChapterPicker
          chapters={chapters}
          value={value}
          anchor={chip}
          onClose={closePicker}
          onChoose={(chapter) => {
            setOpen(false);
            if (chapter === value) {
              window.setTimeout(() => chip.current?.focus(), 0);
              return;
            }
            onReadThroughChoice(chapter);
          }}
        />
      )}
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

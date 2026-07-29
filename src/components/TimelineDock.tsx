import { Fragment, useEffect, useRef, useState } from "react";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../narrative/progress";
import { chapterTimelineLabel } from "../narrative/progress";
import { compareNarrativeChapters } from "../narrative/model";

function year(date: string): string {
  return date.split(".", 1)[0]!;
}

function numericYear(date: string): number {
  return Number(year(date));
}

function linearYearOffset(date: string, firstDate: string): number {
  return numericYear(date) - numericYear(firstDate);
}

function ShieldIcon() {
  return (
    <svg className="shield-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20 6v5.6c0 4.7-3.2 8.7-8 9.9-4.8-1.2-8-5.2-8-9.9V6l8-3.5Z" />
      <path d="m8.5 12 2.1 2.1 4.9-4.9" />
    </svg>
  );
}

interface TimelineDockProps {
  idPrefix?: string;
  renderConfirmation?: boolean;
  chapters: readonly NarrativeChapterSummary[];
  progress: ReaderProgress;
  meaningfulDates: readonly string[];
  meaningfulDateSources: ReadonlyMap<string, readonly string[]>;
  pendingReadThrough: string | null;
  onReadThroughChoice: (chapter: string) => void;
  onConfirmReadThrough: () => void;
  onCancelReadThrough: () => void;
  onReturnToZeroState: () => void;
  onKnowledgeChapter: (chapter: string) => void;
  onChapterTimeline?: (chapter: string) => void;
  onDate: (date: string) => void;
  onChapterMode: () => void;
  onZoom: (delta: number) => void;
  onPan: (delta: number) => void;
}

function DateAxis({
  idPrefix,
  meaningfulDates,
  meaningfulDateSources,
  unlocked,
  progress,
  onDate,
  onZoom,
  onPan,
}: Pick<
  TimelineDockProps,
  | "meaningfulDates"
  | "meaningfulDateSources"
  | "progress"
  | "onDate"
  | "onZoom"
  | "onPan"
> & { idPrefix: string; unlocked: NarrativeChapterSummary[] }) {
  const drag = useRef<{ pointerId: number; clientX: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  useEffect(() => {
    const measure = () => setViewportWidth(viewport.current?.clientWidth ?? 0);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const firstDate = meaningfulDates[0] ?? "1";
  const positions = meaningfulDates.map((date) =>
    linearYearOffset(date, firstDate),
  );
  const span = Math.max(1, ...positions);
  const baseScale = Math.min(64, 520 / span);
  const byYear = new Map<string, string[]>();
  for (const date of meaningfulDates) {
    const entries = byYear.get(year(date)) ?? [];
    entries.push(date);
    byYear.set(year(date), entries);
  }
  const width = Math.max(
    160,
    ...[...byYear.values()].map((dates) => {
      const position =
        linearYearOffset(dates[0]!, firstDate) *
        baseScale *
        progress.timelineZoom;
      const choiceSpace = dates.length > 1 ? dates.length * 196 + 8 : 120;
      return position + choiceSpace;
    }),
  );
  const panDistance = Math.max(0, width - viewportWidth);

  return (
    <div className="date-navigation">
      <p className="timeline-gesture-help" id={`${idPrefix}-date-axis-help`}>
        Mouse wheel: zoom · Drag: pan · Keyboard: +/− and arrow keys
      </p>
      <div
        className={`date-axis-viewport ${dragging ? "dragging" : ""}`}
        ref={viewport}
        aria-label="Meaningful story dates"
        aria-describedby={`${idPrefix}-date-axis-help`}
        tabIndex={0}
        onWheel={(event) => {
          event.preventDefault();
          onZoom(event.deltaY < 0 ? 1 : -1);
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            onZoom(1);
          } else if (event.key === "-") {
            event.preventDefault();
            onZoom(-1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            onPan(-0.1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            onPan(0.1);
          }
        }}
        onPointerDown={(event) => {
          drag.current = { pointerId: event.pointerId, clientX: event.clientX };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!drag.current || drag.current.pointerId !== event.pointerId)
            return;
          const distance = event.clientX - drag.current.clientX;
          if (distance === 0) return;
          drag.current.clientX = event.clientX;
          onPan(-distance / 360);
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId === event.pointerId) drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        <div
          className="date-axis"
          style={{
            width: `${width}px`,
            transform: `translateX(${progress.timelinePan * -panDistance}px)`,
          }}
        >
          {[...byYear.entries()].map(([calendarYear, dates]) => {
            const position =
              linearYearOffset(dates[0]!, firstDate) *
              baseScale *
              progress.timelineZoom;
            const multipleStates = dates.length > 1;
            const expanded = expandedYear === calendarYear;
            const selected = dates.some(
              (date) => date === progress.displayDate,
            );
            const choiceListId = `${idPrefix}-story-year-${calendarYear}-choices`;
            return (
              <div
                className="year-cluster"
                key={calendarYear}
                style={{ left: `${position}px` }}
                data-year-position={position}
              >
                <button
                  className={`year-marker ${selected ? "selected" : ""}`}
                  aria-label={
                    multipleStates
                      ? `${calendarYear}, ${dates.length} story states`
                      : calendarYear
                  }
                  aria-pressed={selected}
                  aria-expanded={multipleStates ? expanded : undefined}
                  aria-controls={multipleStates ? choiceListId : undefined}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    if (multipleStates) {
                      setExpandedYear(expanded ? null : calendarYear);
                    } else {
                      onDate(dates[0]!);
                    }
                  }}
                >
                  <span className="year-value">{calendarYear}</span>
                  {multipleStates && (
                    <span className="year-state-count">
                      {dates.length} states
                    </span>
                  )}
                </button>
                {multipleStates && expanded && (
                  <ul
                    id={choiceListId}
                    className="year-state-choices"
                    aria-label={`${calendarYear} story states`}
                  >
                    {dates.map((date, index) => {
                      const source = unlocked.find(
                        (chapter) => chapter.date === date,
                      );
                      const sourceChapters =
                        meaningfulDateSources.get(date) ?? [];
                      const sourceContext =
                        sourceChapters.length === 1
                          ? `revealed in Chapter ${sourceChapters[0]}`
                          : sourceChapters.length > 1
                            ? `revealed in Chapters ${sourceChapters.join(", ")}`
                            : "reader-visible source";
                      const fallback = `Story state ${index + 1} of ${dates.length} · ${sourceContext}`;
                      return (
                        <li key={date}>
                          <button
                            className={
                              date === progress.displayDate ? "selected" : ""
                            }
                            aria-pressed={date === progress.displayDate}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => {
                              onDate(date);
                              setExpandedYear(null);
                            }}
                          >
                            {source ? `Chapter ${source.chapter}` : fallback}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TimelineDock({
  idPrefix = "desktop",
  renderConfirmation = true,
  chapters,
  progress,
  meaningfulDates,
  meaningfulDateSources,
  pendingReadThrough,
  onReadThroughChoice,
  onConfirmReadThrough,
  onCancelReadThrough,
  onReturnToZeroState,
  onKnowledgeChapter,
  onChapterTimeline,
  onDate,
  onChapterMode,
  onZoom,
  onPan,
}: TimelineDockProps) {
  const readThroughId = `${idPrefix}-read-through`;
  const knowledgeThroughId = `${idPrefix}-knowledge-through`;
  const confirmationHeadingId = `${idPrefix}-read-through-confirmation`;
  const unlocked = progress.furthestChapterRead
    ? chapters.filter(
        (chapter) =>
          compareNarrativeChapters(
            chapter.chapter,
            progress.furthestChapterRead!,
          ) <= 0,
      )
    : [];
  const selectedReadThrough =
    pendingReadThrough ?? progress.furthestChapterRead ?? "";
  const readThroughSelect = useRef<HTMLSelectElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const confirmationDialog = useRef<HTMLDivElement>(null);
  const confirmationWasOpen = useRef(false);

  useEffect(() => {
    if (!renderConfirmation) return;
    if (pendingReadThrough !== null) {
      confirmationWasOpen.current = true;
      confirmButton.current?.focus();
      return;
    }
    if (confirmationWasOpen.current) {
      confirmationWasOpen.current = false;
      readThroughSelect.current?.focus();
    }
  }, [pendingReadThrough, renderConfirmation]);

  return (
    <section
      className="timeline-dock"
      aria-label="Reader progress and temporal navigation"
    >
      <div className="progress-control spoiler-limit">
        <label htmlFor={readThroughId}>
          <ShieldIcon />
          Read through
        </label>
        <select
          ref={readThroughSelect}
          id={readThroughId}
          value={selectedReadThrough}
          onChange={(event) => onReadThroughChoice(event.target.value)}
        >
          <option value="">Pre-book zero state</option>
          {chapters.map((chapter) => (
            <option key={chapter.chapter} value={chapter.chapter}>
              Book {chapter.chapter.split(".")[0]} · Chapter{" "}
              {chapter.chapter.split(".")[1]}
            </option>
          ))}
        </select>
        <p>
          <strong>Spoiler-free limit.</strong> Confirm before revealing more.
        </p>
      </div>

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

      {progress.mode === "chapter" ? (
        <div className="chapter-navigation">
          <div className="knowledge-control">
            <label htmlFor={knowledgeThroughId}>Knowledge through</label>
            <select
              id={knowledgeThroughId}
              value={progress.viewChapter ?? ""}
              disabled={!progress.furthestChapterRead}
              onChange={(event) =>
                event.target.value
                  ? onKnowledgeChapter(event.target.value)
                  : onReturnToZeroState()
              }
            >
              <option value="">Zero state</option>
              {unlocked.map((chapter) => (
                <option key={chapter.chapter} value={chapter.chapter}>
                  Chapter {chapter.chapter}
                </option>
              ))}
            </select>
          </div>
          <ol
            className="chapter-track"
            aria-label="Reading-order chapter timeline"
          >
            <li className="chapter-track-zero">
              <button
                className={!progress.viewChapter ? "selected" : ""}
                aria-current={!progress.viewChapter ? "true" : undefined}
                aria-label="Zero state"
                onClick={onReturnToZeroState}
              >
                <span className="chapter-above">Zero state</span>
                <span className="chapter-dot" />
                <span className="chapter-details">Pre-book view</span>
              </button>
            </li>
            {chapters.map((chapter, index) => {
              const locked =
                !progress.furthestChapterRead ||
                compareNarrativeChapters(
                  chapter.chapter,
                  progress.furthestChapterRead,
                ) > 0;
              const selected = chapter.chapter === progress.viewChapter;
              const label = chapterTimelineLabel(chapter);
              const bookNumber = chapter.chapter.split(".")[0]!;
              const localNumber = chapter.chapter.split(".")[1]!;
              return (
                <Fragment key={chapter.chapter}>
                  {(index === 0 ||
                    chapter.chapter.split(".")[0] !==
                      chapters[index - 1]!.chapter.split(".")[0]) && (
                    <li
                      className="chapter-book-divider"
                      key={`book-${chapter.chapter.split(".")[0]}`}
                    >
                      <span>Book {chapter.chapter.split(".")[0]}</span>
                    </li>
                  )}
                  <li key={chapter.chapter} className="chapter-track-entry">
                    <button
                      data-chapter={chapter.chapter}
                      className={`${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
                      disabled={locked}
                      aria-current={selected ? "true" : undefined}
                      aria-label={
                        locked
                          ? `Book ${bookNumber}, Chapter ${localNumber}, locked`
                          : `Book ${bookNumber}, ${label}`
                      }
                      onClick={() =>
                        (onChapterTimeline ?? onKnowledgeChapter)(
                          chapter.chapter,
                        )
                      }
                    >
                      <span className="chapter-above">
                        {locked ? `Chapter ${chapter.chapter}` : label}
                      </span>
                      <span className="chapter-dot" />
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
      ) : (
        <DateAxis
          idPrefix={idPrefix}
          meaningfulDates={meaningfulDates}
          meaningfulDateSources={meaningfulDateSources}
          unlocked={unlocked}
          progress={progress}
          onDate={onDate}
          onZoom={onZoom}
          onPan={onPan}
        />
      )}

      {renderConfirmation && pendingReadThrough !== null && (
        <div className="confirmation-layer">
          <div className="confirmation-backdrop" aria-hidden="true" />
          <div
            ref={confirmationDialog}
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmationHeadingId}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                onCancelReadThrough();
                return;
              }
              if (event.key !== "Tab") return;
              const buttons =
                confirmationDialog.current?.querySelectorAll<HTMLButtonElement>(
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
              <h2 id={confirmationHeadingId}>Confirm read progress</h2>
            </div>
            <p>
              {pendingReadThrough
                ? `Set spoiler progress through Chapter ${pendingReadThrough}? This reveals its chapter information.`
                : "Return to the pre-book zero state? This hides every chapter-derived fact."}
            </p>
            <button
              ref={confirmButton}
              className="button"
              onClick={onConfirmReadThrough}
            >
              Confirm read through
            </button>
            <button className="button quiet" onClick={onCancelReadThrough}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

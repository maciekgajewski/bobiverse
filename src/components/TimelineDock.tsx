import { Fragment, useEffect, useRef, useState } from "react";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../narrative/progress";
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

function chronologyDirection(
  chapter: NarrativeChapterSummary,
  previous: NarrativeChapterSummary | undefined,
): string | null {
  if (!previous) return null;
  const difference = numericYear(chapter.date) - numericYear(previous.date);
  if (difference > 0) return "Story time moves forward";
  if (difference < 0) return "Story time moves backward";
  return "Same story year";
}

interface TimelineDockProps {
  chapters: readonly NarrativeChapterSummary[];
  progress: ReaderProgress;
  meaningfulDates: readonly string[];
  pendingReadThrough: string | null;
  onReadThroughChoice: (chapter: string) => void;
  onConfirmReadThrough: () => void;
  onCancelReadThrough: () => void;
  onKnowledgeChapter: (chapter: string) => void;
  onDate: (date: string) => void;
  onChapterMode: () => void;
  onZoom: (delta: number) => void;
  onPan: (delta: number) => void;
}

function DateAxis({
  meaningfulDates,
  unlocked,
  progress,
  onDate,
  onZoom,
  onPan,
}: Pick<
  TimelineDockProps,
  "meaningfulDates" | "progress" | "onDate" | "onZoom" | "onPan"
> & { unlocked: NarrativeChapterSummary[] }) {
  const drag = useRef<{ pointerId: number; clientX: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
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
  const width = Math.max(160, span * baseScale * progress.timelineZoom + 120);
  const panDistance = Math.max(0, width - viewportWidth);

  return (
    <div className="date-navigation">
      <p className="timeline-gesture-help" id="date-axis-help">
        Mouse wheel: zoom · Drag: pan · Keyboard: +/− and arrow keys
      </p>
      <div
        className={`date-axis-viewport ${dragging ? "dragging" : ""}`}
        ref={viewport}
        aria-label="Meaningful story dates"
        aria-describedby="date-axis-help"
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
            return (
              <div
                className="year-cluster"
                key={calendarYear}
                style={{ left: `${position}px` }}
                data-year-position={position}
              >
                <span>{calendarYear}</span>
                <ul
                  aria-label={`${calendarYear}, ${dates.length} meaningful date${dates.length === 1 ? "" : "s"}`}
                >
                  {dates.map((date) => {
                    const source = unlocked.find(
                      (chapter) => chapter.date === date,
                    );
                    return (
                      <li key={date}>
                        <button
                          className={
                            date === progress.displayDate ? "selected" : ""
                          }
                          aria-pressed={date === progress.displayDate}
                          onClick={() => onDate(date)}
                        >
                          {source
                            ? `Chapter ${source.chapter}`
                            : `Known date ${calendarYear}`}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TimelineDock({
  chapters,
  progress,
  meaningfulDates,
  pendingReadThrough,
  onReadThroughChoice,
  onConfirmReadThrough,
  onCancelReadThrough,
  onKnowledgeChapter,
  onDate,
  onChapterMode,
  onZoom,
  onPan,
}: TimelineDockProps) {
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

  return (
    <section
      className="timeline-dock"
      aria-label="Reader progress and temporal navigation"
    >
      <div className="progress-control spoiler-limit">
        <label htmlFor="read-through">Read through</label>
        <select
          id="read-through"
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
          <strong>Spoiler-free limit.</strong> Choose the furthest chapter you
          have read; confirmation appears before this limit changes.
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
          <label htmlFor="knowledge-through">Knowledge through</label>
          <select
            id="knowledge-through"
            value={progress.viewChapter ?? ""}
            disabled={!progress.viewChapter}
            onChange={(event) => onKnowledgeChapter(event.target.value)}
          >
            {!progress.viewChapter && (
              <option value="">No chapter selected</option>
            )}
            {unlocked.map((chapter) => (
              <option key={chapter.chapter} value={chapter.chapter}>
                Chapter {chapter.chapter}
              </option>
            ))}
          </select>
          <ol
            className="chapter-track"
            aria-label="Reading-order chapter timeline"
          >
            <li className="chapter-track-zero">
              <button
                className={!progress.viewChapter ? "selected" : ""}
                aria-current={!progress.viewChapter ? "true" : undefined}
                onClick={() => onReadThroughChoice("")}
              >
                <span className="chapter-dot" />
                <span>Zero state</span>
              </button>
            </li>
            {chapters.map((chapter, index) => {
              const locked =
                !progress.furthestChapterRead ||
                compareNarrativeChapters(
                  chapter.chapter,
                  progress.furthestChapterRead,
                ) > 0;
              const direction = chronologyDirection(
                chapter,
                chapters[index - 1],
              );
              const selected = chapter.chapter === progress.viewChapter;
              return (
                <Fragment key={chapter.chapter}>
                  {(index === 0 ||
                    chapter.chapter.split(".")[0] !==
                      chapters[index - 1]!.chapter.split(".")[0]) && (
                    <li
                      className="chapter-book-divider"
                      key={`book-${chapter.chapter.split(".")[0]}`}
                    >
                      Book {chapter.chapter.split(".")[0]}
                    </li>
                  )}
                  <li key={chapter.chapter} className="chapter-track-entry">
                    <button
                      className={`${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
                      disabled={locked}
                      aria-current={selected ? "true" : undefined}
                      aria-label={
                        locked
                          ? `Book ${chapter.chapter.split(".")[0]}, Chapter ${chapter.chapter.split(".")[1]}, locked`
                          : undefined
                      }
                      onClick={() => onKnowledgeChapter(chapter.chapter)}
                    >
                      <span className="chapter-dot" />
                      <span>Chapter {chapter.chapter}</span>
                      {!locked && (
                        <span className="chapter-title">{chapter.title}</span>
                      )}
                      {!locked && (
                        <span className="chapter-year">
                          {year(chapter.date)}
                        </span>
                      )}
                      {!locked && direction && (
                        <span className="chronology-indicator">
                          {direction}
                        </span>
                      )}
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
      ) : (
        <DateAxis
          meaningfulDates={meaningfulDates}
          unlocked={unlocked}
          progress={progress}
          onDate={onDate}
          onZoom={onZoom}
          onPan={onPan}
        />
      )}

      {pendingReadThrough !== null && (
        <div
          className="confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="read-through-confirmation"
        >
          <h2 id="read-through-confirmation">Confirm read progress</h2>
          <p>
            {pendingReadThrough
              ? `Set spoiler progress through Chapter ${pendingReadThrough}? This reveals its chapter information.`
              : "Return to the pre-book zero state? This hides every chapter-derived fact."}
          </p>
          <button className="button" onClick={onConfirmReadThrough}>
            Confirm read through
          </button>
          <button className="button quiet" onClick={onCancelReadThrough}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

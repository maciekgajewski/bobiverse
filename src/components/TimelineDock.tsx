import { Fragment, useEffect, useRef, useState } from "react";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../narrative/progress";
import { chapterTimelineLabel } from "../narrative/progress";
import {
  compareNarrativeChapters,
  formatNarrativeDate,
  narrativeDateAxisCoordinate,
} from "../narrative/model";

function numericYear(date: string): number {
  return narrativeDateAxisCoordinate(date);
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
  onDate: (date: string, showContext?: boolean) => void;
  onChapterMode: () => void;
  onZoom: (zoom: number, pan: number) => void;
  onPan: (delta: number) => void;
}

type TickGranularity = "century" | "decade" | "year" | "month" | "day";

function daysInYear(year: number): number {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

function daysInMonth(year: number, month: number): number {
  return [
    31,
    daysInYear(year) === 366 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1]!;
}

function coordinateForCalendarDate(year: number, month = 1, day = 1): number {
  let elapsedDays = day - 1;
  for (let currentMonth = 1; currentMonth < month; currentMonth += 1)
    elapsedDays += daysInMonth(year, currentMonth);
  return year + elapsedDays / daysInYear(year);
}

function tickGranularity(pixelsPerYear: number): TickGranularity {
  if (pixelsPerYear / 366 >= 78) return "day";
  if (pixelsPerYear / 12 >= 56) return "month";
  if (pixelsPerYear >= 38) return "year";
  if (pixelsPerYear * 10 >= 38) return "decade";
  return "century";
}

function dateTicks(
  granularity: TickGranularity,
  minimum: number,
  maximum: number,
): { coordinate: number; label: string }[] {
  const ticks: { coordinate: number; label: string }[] = [];
  const firstYear = Math.floor(minimum);
  const lastYear = Math.ceil(maximum);
  if (
    granularity === "century" ||
    granularity === "decade" ||
    granularity === "year"
  ) {
    const step =
      granularity === "century" ? 100 : granularity === "decade" ? 10 : 1;
    const first = Math.floor(firstYear / step) * step;
    for (let year = first; year <= lastYear; year += step) {
      if (year >= minimum - 1 && year <= maximum + 1)
        ticks.push({ coordinate: year, label: String(year) });
    }
    return ticks;
  }
  for (let year = firstYear; year <= lastYear; year += 1) {
    const finalMonth = granularity === "month" ? 12 : 12;
    for (let month = 1; month <= finalMonth; month += 1) {
      const finalDay = granularity === "day" ? daysInMonth(year, month) : 1;
      for (let day = 1; day <= finalDay; day += 1) {
        const coordinate = coordinateForCalendarDate(year, month, day);
        if (coordinate < minimum - 1 / 366 || coordinate > maximum + 1 / 366)
          continue;
        ticks.push({
          coordinate,
          label:
            granularity === "month"
              ? `${year}-${String(month).padStart(2, "0")}`
              : `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        });
      }
    }
  }
  return ticks;
}

function DateAxis({
  idPrefix,
  meaningfulDates,
  meaningfulDateSources,
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
> & { idPrefix: string }) {
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
  const byPosition = new Map<number, string[]>();
  for (const date of meaningfulDates) {
    const coordinate = narrativeDateAxisCoordinate(date);
    const entries = byPosition.get(coordinate) ?? [];
    entries.push(date);
    byPosition.set(coordinate, entries);
  }
  const horizontalPadding = 28;
  const eventDotDiameter = 0.75;
  const eventDotStep = eventDotDiameter * 1.12;
  const axisLineBottom = 2.1;
  const axisHeight = Math.max(
    5,
    0.5 +
      axisLineBottom -
      eventDotDiameter / 2 +
      (Math.max(
        1,
        ...Array.from(byPosition.values(), (dates) => dates.length),
      ) -
        1) *
        eventDotStep +
      eventDotDiameter,
  );
  const pixelsPerYear = baseScale * progress.timelineZoom;
  const width = Math.max(
    viewportWidth,
    horizontalPadding * 2 + span * pixelsPerYear,
  );
  const panDistance = width + viewportWidth;
  const axisStart = numericYear(firstDate);
  const panPixels = progress.timelinePan * panDistance;
  const visibleMinimum =
    axisStart + Math.max(0, panPixels - horizontalPadding) / pixelsPerYear;
  const visibleMaximum =
    axisStart + (panPixels + viewportWidth - horizontalPadding) / pixelsPerYear;
  const granularity = tickGranularity(pixelsPerYear);
  const ticks = dateTicks(granularity, visibleMinimum, visibleMaximum);
  const updateZoom = (direction: 1 | -1, pointerX: number) => {
    const nextZoom =
      direction > 0 ? progress.timelineZoom * 2 : progress.timelineZoom / 2;
    const boundedZoom = Math.max(1, Math.min(16384, nextZoom));
    if (boundedZoom === progress.timelineZoom) return;
    const coordinate =
      axisStart + (pointerX + panPixels - horizontalPadding) / pixelsPerYear;
    const nextScale = baseScale * boundedZoom;
    const nextWidth = Math.max(
      viewportWidth,
      horizontalPadding * 2 + span * nextScale,
    );
    const nextPanDistance = nextWidth + viewportWidth;
    const nextPan = Math.max(
      -1,
      Math.min(
        1,
        (horizontalPadding + (coordinate - axisStart) * nextScale - pointerX) /
          nextPanDistance,
      ),
    );
    onZoom(boundedZoom, nextPan);
  };

  return (
    <div className="date-navigation">
      <p className="timeline-gesture-help" id={`${idPrefix}-date-axis-help`}>
        Mouse wheel: zoom at pointer · Drag: pan · Keyboard: +/− and arrow keys
      </p>
      <div
        className={`date-axis-viewport ${dragging ? "dragging" : ""}`}
        ref={viewport}
        aria-label="Meaningful story dates"
        aria-describedby={`${idPrefix}-date-axis-help`}
        tabIndex={0}
        onWheel={(event) => {
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          updateZoom(event.deltaY < 0 ? 1 : -1, event.clientX - bounds.left);
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            updateZoom(1, viewportWidth / 2);
          } else if (event.key === "-") {
            event.preventDefault();
            updateZoom(-1, viewportWidth / 2);
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
          data-axis-start={axisStart}
          data-pan-pixels={panPixels}
          data-pixels-per-year={pixelsPerYear}
          style={{
            minHeight: `${axisHeight}rem`,
            width: `${width}px`,
            transform: `translateX(${progress.timelinePan * -panDistance}px)`,
          }}
        >
          <div className="date-axis-line" aria-hidden="true" />
          {ticks.map((tick) => (
            <div
              className="date-axis-tick"
              key={`${granularity}-${tick.coordinate}`}
              style={{
                left: `${horizontalPadding + (tick.coordinate - axisStart) * pixelsPerYear}px`,
              }}
            >
              <span className="date-axis-tick-mark" />
              <span className="date-axis-tick-label">{tick.label}</span>
            </div>
          ))}
          {[...byPosition.entries()].map(([coordinate, dates]) => {
            const position =
              horizontalPadding + (coordinate - axisStart) * pixelsPerYear;
            const clusterKey = String(coordinate);
            return (
              <div
                className="date-event-cluster"
                key={clusterKey}
                style={{ left: `${position}px` }}
                data-year-position={position}
              >
                {dates.map((date, index) => {
                  const sourceChapters = meaningfulDateSources.get(date) ?? [];
                  const sourceContext =
                    sourceChapters.length === 1
                      ? `revealed in Chapter ${sourceChapters[0]}`
                      : sourceChapters.length > 1
                        ? `revealed in Chapters ${sourceChapters.join(", ")}`
                        : "reader-visible source";
                  return (
                    <button
                      className={`date-event-dot ${date === progress.displayDate ? "selected" : ""}`}
                      key={date}
                      style={{
                        bottom: `${axisLineBottom - eventDotDiameter / 2 + index * eventDotStep}rem`,
                      }}
                      aria-label={`Story state ${index + 1} of ${dates.length} · ${formatNarrativeDate(date)} · ${sourceContext}`}
                      aria-pressed={date === progress.displayDate}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onDate(date, true)}
                    />
                  );
                })}
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

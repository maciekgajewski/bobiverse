import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimelineDock } from "../../src/components/TimelineDock";
import { defaultBrowserGroupState } from "../../src/narrative/browser";
import { chapterTimelineLabel } from "../../src/narrative/progress";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../../src/narrative/progress";

const chapters: NarrativeChapterSummary[] = [
  {
    chapter: "1.1",
    title: "Visible chapter",
    date: "2000",
    bookTitle: "Fixture",
  },
  {
    chapter: "1.2",
    title: "Future chapter",
    date: "2010",
    bookTitle: "Fixture",
  },
  {
    chapter: "1.3",
    title: "Much later chapter",
    date: "2110",
    bookTitle: "Fixture",
  },
];
const progress: ReaderProgress = {
  furthestChapterRead: "1.1",
  viewChapter: "1.1",
  displayDate: "2000",
  mode: "chapter",
  timelineZoom: 1,
  timelinePan: 0,
  browserGroups: defaultBrowserGroupState(),
  characterInspectorSections: {
    overview: true,
    lineage: false,
    travelHistory: false,
  },
};
const noDateSources = new Map<string, readonly string[]>();

describe("timeline dock", () => {
  afterEach(cleanup);

  it("keeps locked chapter metadata out of accessible UI", () => {
    render(
      <TimelineDock
        chapters={chapters}
        progress={progress}
        meaningfulDates={["2000"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    expect(screen.getByText("1 — Visible chapter")).toBeInTheDocument();
    expect(screen.queryByText("Future chapter")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Book 1, Chapter 2, locked" }),
    ).toBeDisabled();
  });

  it("formats concise chapter labels without duplicated numeric prefixes", () => {
    expect(chapterTimelineLabel({ chapter: "1.3", title: " 3 " })).toBe("3");
    for (const separator of ["-", "–", "—", ":"]) {
      expect(
        chapterTimelineLabel({
          chapter: "1.3",
          title: ` 3 ${separator} Descriptive fixture `,
        }),
      ).toBe(`3 ${separator} Descriptive fixture`);
    }
    expect(
      chapterTimelineLabel({
        chapter: "1.3",
        title: "Unprefixed fixture",
      }),
    ).toBe("3 — Unprefixed fixture");
  });

  it("removes story years and chronology notes from unlocked chapter entries", () => {
    render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, furthestChapterRead: "1.3" }}
        meaningfulDates={["2000"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    const timeline = screen.getByRole("list", {
      name: "Reading-order chapter timeline",
    });
    expect(within(timeline).queryByText("2000")).not.toBeInTheDocument();
    expect(within(timeline).queryByText("2010")).not.toBeInTheDocument();
    expect(
      within(timeline).queryByText(/story time|story year/i),
    ).not.toBeInTheDocument();
  });

  it("uses the read-through selector itself as the confirmation gate", async () => {
    const user = userEvent.setup();
    const choice = vi.fn();
    render(
      <TimelineDock
        chapters={chapters}
        progress={progress}
        meaningfulDates={["2000"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={choice}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Read through"), "1.2");
    expect(choice).toHaveBeenCalledWith("1.2");
    expect(
      screen.getByRole("option", { name: "Pre-book zero state" }),
    ).toBeInTheDocument();
  });

  it("shows the pre-book option when no spoiler ceiling is confirmed", () => {
    render(
      <TimelineDock
        chapters={chapters}
        progress={{
          ...progress,
          furthestChapterRead: null,
          viewChapter: null,
          displayDate: null,
        }}
        meaningfulDates={[]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Read through")).toHaveValue("");
  });

  it("returns to zero state directly from the chapter timeline", async () => {
    const user = userEvent.setup();
    const chooseReadThrough = vi.fn();
    const returnToZeroState = vi.fn();
    render(
      <TimelineDock
        chapters={chapters}
        progress={progress}
        meaningfulDates={["2000"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={chooseReadThrough}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={returnToZeroState}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Zero state" }));
    expect(returnToZeroState).toHaveBeenCalledOnce();
    expect(chooseReadThrough).not.toHaveBeenCalled();
  });

  it("uses a true linear plot axis without exposing date indices", () => {
    const { container } = render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, mode: "date", displayDate: "2000" }}
        meaningfulDates={["2000", "2010", "2110"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    expect(container.querySelector(".date-axis-line")).toBeInTheDocument();
    const positions = [
      ...container.querySelectorAll<HTMLElement>(".date-event-cluster"),
    ].map((node) => Number(node.dataset.yearPosition));
    expect(positions[2]! - positions[0]!).toBeCloseTo(
      (positions[1]! - positions[0]!) * 11,
    );
    expect(screen.queryByText("2000.1")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "2000" }),
    ).not.toBeInTheDocument();
  });

  it("selects the only story state by clicking its event dot", async () => {
    const user = userEvent.setup();
    const selectDate = vi.fn();
    render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, mode: "date", displayDate: "2000" }}
        meaningfulDates={["2000", "2010"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={selectDate}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Story state 1 of 1 · 2010 · reader-visible source",
      }),
    );

    expect(selectDate).toHaveBeenCalledWith("2010", true);
  });

  it("increases regular tick detail with available rendered spacing", () => {
    const width = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(500);
    const { container } = render(
      <TimelineDock
        chapters={chapters}
        progress={{
          ...progress,
          mode: "date",
          displayDate: "2000",
          timelineZoom: 256,
        }}
        meaningfulDates={["2000", "2010", "2110"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );

    expect(
      container.querySelectorAll(".date-axis-tick-label"),
    ).not.toHaveLength(0);
    expect(screen.getByText("2000-01")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "2000-01" }),
    ).not.toBeInTheDocument();
    width.mockRestore();
  });

  it("stacks same-coordinate states as independently selectable dots", async () => {
    const user = userEvent.setup();
    const selectDate = vi.fn();
    render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, mode: "date", displayDate: "2000" }}
        meaningfulDates={["2000", "2000.1"]}
        meaningfulDateSources={
          new Map([
            ["2000", ["1.1"]],
            ["2000.1", ["1.1"]],
          ])
        }
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={selectDate}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Story state 1 of 2 · 2000 · revealed in Chapter 1.1",
      }),
    );

    expect(selectDate).toHaveBeenCalledWith("2000", true);
    expect(
      screen.getByRole("button", {
        name: "Story state 2 of 2 · 2000 · revealed in Chapter 1.1",
      }),
    ).toBeInTheDocument();
  });

  it("keeps clustered dots at the same linear coordinate without clipping", () => {
    const dates = ["2000", "2110.0", "2110.1", "2110.2", "2110.3", "2110.4"];
    const { container } = render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, mode: "date", displayDate: "2000" }}
        meaningfulDates={dates}
        meaningfulDateSources={
          new Map(dates.map((date) => [date, ["1.1"]] as const))
        }
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );

    const clusters = [
      ...container.querySelectorAll<HTMLElement>(".date-event-cluster"),
    ];
    expect(clusters).toHaveLength(2);
    expect(clusters[1]?.querySelectorAll(".date-event-dot")).toHaveLength(5);
    expect(
      Number.parseFloat(
        container.querySelector<HTMLElement>(".date-axis")!.style.minHeight,
      ),
    ).toBeGreaterThan(6);
    const stackedDots = [
      ...clusters[1]!.querySelectorAll<HTMLElement>(".date-event-dot"),
    ];
    const firstBottom = Number.parseFloat(stackedDots[0]!.style.bottom);
    const secondBottom = Number.parseFloat(stackedDots[1]!.style.bottom);
    expect((secondBottom - firstBottom) / 0.75).toBeCloseTo(1.12);
    expect(screen.queryByText(/2110\.[0-9]/)).not.toBeInTheDocument();
  });

  it("preserves the pointer calendar coordinate when wheel zooming", () => {
    const onZoom = vi.fn();
    const width = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(500);
    const { container } = render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, mode: "date", displayDate: "2000" }}
        meaningfulDates={["2000", "2010", "2110"]}
        meaningfulDateSources={noDateSources}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onReturnToZeroState={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={onZoom}
        onPan={vi.fn()}
      />,
    );
    const viewport = container.querySelector<HTMLElement>(
      ".date-axis-viewport",
    )!;
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      bottom: 80,
      height: 80,
      left: 100,
      right: 600,
      top: 0,
      width: 500,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });

    const axis = container.querySelector<HTMLElement>(".date-axis")!;
    const start = Number(axis.dataset.axisStart);
    const pixelsPerYear = Number(axis.dataset.pixelsPerYear);
    for (const [index, pointerX] of [5, 495].entries()) {
      const before = start + (pointerX - 28) / pixelsPerYear;
      fireEvent.wheel(viewport, { clientX: pointerX + 100, deltaY: -1 });

      expect(onZoom).toHaveBeenNthCalledWith(index + 1, 2, expect.any(Number));
      const nextZoom = onZoom.mock.calls[index]?.[0] as number;
      const nextPan = onZoom.mock.calls[index]?.[1] as number;
      const nextPixelsPerYear = pixelsPerYear * nextZoom;
      const nextWidth = Math.max(500, 56 + 110 * nextPixelsPerYear);
      const nextPanPixels = nextPan * (nextWidth + 500);
      const after = start + (pointerX + nextPanPixels - 28) / nextPixelsPerYear;
      expect(after).toBeCloseTo(before, 10);
    }
    width.mockRestore();
  });
});

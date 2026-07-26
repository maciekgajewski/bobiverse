import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimelineDock } from "../../src/components/TimelineDock";
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
    expect(screen.getByText("Visible chapter")).toBeInTheDocument();
    expect(screen.queryByText("Future chapter")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Book 1, Chapter 2, locked" }),
    ).toBeDisabled();
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

  it("uses true linear year spacing without exposing date indices", () => {
    render(
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
    const positions = screen
      .getAllByText(/^(2000|2010|2110)$/)
      .map((node) =>
        Number(
          node.closest(".year-cluster")?.getAttribute("data-year-position"),
        ),
      );
    expect(positions[2]! - positions[0]!).toBe(
      (positions[1]! - positions[0]!) * 11,
    );
    expect(screen.queryByText("2000.1")).not.toBeInTheDocument();
  });

  it("selects the only story state by clicking its year marker", async () => {
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

    await user.click(screen.getByRole("button", { name: "2010" }));

    expect(selectDate).toHaveBeenCalledWith("2010");
  });

  it("opens spoiler-safe choices when a year has multiple states", async () => {
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
      screen.getByRole("button", { name: "2000, 2 story states" }),
    );

    expect(selectDate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("list", { name: "2000 story states" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("2000.1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chapter 1.1" }));

    expect(selectDate).toHaveBeenCalledWith("2000");
    expect(
      screen.queryByRole("list", { name: "2000 story states" }),
    ).not.toBeInTheDocument();
  });

  it("keeps latest-year choices unique and inside the pannable axis", async () => {
    const user = userEvent.setup();
    const dates = ["2000", "2110.0", "2110.1", "2110.2", "2110.3"];
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

    await user.click(
      screen.getByRole("button", { name: "2110, 4 story states" }),
    );

    const choices = within(
      screen.getByRole("list", { name: "2110 story states" }),
    ).getAllByRole("button");
    expect(new Set(choices.map((choice) => choice.textContent)).size).toBe(4);
    expect(choices[1]).toHaveTextContent(
      "Story state 2 of 4 · revealed in Chapter 1.1",
    );
    expect(screen.queryByText(/2110\.[0-9]/)).not.toBeInTheDocument();

    const axis = container.querySelector<HTMLElement>(".date-axis")!;
    const lastCluster = container.querySelector<HTMLElement>(
      ".year-cluster:last-child",
    )!;
    const trailingSpace =
      Number.parseFloat(axis.style.width) -
      Number(lastCluster.dataset.yearPosition);
    expect(trailingSpace).toBeGreaterThanOrEqual(4 * 196);
  });
});

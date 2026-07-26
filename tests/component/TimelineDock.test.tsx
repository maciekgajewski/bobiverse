import { cleanup, render, screen } from "@testing-library/react";
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

describe("timeline dock", () => {
  afterEach(cleanup);

  it("keeps locked chapter metadata out of accessible UI", () => {
    render(
      <TimelineDock
        chapters={chapters}
        progress={progress}
        meaningfulDates={["2000"]}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
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
        pendingReadThrough={null}
        onReadThroughChoice={choice}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
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
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Read through")).toHaveValue("");
  });

  it("uses true linear year spacing without exposing date indices", () => {
    render(
      <TimelineDock
        chapters={chapters}
        progress={{ ...progress, mode: "date", displayDate: "2000" }}
        meaningfulDates={["2000", "2010", "2110"]}
        pendingReadThrough={null}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
        onKnowledgeChapter={vi.fn()}
        onDate={vi.fn()}
        onChapterMode={vi.fn()}
        onZoom={vi.fn()}
        onPan={vi.fn()}
      />,
    );
    const positions = screen
      .getAllByText(/^(2000|2010|2110)$/)
      .map((node) => Number(node.parentElement?.dataset.yearPosition));
    expect(positions[2]! - positions[0]!).toBe(
      (positions[1]! - positions[0]!) * 11,
    );
    expect(screen.queryByText("2000.1")).not.toBeInTheDocument();
  });
});

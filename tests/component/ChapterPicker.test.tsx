import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopbarReadThrough } from "../../src/components/ProgressControls";
import { defaultBrowserGroupState } from "../../src/narrative/browser";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../../src/narrative/progress";

// Fixture chapters only: twelve chapters in one book, plus a fixture-only
// second book for the tab tests. Real data has only Book 1. Titles are the
// bare local number, the untitled form (BOB-20261116-35B47D).
const chapter = (id: string): NarrativeChapterSummary => ({
  chapter: id,
  title: id.split(".")[1]!,
  date: "2000",
  bookTitle: `Fixture book ${id.split(".")[0]}`,
});
const bookOne = Array.from({ length: 12 }, (_, index) =>
  chapter(`1.${index + 1}`),
);
const twoBooks = [...bookOne, chapter("2.1"), chapter("2.2")];

const progressAt = (furthest: string | null): ReaderProgress => ({
  furthestChapterRead: furthest,
  viewChapter: furthest,
  displayDate: null,
  mode: "chapter",
  timelineZoom: 1,
  timelinePan: 0,
  browserGroups: defaultBrowserGroupState(),
  characterInspectorSections: {
    overview: true,
    lineage: false,
    travelHistory: false,
  },
});

function renderChip({
  furthest = "1.7",
  chapters = bookOne,
  onReadThroughChoice = vi.fn(),
  onPickerOpenChange = vi.fn(),
}: {
  furthest?: string | null;
  chapters?: NarrativeChapterSummary[];
  onReadThroughChoice?: (chapter: string) => void;
  onPickerOpenChange?: (open: boolean) => void;
} = {}) {
  render(
    <TopbarReadThrough
      chapters={chapters}
      progress={progressAt(furthest)}
      pendingReadThrough={null}
      ownsConfirmation={false}
      onReadThroughChoice={onReadThroughChoice}
      onConfirmReadThrough={vi.fn()}
      onCancelReadThrough={vi.fn()}
      onPickerOpenChange={onPickerOpenChange}
    />,
  );
  return { onReadThroughChoice, onPickerOpenChange };
}

const chip = () => document.getElementById("topbar-read-through")!;
const picker = () => screen.getByRole("dialog", { name: "Read through" });

describe("compact chapter selector (Variant A)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("labels the closed pill compactly with a verbose accessible name", () => {
    renderChip({ furthest: "1.7" });
    const button = screen.getByRole("button", {
      name: "Read through, Book 1 Chapter 7",
    });
    expect(button).toBe(chip());
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.textContent?.replace(/\s+/g, " ").trim()).toBe("1 · Ch 7");
    expect(button.querySelector("svg.book-glyph")).not.toBeNull();
    expect(button.querySelector("svg.chevron-icon")).not.toBeNull();
    expect(button.textContent).not.toMatch(/#|Ch 0/);
  });

  it("labels the pre-book zero state without a chapter zero", () => {
    renderChip({ furthest: null });
    const button = screen.getByRole("button", {
      name: "Read through, Pre-book zero state",
    });
    expect(button.textContent?.trim()).toBe("Pre-book");
  });

  it("opens a labelled modal picker on the current chapter and closes on Close", async () => {
    const user = userEvent.setup();
    const { onPickerOpenChange } = renderChip({ furthest: "1.7" });
    await user.click(chip());
    expect(chip()).toHaveAttribute("aria-expanded", "true");
    expect(onPickerOpenChange).toHaveBeenLastCalledWith(true);
    const dialog = picker();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog).getByRole("heading", { name: "Read through" }),
    ).toHaveAttribute("id", dialog.getAttribute("aria-labelledby"));
    const current = within(dialog).getByRole("radio", {
      name: "Book 1 · Chapter 7",
    });
    expect(current).toHaveAttribute("aria-checked", "true");
    expect(current).toHaveFocus();
    expect(
      within(dialog)
        .getAllByRole("radio")
        .filter((radio) => radio.getAttribute("aria-checked") === "true"),
    ).toHaveLength(1);

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(
      screen.queryByRole("dialog", { name: "Read through" }),
    ).not.toBeInTheDocument();
    expect(chip()).toHaveAttribute("aria-expanded", "false");
    expect(onPickerOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(chip()).toHaveFocus());
  });

  it("closes on Escape and on a backdrop click and returns focus to the chip", async () => {
    const user = userEvent.setup();
    const { onReadThroughChoice } = renderChip();
    await user.click(chip());
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Read through" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(chip()).toHaveFocus());

    await user.click(chip());
    await user.click(screen.getByTestId("chapter-picker-backdrop"));
    expect(
      screen.queryByRole("dialog", { name: "Read through" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(chip()).toHaveFocus());
    expect(onReadThroughChoice).not.toHaveBeenCalled();
  });

  it("exposes Pre-book and the chapters as one radio group with a book tablist", async () => {
    const user = userEvent.setup();
    renderChip({ furthest: null });
    await user.click(chip());
    const dialog = picker();
    const group = within(dialog).getByRole("radiogroup", {
      name: "Read through",
    });
    const prebook = within(group).getByRole("radio", {
      name: "Pre-book zero state",
    });
    expect(prebook).toHaveAttribute("aria-checked", "true");
    expect(prebook).toHaveFocus();
    expect(within(group).getAllByRole("radio")).toHaveLength(13);
    const tablist = within(group).getByRole("tablist", { name: "Books" });
    const [tab] = within(tablist).getAllByRole("tab");
    expect(tab).toHaveAccessibleName("Book 1, 12 chapters");
    expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = within(dialog).getByRole("tabpanel", { name: /Book 1/ });
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(within(panel).getAllByRole("radio")).toHaveLength(12);
    expect(
      within(panel)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(Array.from({ length: 12 }, (_, index) => `${index + 1}`));
  });

  it("moves through the 5-column grid with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    renderChip({ furthest: "1.7" });
    await user.click(chip());
    const focused = () => document.activeElement?.getAttribute("aria-label");
    await user.keyboard("{ArrowRight}");
    expect(focused()).toBe("Book 1 · Chapter 8");
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(focused()).toBe("Book 1 · Chapter 12");
    // No chapter 17: Down stays put on the last row.
    await user.keyboard("{ArrowDown}");
    expect(focused()).toBe("Book 1 · Chapter 12");
    await user.keyboard("{ArrowLeft}{ArrowUp}");
    expect(focused()).toBe("Book 1 · Chapter 6");
    await user.keyboard("{ArrowUp}");
    expect(focused()).toBe("Book 1 · Chapter 1");
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toHaveAccessibleName("Pre-book zero state");
    await user.keyboard("{ArrowDown}");
    expect(focused()).toBe("Book 1 · Chapter 1");
    await user.keyboard("{End}");
    expect(focused()).toBe("Book 1 · Chapter 12");
    await user.keyboard("{Home}");
    expect(focused()).toBe("Book 1 · Chapter 1");
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toHaveAccessibleName("Pre-book zero state");
    // Roving tabindex: only the focused radio is in the tab order.
    expect(
      picker().querySelectorAll('[role="radio"][tabindex="0"]'),
    ).toHaveLength(1);
  });

  it("keeps Tab and Shift+Tab inside the picker", async () => {
    const user = userEvent.setup();
    renderChip({ furthest: "1.7" });
    await user.click(chip());
    const close = within(picker()).getByRole("button", { name: "Close" });
    // Close → Book 1 tab → current chapter, then wrap.
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toHaveAttribute("role", "tab");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(close).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toHaveAccessibleName("Book 1 · Chapter 7");
    await user.keyboard("{Tab}");
    expect(close).toHaveFocus();
  });

  it("reports a different chapter chosen with Enter and closes the picker", async () => {
    const user = userEvent.setup();
    const { onReadThroughChoice } = renderChip({ furthest: "1.7" });
    await user.click(chip());
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
    expect(onReadThroughChoice).toHaveBeenCalledExactlyOnceWith("1.9");
    expect(
      screen.queryByRole("dialog", { name: "Read through" }),
    ).not.toBeInTheDocument();
  });

  it("reports Pre-book chosen with Space or a click", async () => {
    const user = userEvent.setup();
    const { onReadThroughChoice } = renderChip({ furthest: "1.7" });
    await user.click(chip());
    await user.click(
      within(picker()).getByRole("radio", { name: "Pre-book zero state" }),
    );
    expect(onReadThroughChoice).toHaveBeenLastCalledWith("");

    await user.click(chip());
    await user.keyboard("{Home}{ArrowLeft} ");
    expect(onReadThroughChoice).toHaveBeenCalledTimes(2);
    expect(onReadThroughChoice).toHaveBeenLastCalledWith("");
  });

  it("closes without a change when the current chapter is chosen again", async () => {
    const user = userEvent.setup();
    const { onReadThroughChoice } = renderChip({ furthest: "1.7" });
    await user.click(chip());
    await user.click(
      within(picker()).getByRole("radio", { name: "Book 1 · Chapter 7" }),
    );
    expect(onReadThroughChoice).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Read through" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(chip()).toHaveFocus());
  });

  it("switches books with the tabs and keeps the selection pattern", async () => {
    const user = userEvent.setup();
    const { onReadThroughChoice } = renderChip({
      furthest: "1.7",
      chapters: twoBooks,
    });
    await user.click(chip());
    const dialog = picker();
    const tabs = within(dialog).getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Book 1, 12 chapters",
      "Book 2, 2 chapters",
    ]);
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    await user.click(tabs[1]!);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    const panel = within(dialog).getByRole("tabpanel");
    expect(panel).toHaveAccessibleName(/Book 2/);
    expect(
      within(panel)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("aria-label")),
    ).toEqual(["Book 2 · Chapter 1", "Book 2 · Chapter 2"]);
    expect(
      within(panel)
        .getAllByRole("radio")
        .some((radio) => radio.getAttribute("aria-checked") === "true"),
    ).toBe(false);

    await user.keyboard("{ArrowLeft}");
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{End}");
    expect(tabs[1]).toHaveFocus();
    await user.click(
      within(dialog).getByRole("radio", { name: "Book 2 · Chapter 2" }),
    );
    expect(onReadThroughChoice).toHaveBeenCalledExactlyOnceWith("2.2");
  });
});

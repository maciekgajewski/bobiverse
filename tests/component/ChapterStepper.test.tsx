import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterStepper } from "../../src/components/ChapterStepper";
import type { NarrativeChapterSummary } from "../../src/narrative/progress";

const chapters: NarrativeChapterSummary[] = [
  { chapter: "1.1", title: "1", date: "2016", bookTitle: "Fixture" },
  { chapter: "1.2", title: "2", date: "2133-06-24", bookTitle: "Fixture" },
  { chapter: "1.3", title: "3", date: "2133-06-25", bookTitle: "Fixture" },
];

describe("chapter eyebrow stepper", () => {
  afterEach(cleanup);

  it("calls onChapterSelect with the previous and next chapters", async () => {
    const user = userEvent.setup();
    const onChapterSelect = vi.fn();
    render(
      <ChapterStepper
        chapter="1.2"
        chapters={chapters}
        readThroughChapter="1.3"
        onChapterSelect={onChapterSelect}
      />,
    );
    expect(screen.getByText("1.2")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Previous chapter, Chapter 1.1" }),
    );
    expect(onChapterSelect).toHaveBeenCalledWith("1.1");
    await user.click(
      screen.getByRole("button", { name: "Next chapter, Chapter 1.3" }),
    );
    expect(onChapterSelect).toHaveBeenCalledWith("1.3");
    expect(onChapterSelect).toHaveBeenCalledTimes(2);
  });

  it("disables previous at chapter 1.1 and exposes the first-chapter state", async () => {
    const user = userEvent.setup();
    const onChapterSelect = vi.fn();
    render(
      <ChapterStepper
        chapter="1.1"
        chapters={chapters}
        readThroughChapter="1.3"
        onChapterSelect={onChapterSelect}
      />,
    );
    const previous = screen.getByRole("button", {
      name: "Previous chapter, unavailable, first chapter",
    });
    expect(previous).toBeDisabled();
    expect(previous).toHaveAttribute("title", "First chapter");
    await user.click(previous);
    expect(onChapterSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Next chapter, Chapter 1.2" }),
    ).toBeEnabled();
    expect(document.querySelector(".chapter-seq-dot")).not.toBeInTheDocument();
  });

  it("disables next at Read through, shows the gold dot, and never raises the ceiling", async () => {
    const user = userEvent.setup();
    const onChapterSelect = vi.fn();
    render(
      <ChapterStepper
        chapter="1.3"
        chapters={chapters}
        readThroughChapter="1.3"
        onChapterSelect={onChapterSelect}
      />,
    );
    const next = screen.getByRole("button", {
      name: "Next chapter, unavailable, last chapter",
    });
    expect(next).toBeDisabled();
    expect(next).toHaveAttribute("title", "Last chapter");
    expect(document.querySelector(".chapter-seq-dot")).toBeInTheDocument();
    await user.click(next);
    expect(onChapterSelect).not.toHaveBeenCalled();
  });

  it("disables next at a mid-catalogue Read through without calling onChapterSelect", async () => {
    const user = userEvent.setup();
    const onChapterSelect = vi.fn();
    render(
      <ChapterStepper
        chapter="1.2"
        chapters={chapters}
        readThroughChapter="1.2"
        onChapterSelect={onChapterSelect}
      />,
    );
    const next = screen.getByRole("button", {
      name: "Next chapter, unavailable, at your read-through chapter",
    });
    expect(next).toBeDisabled();
    expect(next).toHaveAttribute(
      "title",
      "Already at your read-through chapter. Use Read through to reveal later chapters.",
    );
    expect(document.querySelector(".chapter-seq-dot")).toBeInTheDocument();
    await user.click(next);
    expect(onChapterSelect).not.toHaveBeenCalled();
  });

  it("moves with [ and ] while the stepper is showing", () => {
    const onChapterSelect = vi.fn();
    render(
      <ChapterStepper
        chapter="1.2"
        chapters={chapters}
        readThroughChapter="1.3"
        onChapterSelect={onChapterSelect}
      />,
    );
    fireEvent.keyDown(document, { key: "[" });
    expect(onChapterSelect).toHaveBeenCalledWith("1.1");
    fireEvent.keyDown(document, { key: "]" });
    expect(onChapterSelect).toHaveBeenCalledWith("1.3");
    expect(onChapterSelect).toHaveBeenCalledTimes(2);
  });

  it("ignores [ and ] while focus is in a text field", async () => {
    const user = userEvent.setup();
    const onChapterSelect = vi.fn();
    render(
      <>
        <label>
          Notes
          <input aria-label="Notes" />
        </label>
        <ChapterStepper
          chapter="1.2"
          chapters={chapters}
          readThroughChapter="1.3"
          onChapterSelect={onChapterSelect}
        />
      </>,
    );
    await user.click(screen.getByRole("textbox", { name: "Notes" }));
    fireEvent.keyDown(document, { key: "[" });
    fireEvent.keyDown(document, { key: "]" });
    expect(onChapterSelect).not.toHaveBeenCalled();
  });

  it("ignores [ and ] when the destination is disabled", () => {
    const onChapterSelect = vi.fn();
    render(
      <ChapterStepper
        chapter="1.1"
        chapters={chapters}
        readThroughChapter="1.1"
        onChapterSelect={onChapterSelect}
      />,
    );
    fireEvent.keyDown(document, { key: "[" });
    fireEvent.keyDown(document, { key: "]" });
    expect(onChapterSelect).not.toHaveBeenCalled();
  });
});

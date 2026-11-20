import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterStepper } from "../../src/components/ChapterStepper";
import { ChapterLink } from "../../src/components/ObjectInspector";
import {
  KnowledgeThroughSelect,
  TopbarReadThrough,
} from "../../src/components/ProgressControls";
import { TimelineDock } from "../../src/components/TimelineDock";
import bookCatalogue from "../../data/narrative/books.json";
import { defaultBrowserGroupState } from "../../src/narrative/browser";
import type {
  NarrativeChapterSummary,
  ReaderProgress,
} from "../../src/narrative/progress";

// Chapter titles in the UI (BOB-20261116-35B47D). Fixture chapters and
// obviously fake chapter titles only; book titles come from the real
// books.json catalogue (book 2 landed with BOB-20261116-6D7ER3).
const bookTitles: Record<string, { title: string }> = bookCatalogue.books;
const summary = (
  chapter: string,
  title: string,
  date: string,
): NarrativeChapterSummary => ({
  chapter,
  title,
  date,
  bookTitle: bookTitles[chapter.split(".")[0]].title,
});
const LONG_TITLE =
  "Fixture Title Alpha With An Extremely Long Name That Never Fits On A Phone";
const chapters: NarrativeChapterSummary[] = [
  summary("1.60", "60", "2200.0"),
  summary("1.61", "61", "2200.1"),
  summary("2.1", `1 - ${LONG_TITLE}`, "2201.0"),
  summary("2.2", "2 - Fixture Title Beta", "2201.1"),
  summary("2.9", "9", "2201.2"),
  summary("2.10", "10 - Fixture Title Future", "2201.3"),
];
const FUTURE = "Fixture Title Future";

const progressAt = (
  furthest: string | null,
  view: string | null = furthest,
): ReaderProgress => ({
  furthestChapterRead: furthest,
  viewChapter: view,
  displayDate: view ? "2201.0" : null,
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

/** The future title is absent from text, attributes and accessible names. */
function expectNoFutureTitle() {
  expect(document.body.innerHTML).not.toContain(FUTURE);
  expect(document.body.textContent).not.toContain(FUTURE);
  for (const element of document.body.querySelectorAll("*"))
    for (const attribute of element.getAttributeNames())
      expect(element.getAttribute(attribute) ?? "").not.toContain(FUTURE);
}

function renderDock(progress: ReaderProgress) {
  return render(
    <TimelineDock
      chapters={chapters}
      progress={progress}
      meaningfulDates={["2201.0"]}
      meaningfulDateSources={new Map()}
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
}

describe("chapter titles", () => {
  afterEach(cleanup);

  it("groups the timeline by book in numeric order and titles only read chapters", () => {
    renderDock(progressAt("2.2"));
    const track = screen.getByRole("list", {
      name: "Reading-order chapter timeline",
    });
    expect(
      [...track.querySelectorAll(".chapter-book-divider")].map(
        (divider) => divider.textContent,
      ),
    ).toEqual(["Book 1", "Book 2"]);
    expect(
      [...track.querySelectorAll("[data-chapter]")].map((button) =>
        button.getAttribute("data-chapter"),
      ),
    ).toEqual(["1.60", "1.61", "2.1", "2.2", "2.9", "2.10"]);
    const alpha = track.querySelector('[data-chapter="2.1"] .chapter-above')!;
    expect(alpha).toHaveClass("titled");
    expect(alpha).toHaveAttribute("title", `2.1 — ${LONG_TITLE}`);
    // Book 2 entries carry the full reference (locked ones already did);
    // the divider names the book.
    expect(
      track.querySelector('[data-chapter="2.9"] .chapter-above')!.textContent,
    ).toBe("Chapter 2.9");
    expect(
      screen.getByRole("button", { name: "Book 2, 2.2 — Fixture Title Beta" }),
    ).toBeEnabled();
    expect(
      [...track.querySelectorAll(".chapter-book-divider")].map((divider) =>
        divider.getAttribute("title"),
      ),
    ).toEqual([bookTitles["1"].title, "For We Are Many"]);
    // Untitled and book 1 entries keep their exact number-only form.
    const sixty = track.querySelector('[data-chapter="1.60"] .chapter-above')!;
    expect(sixty.outerHTML).toBe('<span class="chapter-above">60</span>');
    expect(
      screen.getByRole("button", { name: "Book 2, Chapter 10, locked" }),
    ).toBeDisabled();
    expectNoFutureTitle();
  });

  it("titles As of and Read through options only up to Read through", () => {
    renderDock(progressAt("2.2"));
    const knowledge = screen.getByLabelText("As of");
    const beta = within(knowledge).getByRole("option", {
      name: "Chapter 2.2 · Fixture Title Beta",
    });
    expect(beta).toHaveAttribute("title", "Chapter 2.2 · Fixture Title Beta");
    const alpha = within(knowledge).getByRole("option", {
      name: /^Chapter 2\.1 · Fixture Title Alpha/,
    });
    expect(alpha.textContent!.endsWith("…")).toBe(true);
    expect(alpha).toHaveAttribute("title", `Chapter 2.1 · ${LONG_TITLE}`);
    expect(
      within(knowledge).getByRole("option", { name: "Chapter 1.61" }),
    ).not.toHaveAttribute("title");
    const readThrough = screen.getByLabelText("Read through");
    expect(
      within(readThrough).getByRole("option", {
        name: "Book 2 · Chapter 2 · Fixture Title Beta",
      }),
    ).toBeInTheDocument();
    const future = within(readThrough).getByRole("option", {
      name: "Book 2 · Chapter 10",
    });
    expect(future).not.toHaveAttribute("title");
    expectNoFutureTitle();
  });

  it("names titles in the stepper's previous and next controls, never past Read through", async () => {
    const onChapterSelect = vi.fn();
    const { rerender } = render(
      <ChapterStepper
        chapter="1.61"
        chapters={chapters}
        readThroughChapter="2.2"
        onChapterSelect={onChapterSelect}
      />,
    );
    const next = screen.getByRole("button", {
      name: `Next chapter, Chapter 2.1 · ${LONG_TITLE}`,
    });
    expect(next).toHaveAttribute("title", `Next chapter, 2.1 · ${LONG_TITLE}`);
    await userEvent.setup().click(next);
    expect(onChapterSelect).toHaveBeenCalledWith("2.1");
    expect(screen.getByText("1.61")).toBeInTheDocument();

    rerender(
      <ChapterStepper
        chapter="2.2"
        chapters={chapters}
        readThroughChapter="2.2"
        onChapterSelect={onChapterSelect}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: `Previous chapter, Chapter 2.1 · ${LONG_TITLE}`,
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: "Next chapter, unavailable, at your read-through chapter",
      }),
    ).toBeDisabled();
    expectNoFutureTitle();

    // 2.9 is untitled; 2.10 is past Read through 2.9 and stays unnamed.
    rerender(
      <ChapterStepper
        chapter="2.9"
        chapters={chapters}
        readThroughChapter="2.9"
        onChapterSelect={onChapterSelect}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Previous chapter, Chapter 2.2 · Fixture Title Beta",
      }),
    ).toBeEnabled();
    expectNoFutureTitle();
  });

  it("titles picker cells only up to the confirmed Read through", async () => {
    render(
      <TopbarReadThrough
        chapters={chapters}
        progress={progressAt("2.2")}
        pendingReadThrough={null}
        ownsConfirmation={false}
        onReadThroughChoice={vi.fn()}
        onConfirmReadThrough={vi.fn()}
        onCancelReadThrough={vi.fn()}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /^Read through/ }));
    const picker = screen.getByRole("dialog", { name: "Read through" });
    const beta = within(picker).getByRole("radio", {
      name: "Book 2 · Chapter 2",
    });
    expect(beta).toHaveAttribute("title", "Fixture Title Beta");
    expect(beta).toHaveAccessibleDescription("Fixture Title Beta");
    expect(beta).toHaveTextContent(/^2$/);
    expect(
      within(picker).getByRole("radio", { name: "Book 2 · Chapter 10" }),
    ).not.toHaveAttribute("title");
    expectNoFutureTitle();
  });

  it("adds a single-line title to read chapter links and nothing to later ones", () => {
    render(
      <>
        <p data-testid="read">
          <ChapterLink
            chapter="2.1"
            readThroughChapter="2.2"
            onChapterSelect={vi.fn()}
            chapters={chapters}
          />
        </p>
        <p data-testid="future">
          <ChapterLink
            chapter="2.10"
            readThroughChapter="2.2"
            onChapterSelect={vi.fn()}
            chapters={chapters}
          />
        </p>
        <p data-testid="untitled">
          <ChapterLink
            chapter="2.9"
            readThroughChapter="2.10"
            onChapterSelect={vi.fn()}
            chapters={chapters}
          />
        </p>
      </>,
    );
    const link = within(screen.getByTestId("read")).getByRole("button", {
      name: `Chapter 2.1 · ${LONG_TITLE}`,
    });
    expect(link).toHaveAttribute("title", `Chapter 2.1 · ${LONG_TITLE}`);
    expect(link.querySelector(".chapter-link-title")!.textContent).toBe(
      ` · ${LONG_TITLE}`,
    );
    expect(screen.getByTestId("future").innerHTML).toBe("Chapter 2.10");
    expect(screen.getByTestId("untitled").innerHTML).toBe(
      '<button type="button" class="link-button inline-entity-link chapter-link">Chapter 2.9</button>',
    );
    expectNoFutureTitle();
  });

  it("keeps chapter links number-only without chapter summaries", () => {
    render(
      <p data-testid="bare">
        <ChapterLink
          chapter="2.1"
          readThroughChapter="2.2"
          onChapterSelect={vi.fn()}
        />
      </p>,
    );
    expect(screen.getByTestId("bare").innerHTML).toBe(
      '<button type="button" class="link-button inline-entity-link chapter-link">Chapter 2.1</button>',
    );
  });

  it("shows no title anywhere in the pre-book zero state", () => {
    renderDock(progressAt(null));
    render(
      <KnowledgeThroughSelect
        id="zero-knowledge"
        chapters={chapters}
        progress={progressAt(null)}
        onKnowledgeChapter={vi.fn()}
        onReturnToZeroState={vi.fn()}
      />,
    );
    expect(document.body.textContent).not.toContain("Fixture Title");
    expect(document.body.innerHTML).not.toContain("Fixture Title");
  });
});

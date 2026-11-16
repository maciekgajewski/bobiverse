import { describe, expect, it } from "vitest";
import { compareNarrativeChapters } from "../../src/narrative/model";
import {
  adjacentKnowledgeChapters,
  chapterDisplayTitle,
  chapterReferenceLabel,
  chapterTimelineLabel,
  confirmReadThrough,
  emptyReaderProgress,
  normalizeReaderProgress,
  selectKnowledgeChapter,
  truncateChapterTitle,
  visibleChapterTitle,
  type NarrativeChapterSummary,
} from "../../src/narrative/progress";

// Chapter titles and book 2 ordering (BOB-20261116-35B47D). Fixture chapters
// and obviously fake titles only; real data has no book 2 yet.
const summary = (
  chapter: string,
  title: string,
  date = "2200",
): NarrativeChapterSummary => ({
  chapter,
  title,
  date,
  bookTitle: `Fixture book ${chapter.split(".")[0]}`,
});

const fixtureChapters: NarrativeChapterSummary[] = [
  summary("1.60", "60", "2200.0"),
  summary("1.61", "61", "2200.1"),
  summary("2.1", "1 - Fixture Title Alpha", "2201.0"),
  summary("2.2", "2 - Fixture Title Beta", "2201.1"),
  summary("2.9", "9", "2201.2"),
  summary("2.10", "10 - Fixture Title Future", "2201.3"),
];
// Deliberately scrambled, including the string-sort trap 2.10 < 2.9.
const scrambled = [
  fixtureChapters[5]!,
  fixtureChapters[2]!,
  fixtureChapters[4]!,
  fixtureChapters[0]!,
  fixtureChapters[3]!,
  fixtureChapters[1]!,
];

describe("chapterDisplayTitle", () => {
  it("strips the leading '<number> - ' prefix", () => {
    expect(chapterDisplayTitle(summary("2.1", "1 - Fixture Title Alpha"))).toBe(
      "Fixture Title Alpha",
    );
    expect(
      chapterDisplayTitle(summary("2.10", "10 - Fixture Title Future")),
    ).toBe("Fixture Title Future");
    for (const separator of ["-", "–", "—", ":"])
      expect(
        chapterDisplayTitle(summary("2.3", ` 3 ${separator} Fixture Gamma `)),
      ).toBe("Fixture Gamma");
  });

  it("treats a bare number, or the chapter number alone, as untitled", () => {
    expect(chapterDisplayTitle(summary("2.5", "5"))).toBeNull();
    expect(chapterDisplayTitle(summary("2.5", " 5 "))).toBeNull();
    expect(chapterDisplayTitle(summary("1.18", "18"))).toBeNull();
  });

  it("shows book 1's two source titles", () => {
    expect(chapterDisplayTitle(summary("1.1", "1 - Bob Version 1.0"))).toBe(
      "Bob Version 1.0",
    );
    expect(chapterDisplayTitle(summary("1.2", "2 - Bob Version 2.0"))).toBe(
      "Bob Version 2.0",
    );
  });

  it("keeps other text as is, including a prefix for a different number", () => {
    expect(chapterDisplayTitle(summary("2.4", "Fixture Plain Title"))).toBe(
      "Fixture Plain Title",
    );
    expect(chapterDisplayTitle(summary("2.4", "3 - Fixture Delta"))).toBe(
      "3 - Fixture Delta",
    );
    expect(chapterDisplayTitle(summary("2.1", "10 - Fixture Delta"))).toBe(
      "10 - Fixture Delta",
    );
  });

  it("keeps book 1 timeline labels and qualifies later books", () => {
    expect(chapterTimelineLabel(summary("1.1", "1 - Bob Version 1.0"))).toBe(
      "1 - Bob Version 1.0",
    );
    expect(chapterTimelineLabel(summary("1.18", "18"))).toBe("18");
    expect(
      chapterTimelineLabel(summary("2.1", "1 - Fixture Title Alpha")),
    ).toBe("2.1 — Fixture Title Alpha");
    expect(chapterTimelineLabel(summary("2.5", "5"))).toBe("2.5");
  });
});

describe("visibleChapterTitle (spoiler gate)", () => {
  it("returns a title only at or before Read through", () => {
    expect(visibleChapterTitle(fixtureChapters, "2.1", "2.2")).toBe(
      "Fixture Title Alpha",
    );
    expect(visibleChapterTitle(fixtureChapters, "2.2", "2.2")).toBe(
      "Fixture Title Beta",
    );
    expect(visibleChapterTitle(fixtureChapters, "2.10", "2.2")).toBeNull();
    expect(visibleChapterTitle(fixtureChapters, "2.10", "2.9")).toBeNull();
    expect(visibleChapterTitle(fixtureChapters, "2.10", "2.10")).toBe(
      "Fixture Title Future",
    );
  });

  it("returns no title in the pre-book zero state or for unknown chapters", () => {
    expect(visibleChapterTitle(fixtureChapters, "2.1", null)).toBeNull();
    expect(visibleChapterTitle(fixtureChapters, "2.3", "2.10")).toBeNull();
  });

  it("formats references and truncates long titles", () => {
    expect(chapterReferenceLabel("2.1", "Fixture Title Alpha")).toBe(
      "Chapter 2.1 · Fixture Title Alpha",
    );
    expect(chapterReferenceLabel("1.18", null)).toBe("Chapter 1.18");
    expect(truncateChapterTitle("Fixture Title Alpha")).toBe(
      "Fixture Title Alpha",
    );
    const long = "Fixture Title Alpha ".repeat(6).trim();
    const shortened = truncateChapterTitle(long, 40);
    expect(Array.from(shortened)).toHaveLength(40);
    expect(shortened.endsWith("…")).toBe(true);
    expect(long.startsWith(shortened.slice(0, -1))).toBe(true);
  });
});

describe("book 2 chapter ordering", () => {
  it("sorts numerically across books, never as strings", () => {
    expect(
      scrambled.map(({ chapter }) => chapter).sort(compareNarrativeChapters),
    ).toEqual(["1.60", "1.61", "2.1", "2.2", "2.9", "2.10"]);
    expect(compareNarrativeChapters("2.10", "2.9")).toBeGreaterThan(0);
    expect(compareNarrativeChapters("2.1", "1.61")).toBeGreaterThan(0);
  });

  it("steps from 1.61 into book 2 and through 2.9 to 2.10", () => {
    expect(adjacentKnowledgeChapters("1.61", "2.10", scrambled)).toMatchObject({
      prev: "1.60",
      next: "2.1",
    });
    expect(adjacentKnowledgeChapters("2.1", "2.10", scrambled)).toMatchObject({
      prev: "1.61",
      next: "2.2",
    });
    expect(adjacentKnowledgeChapters("2.9", "2.10", scrambled)).toMatchObject({
      prev: "2.2",
      next: "2.10",
    });
    expect(adjacentKnowledgeChapters("2.10", "2.10", scrambled)).toEqual({
      prev: "2.9",
      next: null,
      atReadThrough: true,
      atLastChapter: true,
    });
  });

  it("never steps past Read through, including across the book boundary", () => {
    expect(adjacentKnowledgeChapters("1.61", "1.61", scrambled)).toEqual({
      prev: "1.60",
      next: null,
      atReadThrough: true,
      atLastChapter: false,
    });
    expect(adjacentKnowledgeChapters("2.9", "2.9", scrambled)).toMatchObject({
      next: null,
      atReadThrough: true,
    });
  });

  it("clamps Knowledge through to Read through with numeric order", () => {
    const restored = normalizeReaderProgress(
      {
        furthestChapterRead: "2.9",
        viewChapter: "2.10",
        displayDate: "2201.3",
        mode: "chapter",
      },
      scrambled,
      [],
    );
    expect(restored.furthestChapterRead).toBe("2.9");
    expect(restored.viewChapter).toBe("2.9");
    const atNine = confirmReadThrough(
      emptyReaderProgress(),
      "2.9",
      fixtureChapters,
    );
    expect(selectKnowledgeChapter(atNine, "2.10", fixtureChapters)).toBe(
      atNine,
    );
    expect(
      selectKnowledgeChapter(atNine, "1.61", fixtureChapters).viewChapter,
    ).toBe("1.61");
    expect(
      selectKnowledgeChapter(atNine, "2.2", fixtureChapters).viewChapter,
    ).toBe("2.2");
  });
});

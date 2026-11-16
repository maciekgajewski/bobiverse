import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  meaningfulNarrativeDateOptions,
  meaningfulNarrativeDates,
  prepareNarrativeCorpus,
} from "../../src/narrative/model";
import {
  confirmReadThrough,
  loadReaderProgress,
  normalizeReaderProgress,
  forgetReaderProgress,
  persistReaderProgress,
  adjacentKnowledgeChapters,
  selectKnowledgeChapter,
  selectZeroKnowledgeView,
  setTimelineViewport,
  type NarrativeChapterSummary,
  type ReaderProgress,
} from "../../src/narrative/progress";
import { defaultBrowserGroupState } from "../../src/narrative/browser";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

const chapters: NarrativeChapterSummary[] = [
  { chapter: "1.1", title: "One", date: "2200.0", bookTitle: "Fixture" },
  { chapter: "1.2", title: "Two", date: "2200.2", bookTitle: "Fixture" },
  { chapter: "1.3", title: "Three", date: "2200.1", bookTitle: "Fixture" },
];

const empty: ReaderProgress = {
  furthestChapterRead: null,
  viewChapter: null,
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
};

describe("reader progress", () => {
  it("initializes the first confirmed ceiling atomically and never lets navigation advance it", () => {
    const first = confirmReadThrough(empty, "1.2", chapters);
    expect(first).toMatchObject({
      furthestChapterRead: "1.2",
      viewChapter: "1.2",
      displayDate: "2200.2",
      mode: "chapter",
    });
    expect(selectKnowledgeChapter(first, "1.3", chapters)).toEqual(first);
  });

  it("clamps restored and lowered state without retaining a later knowledge chapter", () => {
    const lowered = confirmReadThrough(
      {
        ...empty,
        furthestChapterRead: "1.3",
        viewChapter: "1.3",
        displayDate: "2200.1",
      },
      "1.1",
      chapters,
    );
    expect(lowered.viewChapter).toBe("1.1");
    expect(
      normalizeReaderProgress(
        {
          furthestChapterRead: "1.1",
          viewChapter: "1.3",
          mode: "date",
          displayDate: "not-a-date",
        },
        chapters,
        ["2200.0"],
      ),
    ).toMatchObject({ viewChapter: "1.1", displayDate: "2200.0" });
  });

  it("restores the versioned local state and safely resets corrupt values", () => {
    window.localStorage.clear();
    const saved: ReaderProgress = {
      furthestChapterRead: "1.3",
      viewChapter: "1.2",
      displayDate: "2200.1",
      mode: "date",
      timelineZoom: 3,
      timelinePan: 0.25,
      browserGroups: {
        ...defaultBrowserGroupState(),
        characters: false,
      },
      characterInspectorSections: {
        overview: false,
        lineage: true,
        travelHistory: true,
      },
    };
    persistReaderProgress(saved);
    expect(
      loadReaderProgress(chapters, ["2200.0", "2200.1", "2200.2"]),
    ).toEqual(saved);
    window.localStorage.setItem("bobiverse.app-state.v2", "{not json");
    expect(loadReaderProgress(chapters, [])).toEqual(empty);
  });

  it("restores a valid year-only v2 display date", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.1",
        viewChapter: "1.1",
        displayDate: "2200",
        mode: "date",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    expect(
      loadReaderProgress(
        [{ chapter: "1.1", title: "One", date: "2200", bookTitle: "Fixture" }],
        ["2200"],
      ),
    ).toMatchObject({
      furthestChapterRead: "1.1",
      viewChapter: "1.1",
      displayDate: "2200",
      mode: "date",
    });
  });

  it("removes only legacy v1 state and never migrates its decimal date", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.3",
        viewChapter: "1.3",
        displayDate: "2158.9",
        mode: "date",
      }),
    );
    window.localStorage.setItem("unrelated.preference", "preserve-me");

    expect(loadReaderProgress(chapters, ["2200"])).toEqual(empty);
    expect(window.localStorage.getItem("bobiverse.app-state.v1")).toBeNull();
    expect(window.localStorage.getItem("unrelated.preference")).toBe(
      "preserve-me",
    );
  });

  it("forgets every app-owned key by prefix and returns empty state", () => {
    window.localStorage.clear();
    persistReaderProgress({
      ...empty,
      furthestChapterRead: "1.3",
      viewChapter: "1.3",
      displayDate: "2158.0",
    });
    window.localStorage.setItem("unrelated.preference", "preserve-me");
    window.localStorage.setItem("bobiverse.app-state.v1", "legacy");
    window.localStorage.setItem("bobiverse.last-seen-version", "future");
    expect(forgetReaderProgress()).toEqual(empty);
    expect(window.localStorage.getItem("bobiverse.app-state.v2")).toBeNull();
    expect(window.localStorage.getItem("bobiverse.app-state.v1")).toBeNull();
    expect(
      window.localStorage.getItem("bobiverse.last-seen-version"),
    ).toBeNull();
    expect(window.localStorage.getItem("unrelated.preference")).toBe(
      "preserve-me",
    );
  });

  it("does not clear other app-owned keys when persisting empty progress", () => {
    window.localStorage.clear();
    window.localStorage.setItem("bobiverse.last-seen-version", "future");
    persistReaderProgress(empty);
    expect(window.localStorage.getItem("bobiverse.app-state.v2")).toBeNull();
    expect(window.localStorage.getItem("bobiverse.last-seen-version")).toBe(
      "future",
    );
  });

  it("does not leave a localStorage key when persisting empty progress", () => {
    window.localStorage.clear();
    persistReaderProgress(empty);
    expect(window.localStorage.getItem("bobiverse.app-state.v2")).toBeNull();
  });

  it("normalizes malformed character-inspector disclosure preferences", () => {
    expect(
      normalizeReaderProgress(
        {
          furthestChapterRead: "1.1",
          viewChapter: "1.1",
          characterInspectorSections: { overview: false, lineage: "yes" },
        },
        chapters,
        [],
      ).characterInspectorSections,
    ).toEqual({ overview: false, lineage: false, travelHistory: false });
  });

  it("keeps timeline panning within the normalized visible-content range", () => {
    expect(setTimelineViewport(empty, 20000, -1)).toMatchObject({
      timelineZoom: 16384,
      timelinePan: -1,
    });
    expect(setTimelineViewport(empty, 1, 2)).toMatchObject({
      timelineZoom: 1,
      timelinePan: 1,
    });
  });

  it("shows zero-state knowledge without lowering the confirmed reading ceiling", () => {
    const confirmed = confirmReadThrough(empty, "1.2", chapters);
    const zeroView = selectZeroKnowledgeView(confirmed);
    expect(zeroView).toMatchObject({
      furthestChapterRead: "1.2",
      viewChapter: null,
      displayDate: null,
      mode: "chapter",
    });
    expect(normalizeReaderProgress(zeroView, chapters, [])).toEqual(zeroView);
    // Confirming a read-through always shows that chapter (BOB-20261114-CTS3FN).
    expect(confirmReadThrough(zeroView, "1.1", chapters)).toMatchObject({
      furthestChapterRead: "1.1",
      viewChapter: "1.1",
      displayDate: "2200.0",
      mode: "chapter",
    });
  });

  describe("read-through drives the view (BOB-20261114-CTS3FN)", () => {
    const at = (
      furthestChapterRead: string,
      viewChapter: string | null,
      mode: "chapter" | "date" = "chapter",
      displayDate: string | null = viewChapter
        ? chapters.find((chapter) => chapter.chapter === viewChapter)!.date
        : null,
    ): ReaderProgress => ({
      ...empty,
      furthestChapterRead,
      viewChapter,
      displayDate,
      mode,
      timelineZoom: 4,
      timelinePan: 0.5,
    });
    const chapterView = (chapter: string, date: string) => ({
      furthestChapterRead: chapter,
      viewChapter: chapter,
      displayDate: date,
      mode: "chapter",
    });

    it("shows the first confirmed chapter", () => {
      expect(confirmReadThrough(empty, "1.3", chapters)).toMatchObject(
        chapterView("1.3", "2200.1"),
      );
    });

    it("moves the view forward with the ceiling, even from an earlier view", () => {
      expect(
        confirmReadThrough(at("1.2", "1.2"), "1.3", chapters),
      ).toMatchObject(chapterView("1.3", "2200.1"));
      expect(
        confirmReadThrough(at("1.2", "1.1"), "1.3", chapters),
      ).toMatchObject(chapterView("1.3", "2200.1"));
    });

    it("moves the view back with a lowered ceiling, even from an earlier view", () => {
      expect(
        confirmReadThrough(at("1.3", "1.3"), "1.2", chapters),
      ).toMatchObject(chapterView("1.2", "2200.2"));
      // A view earlier than the new ceiling still moves to the confirmed chapter.
      expect(
        confirmReadThrough(at("1.3", "1.1"), "1.2", chapters),
      ).toMatchObject(chapterView("1.2", "2200.2"));
    });

    it("re-shows an equal chapter after the reader looked back", () => {
      expect(
        confirmReadThrough(at("1.2", "1.1"), "1.2", chapters),
      ).toMatchObject(chapterView("1.2", "2200.2"));
    });

    it("leaves Date mode and the zero-state view for the confirmed chapter", () => {
      expect(
        confirmReadThrough(at("1.2", "1.2", "date", "2200.0"), "1.3", chapters),
      ).toMatchObject(chapterView("1.3", "2200.1"));
      expect(
        confirmReadThrough(at("1.3", "1.3", "date", "2200.2"), "1.1", chapters),
      ).toMatchObject(chapterView("1.1", "2200.0"));
      expect(
        confirmReadThrough(at("1.3", null), "1.2", chapters),
      ).toMatchObject(chapterView("1.2", "2200.2"));
    });

    it("keeps unrelated preferences and rejects an unknown chapter", () => {
      const current = at("1.1", "1.1");
      const next = confirmReadThrough(current, "1.3", chapters);
      expect(next.timelineZoom).toBe(4);
      expect(next.timelinePan).toBe(0.5);
      expect(next.browserGroups).toEqual(current.browserGroups);
      expect(next.characterInspectorSections).toEqual(
        current.characterInspectorSections,
      );
      expect(() => confirmReadThrough(current, "1.9", chapters)).toThrow(
        "Unknown chapter: 1.9.",
      );
    });

    it("keeps the confirmed ceiling as the only bound on navigation", () => {
      const lowered = confirmReadThrough(at("1.3", "1.3"), "1.1", chapters);
      expect(lowered.furthestChapterRead).toBe("1.1");
      expect(selectKnowledgeChapter(lowered, "1.2", chapters)).toBe(lowered);
      expect(selectKnowledgeChapter(lowered, "1.3", chapters)).toBe(lowered);
      const raised = confirmReadThrough(lowered, "1.2", chapters);
      const lookedBack = selectKnowledgeChapter(raised, "1.1", chapters);
      expect(lookedBack).toMatchObject({
        furthestChapterRead: "1.2",
        viewChapter: "1.1",
      });
      expect(selectKnowledgeChapter(lookedBack, "1.3", chapters)).toBe(
        lookedBack,
      );
      expect(selectZeroKnowledgeView(raised).furthestChapterRead).toBe("1.2");
      expect(
        normalizeReaderProgress({ ...raised, viewChapter: "1.3" }, chapters, [])
          .viewChapter,
      ).toBe("1.2");
    });
  });

  it("keeps later-revealed earlier state unavailable until its knowledge chapter", () => {
    const corpus = createNarrativeFixtureCorpus();
    expect(
      generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.1", "2200.0")
        .entities,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "character:fixture-alex",
          current_state: "initial state",
        }),
      ]),
    );
    expect(
      generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.3", "2200.1")
        .entities,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "character:fixture-alex",
          current_state: "middle state",
        }),
      ]),
    );
  });

  it("keeps every reader-visible suffix date meaningful", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[0]!.date = "2200";
    corpus.chapters[1]!.updates = undefined;
    corpus.chapters[2]!.updates = undefined;
    expect(
      meaningfulNarrativeDates(prepareNarrativeCorpus(corpus), "1.3"),
    ).toContain("2200.2");
    expect(() =>
      generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.3", "2200.2"),
    ).not.toThrow();
  });

  it("keeps an event's determinate date meaningful when its reveal chapter has a year-only date", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[0]!.date = "2200";
    corpus.chapters[0]!.introducing = [
      {
        id: "event:fixture-indexed-event",
        name: "Fixture indexed event",
        date: "2200.1",
      },
    ];
    corpus.chapters[0]!.appearances = undefined;
    corpus.chapters[1]!.appearances = undefined;
    corpus.chapters[2]!.appearances = undefined;
    corpus.chapters[1]!.updates = undefined;
    corpus.chapters[2]!.updates = undefined;
    expect(
      meaningfulNarrativeDates(prepareNarrativeCorpus(corpus), "1.3"),
    ).toContain("2200.1");
    expect(
      meaningfulNarrativeDateOptions(prepareNarrativeCorpus(corpus), "1.3"),
    ).toContainEqual({
      date: "2200.1",
      source_chapters: ["1.1", "1.3"],
    });
    expect(
      generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.3", "2200.1")
        .entities,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "event:fixture-indexed-event" }),
      ]),
    );
  });

  describe("adjacentKnowledgeChapters", () => {
    it("returns the previous and next catalogue chapters within Read through", () => {
      expect(adjacentKnowledgeChapters("1.2", "1.3", chapters)).toEqual({
        prev: "1.1",
        next: "1.3",
        atReadThrough: false,
        atLastChapter: false,
      });
    });

    it("disables previous at the first chapter and keeps it addressable", () => {
      expect(adjacentKnowledgeChapters("1.1", "1.3", chapters)).toEqual({
        prev: null,
        next: "1.2",
        atReadThrough: false,
        atLastChapter: false,
      });
    });

    it("disables next at the Read through ceiling without returning a later chapter", () => {
      expect(adjacentKnowledgeChapters("1.2", "1.2", chapters)).toEqual({
        prev: "1.1",
        next: null,
        atReadThrough: true,
        atLastChapter: false,
      });
      const current = {
        ...empty,
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2200.2",
      };
      const refused = selectKnowledgeChapter(current, "1.3", chapters);
      expect(refused).toBe(current);
      expect(refused.furthestChapterRead).toBe("1.2");
    });

    it("orders and clamps chapters numerically across a book boundary", () => {
      const acrossBooks: NarrativeChapterSummary[] = [
        "2.10",
        "1.61",
        "2.2",
        "2.1",
        "1.60",
        "2.9",
      ].map((chapter) => ({
        chapter,
        title: chapter,
        date: "2200",
        bookTitle: "Fixture",
      }));

      expect(adjacentKnowledgeChapters("1.61", "2.10", acrossBooks)).toEqual({
        prev: "1.60",
        next: "2.1",
        atReadThrough: false,
        atLastChapter: false,
      });
      expect(adjacentKnowledgeChapters("2.1", "2.10", acrossBooks)).toEqual({
        prev: "1.61",
        next: "2.2",
        atReadThrough: false,
        atLastChapter: false,
      });
      expect(
        adjacentKnowledgeChapters("2.9", "2.10", acrossBooks),
      ).toMatchObject({ prev: "2.2", next: "2.10" });
      expect(
        adjacentKnowledgeChapters("2.10", "2.10", acrossBooks),
      ).toMatchObject({ prev: "2.9", next: null, atLastChapter: true });
      // Read through 1.61 keeps the stepper and selector out of book 2.
      expect(
        adjacentKnowledgeChapters("1.61", "1.61", acrossBooks),
      ).toMatchObject({ next: null, atReadThrough: true });
      const atEndOfBookOne = {
        ...empty,
        furthestChapterRead: "1.61",
        viewChapter: "1.61",
        displayDate: "2200",
      };
      expect(selectKnowledgeChapter(atEndOfBookOne, "2.1", acrossBooks)).toBe(
        atEndOfBookOne,
      );
      // 2.10 sorts after 2.9, not between 2.1 and 2.2.
      const readToNine = { ...atEndOfBookOne, furthestChapterRead: "2.9" };
      expect(selectKnowledgeChapter(readToNine, "2.10", acrossBooks)).toBe(
        readToNine,
      );
      expect(
        selectKnowledgeChapter(
          { ...atEndOfBookOne, furthestChapterRead: "2.10" },
          "2.9",
          acrossBooks,
        ).viewChapter,
      ).toBe("2.9");
    });

    it("treats the last catalogue chapter as the end of the stepper", () => {
      expect(adjacentKnowledgeChapters("1.3", "1.3", chapters)).toEqual({
        prev: "1.2",
        next: null,
        atReadThrough: true,
        atLastChapter: true,
      });
    });
  });
});

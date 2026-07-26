import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  meaningfulNarrativeDates,
} from "../../src/narrative/model";
import {
  confirmReadThrough,
  loadReaderProgress,
  normalizeReaderProgress,
  persistReaderProgress,
  selectKnowledgeChapter,
  setTimelineViewport,
  type NarrativeChapterSummary,
  type ReaderProgress,
} from "../../src/narrative/progress";
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
    };
    persistReaderProgress(saved);
    expect(
      loadReaderProgress(chapters, ["2200.0", "2200.1", "2200.2"]),
    ).toEqual(saved);
    window.localStorage.setItem("bobiverse.app-state.v1", "{not json");
    expect(loadReaderProgress(chapters, [])).toEqual(empty);
  });

  it("keeps timeline panning within the normalized visible-content range", () => {
    expect(setTimelineViewport(empty, 30, -1)).toMatchObject({
      timelineZoom: 16,
      timelinePan: 0,
    });
    expect(setTimelineViewport(empty, 1, 2)).toMatchObject({
      timelineZoom: 1,
      timelinePan: 1,
    });
  });

  it("keeps later-revealed earlier state unavailable until its knowledge chapter", () => {
    const corpus = createNarrativeFixtureCorpus();
    expect(generateNarrativeWorld(corpus, "1.1", "2200.0").entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "character:fixture-alex",
          current_state: "initial state",
        }),
      ]),
    );
    expect(generateNarrativeWorld(corpus, "1.3", "2200.1").entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "character:fixture-alex",
          current_state: "middle state",
        }),
      ]),
    );
  });

  it("excludes dates that would compare a year-only state with an indexed state", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[0]!.date = "2200";
    corpus.chapters[1]!.updates = undefined;
    corpus.chapters[2]!.updates = undefined;
    expect(meaningfulNarrativeDates(corpus, "1.3")).not.toContain("2200.2");
    expect(() => generateNarrativeWorld(corpus, "1.3", "2200.2")).toThrow(
      "not meaningful and projection-safe",
    );
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
    expect(meaningfulNarrativeDates(corpus, "1.3")).toContain("2200.1");
    expect(generateNarrativeWorld(corpus, "1.3", "2200.1").entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "event:fixture-indexed-event" }),
      ]),
    );
  });
});

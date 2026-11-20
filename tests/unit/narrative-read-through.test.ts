import { describe, expect, it } from "vitest";
import {
  chapterSoftCeiling,
  generateNarrativeWorld,
  meaningfulNarrativeDateOptions,
  preparedNarrativeChapters,
  projectNarrativeChapterDetail,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

// Canonical data: Read through is the knowledge bound and the selected
// chapter only the soft ceiling (design principles §1, BOB-20261120-C3EY9W).
describe("canonical worlds viewed with everything read", () => {
  if (!narrativeCorpus)
    throw new Error("Canonical narrative preparation failed.");
  const corpus = narrativeCorpus;
  const chapters = preparedNarrativeChapters(corpus).map((chapter) =>
    String(chapter.chapter),
  );
  const readThrough = chapters.at(-1)!;

  it("resolves every chapter's detail and names only shown entities in activity", () => {
    for (const chapter of chapters) {
      const world = generateNarrativeWorld(corpus, {
        readThrough,
        softCeiling: chapterSoftCeiling(corpus, chapter),
        chapter,
      });
      expect(() =>
        projectNarrativeChapterDetail(corpus, chapter, world),
      ).not.toThrow();
      const shown = new Set(world.entities.map((entity) => entity.id));
      expect(
        world.activity
          .filter((item) => !shown.has(item.entity_id))
          .map((item) => `${item.entity_id}|${item.source_chapter}`),
        chapter,
      ).toEqual([]);
    }
  }, 120_000);

  it("offers date options from every chapter read", () => {
    const options = meaningfulNarrativeDateOptions(corpus, readThrough);
    const sources = new Set(
      options.flatMap(({ source_chapters }) => source_chapters),
    );
    expect(sources).toEqual(new Set(chapters));
    for (const { date } of options) {
      expect(() =>
        generateNarrativeWorld(corpus, { readThrough, softCeiling: date }),
      ).not.toThrow();
    }
  }, 120_000);
});

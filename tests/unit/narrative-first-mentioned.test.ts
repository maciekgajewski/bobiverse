import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  prepareNarrativeCorpus,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Synthetic, fictional records only. ADR-0032: a promotion introduces the entity
// with `first_mentioned`, the earlier chapter of its first mention; §2.3 makes
// the entity exist from that chapter's header date once the promotion is read.

const alex = "character:fixture-alex";
const dana = "character:fixture-dana";

function chapter(
  id: string,
  date: string,
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for first-mention tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: alex, role: "lead" }],
    ...extra,
  };
}

function corpus(danaIntroduction: NarrativeRecord): NarrativeCorpus {
  const base = createNarrativeFixtureCorpus();
  base.chapters = [
    chapter("1.1", "2160", {
      introducing: [{ id: alex, name: "Fixture Alex" }],
    }),
    chapter("1.2", "2165"),
    chapter("1.3", "2170", {
      introducing: [{ id: dana, name: "Fixture Dana", ...danaIntroduction }],
    }),
  ];
  return base;
}

describe("first_mentioned (ADR-0032)", () => {
  it("accepts an earlier chapter and dates existence from it once read", () => {
    const prepared = prepareNarrativeCorpus(corpus({ first_mentioned: "1.2" }));
    const ids = (readThrough: string, softCeiling: string) =>
      generateNarrativeWorld(prepared, {
        readThrough,
        softCeiling,
      }).entities.map((entity) => entity.id);
    // S2: invisible before the promotion chapter, whatever first_mentioned says.
    expect(ids("1.2", "2165")).not.toContain(dana);
    // S3: after promotion, Dana exists from the first mention's header date.
    expect(ids("1.3", "2165")).toContain(dana);
    expect(ids("1.3", "2160")).not.toContain(dana);
    const projected = generateNarrativeWorld(prepared, {
      readThrough: "1.3",
      softCeiling: "2170",
    }).entities.find((entity) => entity.id === dana);
    expect(projected?.first_mentioned).toBe("1.2");
  });

  it("rejects the introducing chapter or a later or unknown one", () => {
    for (const chapterRef of ["1.3", "1.4", "1.9"]) {
      expect(() =>
        prepareNarrativeCorpus(corpus({ first_mentioned: chapterRef })),
      ).toThrow(/first_mentioned must name an available chapter earlier/);
    }
  });

  it("rejects first_mentioned on a zero-state entity", () => {
    const base = corpus({});
    const zeroState = base.zeroState as { entities: NarrativeRecord[] };
    zeroState.entities[0] = {
      ...zeroState.entities[0]!,
      first_mentioned: "1.1",
    };
    // The schema rejects it: first_mentioned is chapter-only.
    expect(() => prepareNarrativeCorpus(base)).toThrow(/first_mentioned/);
  });
});

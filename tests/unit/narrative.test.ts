import { describe, expect, it } from "vitest";
import canonicalChapter from "../../data/narrative/chapters/1/1.json";
import {
  compareNarrativeDates,
  generateNarrativeWorld,
  validateNarrativeCorpus,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

describe("narrative corpus validation and projection", () => {
  it("accepts the zero state as a complete pre-book world with an empty catalogue", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.books = { books: {} };
    corpus.chapters = [];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(corpus);
    expect(world.view).toEqual({ chapter: null, display_date: null });
    expect(world.entities).toHaveLength(14);
    expect(world.entities).toContainEqual(
      expect.objectContaining({
        id: "species:human",
        entity_type: "species",
        homeworld_id: "location:earth",
      }),
    );
    expect(
      world.entities.find((entity) => entity.id === "location:sol")?.child_ids,
    ).toEqual([
      "location:mercury",
      "location:venus",
      "location:earth",
      "location:mars",
      "location:asteroid-belt",
      "location:jupiter",
      "location:saturn",
      "location:uranus",
      "location:neptune",
      "location:kuiper-belt",
      "location:oort-cloud",
    ]);
  });

  it("uses story time rather than reader order for the selected chapter world", () => {
    const world = generateNarrativeWorld(createNarrativeFixtureCorpus(), "1.3");
    expect(world.view).toEqual({ chapter: "1.3", display_date: "2200.1" });
    expect(
      world.entities.find((entity) => entity.id === "character:fixture-alex")
        ?.current_state,
    ).toBe("middle state");
  });

  it("accepts every seeded non-location type with order-independent whole-snapshot references", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.assets = {
      assets: [
        {
          id: "asset:fixture-portrait",
          path: "assets/fixture-portrait.webp",
          source: "Test-only asset registry entry.",
        },
      ],
    };
    corpus.zeroState.entities = [
      {
        id: "character:fixture-alex",
        name: "Fixture Alex",
        species_id: "species:fixture-human",
      },
      {
        id: "event:fixture-arrival",
        name: "Fixture arrival",
        location_id: "location:earth",
        participant_ids: ["character:fixture-alex"],
      },
      {
        id: "species:fixture-human",
        name: "Fixture human",
        homeworld_id: "location:earth",
        picture_id: "asset:fixture-portrait",
      },
    ];
    corpus.chapters[0]!.introducing = undefined;

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    expect(generateNarrativeWorld(corpus).entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "character:fixture-alex",
          entity_type: "character",
        }),
        expect.objectContaining({
          id: "event:fixture-arrival",
          entity_type: "event",
        }),
        expect.objectContaining({
          id: "species:fixture-human",
          entity_type: "species",
        }),
      ]),
    );
  });

  it("rejects malformed zero-state entities, a second location form, and unresolved snapshot references", () => {
    const malformed = createNarrativeFixtureCorpus();
    malformed.zeroState.entities = [{ id: "species:fixture-human" }];
    expect(() => validateNarrativeCorpus(malformed)).toThrow(
      "Zero-state source fails JSON Schema validation",
    );

    const secondLocation = createNarrativeFixtureCorpus();
    secondLocation.zeroState.entities = [
      { id: "location:second-form", name: "Not permitted", kind: "locale" },
    ];
    expect(() => validateNarrativeCorpus(secondLocation)).toThrow(
      "Zero-state source fails JSON Schema validation",
    );

    const unresolved = createNarrativeFixtureCorpus();
    unresolved.zeroState.entities = [
      {
        id: "species:fixture-human",
        name: "Fixture human",
        homeworld_id: "location:missing",
      },
    ];
    expect(() => validateNarrativeCorpus(unresolved)).toThrow(
      "Zero-state entity species:fixture-human references unavailable entity location:missing",
    );
  });

  it("rejects a chapter introduction that duplicates a zero-state entity", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[0]!.introducing = [
      { id: "species:human", name: "Duplicate human" },
    ];

    expect(() => validateNarrativeCorpus(corpus)).toThrow(
      "Chapter 1.1 introduces an existing entity: species:human",
    );
  });

  it("permits later chapter updates to seeded entities", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[2]!.updates = [
      {
        entity_id: "species:human",
        description: "A fixture update to seeded state.",
      },
    ];

    expect(
      generateNarrativeWorld(corpus, "1.3").entities.find(
        (entity) => entity.id === "species:human",
      )?.description,
    ).toBe("A fixture update to seeded state.");
  });

  it("keeps Human in the zero state while chapter 1.1 introduces Robert", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters = [structuredClone(canonicalChapter)];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(corpus, "1.1");
    expect(
      world.entities.filter((entity) => entity.id === "species:human"),
    ).toHaveLength(1);
    expect(
      world.entities.find(
        (entity) => entity.id === "character:robert-johansson",
      )?.species_id,
    ).toBe("species:human");
  });

  it("rejects an appearance list that has no lead", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[0]!.appearances = [
      { character_id: "character:fixture-alex", role: "other" },
    ];

    expect(() => validateNarrativeCorpus(corpus)).toThrow(
      "fails JSON Schema validation",
    );
  });

  it("rejects equal or incomparable writes instead of using reader order as a tie-breaker", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[2]!.date = "2200";

    expect(() => validateNarrativeCorpus(corpus)).toThrow(
      "equal or incomparable dates",
    );
  });

  it("keeps year-only and indexed dates explicitly unordered within one year", () => {
    expect(compareNarrativeDates("2200", "2200.0")).toBeNull();
    expect(compareNarrativeDates("2200.1", "2200.2")).toBeLessThan(0);
  });
});

import { describe, expect, it } from "vitest";
import canonicalChapter from "../../data/narrative/chapters/1/1.json";
import {
  compareNarrativeDates,
  generateNarrativeWorld,
  narrativeSchemaErrors,
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
      {
        id: "technology:fixture-drive",
        name: "Fixture drive",
        description: "A fictional test technology.",
      },
      {
        id: "organization:fixture-fleet",
        name: "Fixture fleet",
        current_state: "Active in the fixture.",
      },
      {
        id: "vessel_type:fixture-probe",
        name: "Fixture probe",
        description: "A fictional test vessel classification.",
      },
    ];
    corpus.chapters[0]!.introducing = undefined;
    corpus.chapters[1]!.updates = [
      { entity_id: "character:fixture-alex", current_state: "later state" },
      {
        entity_id: "technology:fixture-drive",
        description: "Later fictional technology description.",
      },
      {
        entity_id: "organization:fixture-fleet",
        current_state: "Later active state.",
      },
      {
        entity_id: "vessel_type:fixture-probe",
        description: "Later fictional vessel-type description.",
      },
    ];

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
        expect.objectContaining({
          id: "technology:fixture-drive",
          entity_type: "technology",
        }),
        expect.objectContaining({
          id: "organization:fixture-fleet",
          entity_type: "organization",
        }),
        expect.objectContaining({
          id: "vessel_type:fixture-probe",
          entity_type: "vessel_type",
        }),
      ]),
    );
    expect(generateNarrativeWorld(corpus, "1.2").entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "technology:fixture-drive",
          description: "Later fictional technology description.",
        }),
        expect.objectContaining({
          id: "organization:fixture-fleet",
          current_state: "Later active state.",
        }),
        expect.objectContaining({
          id: "vessel_type:fixture-probe",
          description: "Later fictional vessel-type description.",
        }),
      ]),
    );
  });

  it("projects direct entity introductions and later optional-field updates", () => {
    const corpus = createNarrativeFixtureCorpus();
    const introductions = corpus.chapters[0]!.introducing as Array<
      Record<string, unknown>
    >;
    introductions.push(
      {
        id: "technology:fixture-drive",
        name: "Fixture drive",
        description: "Initial fictional technology description.",
      },
      {
        id: "organization:fixture-fleet",
        name: "Fixture fleet",
        description: "Initial fictional organization description.",
        current_state: "Initially active.",
      },
      {
        id: "vessel_type:fixture-probe",
        name: "Fixture probe",
        description: "Initial fictional vessel-type description.",
      },
    );
    corpus.chapters[1]!.updates = [
      { entity_id: "technology:fixture-drive", description: null },
      { entity_id: "organization:fixture-fleet", current_state: null },
      {
        entity_id: "vessel_type:fixture-probe",
        description: "Later fictional vessel-type description.",
      },
    ];

    const beforeLaterChapter = generateNarrativeWorld(corpus, "1.1");
    expect(beforeLaterChapter.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "technology:fixture-drive",
          description: "Initial fictional technology description.",
        }),
        expect.objectContaining({
          id: "organization:fixture-fleet",
          current_state: "Initially active.",
        }),
      ]),
    );

    const afterLaterChapter = generateNarrativeWorld(corpus, "1.2");
    expect(
      afterLaterChapter.entities.find(
        (entity) => entity.id === "technology:fixture-drive",
      )?.description,
    ).toBeNull();
    expect(
      afterLaterChapter.entities.find(
        (entity) => entity.id === "organization:fixture-fleet",
      )?.current_state,
    ).toBeNull();
    expect(
      afterLaterChapter.entities.find(
        (entity) => entity.id === "vessel_type:fixture-probe",
      )?.description,
    ).toBe("Later fictional vessel-type description.");

    const readerVisibleEarlierStoryTime = generateNarrativeWorld(corpus, "1.3");
    expect(
      readerVisibleEarlierStoryTime.entities.find(
        (entity) => entity.id === "technology:fixture-drive",
      )?.description,
    ).toBe("Initial fictional technology description.");
    expect(
      readerVisibleEarlierStoryTime.entities.find(
        (entity) => entity.id === "organization:fixture-fleet",
      )?.current_state,
    ).toBe("Initially active.");
    expect(
      readerVisibleEarlierStoryTime.entities.find(
        (entity) => entity.id === "vessel_type:fixture-probe",
      )?.description,
    ).toBe("Initial fictional vessel-type description.");
  });

  it("keeps later direct entity introductions hidden by reader order", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[1]!.introducing = [
      {
        id: "technology:fixture-drive",
        name: "Fixture drive",
      },
      {
        id: "organization:fixture-fleet",
        name: "Fixture fleet",
      },
      {
        id: "vessel_type:fixture-probe",
        name: "Fixture probe",
      },
    ];

    expect(
      generateNarrativeWorld(corpus, "1.1").entities.map((entity) => entity.id),
    ).not.toEqual(
      expect.arrayContaining([
        "technology:fixture-drive",
        "organization:fixture-fleet",
        "vessel_type:fixture-probe",
      ]),
    );
    expect(
      generateNarrativeWorld(corpus, "1.2").entities.map((entity) => entity.id),
    ).toEqual(
      expect.arrayContaining([
        "technology:fixture-drive",
        "organization:fixture-fleet",
        "vessel_type:fixture-probe",
      ]),
    );
  });

  it("rejects wrong IDs, extra fields, unsupported updates, and unknown entity prefixes", () => {
    for (const [definition, candidate] of [
      ["technology", { id: "organization:wrong", name: "Wrong ID" }],
      [
        "organization",
        { id: "organization:wrong-field", name: "Wrong field", members: [] },
      ],
      ["vessel_type", { id: "vessel_type:wrong", name: "Wrong", owner: "x" }],
      [
        "technology_update",
        { entity_id: "technology:wrong-update", current_state: "unsupported" },
      ],
      [
        "organization_update",
        { entity_id: "technology:wrong-prefix", name: "Wrong" },
      ],
      ["vessel_type_update", { entity_id: "vessel:unknown", name: "Wrong" }],
      [
        "non_location_introduced_entity",
        { id: "unknown:entity", name: "Unknown" },
      ],
    ] as const) {
      expect(narrativeSchemaErrors(definition, candidate)).not.toEqual([]);
    }

    const duplicate = createNarrativeFixtureCorpus();
    duplicate.zeroState.entities = [
      { id: "technology:fixture-drive", name: "Fixture drive" },
    ];
    duplicate.chapters[0]!.introducing = [
      { id: "technology:fixture-drive", name: "Duplicate drive" },
    ];
    expect(() => validateNarrativeCorpus(duplicate)).toThrow(
      "Chapter 1.1 introduces an existing entity: technology:fixture-drive",
    );

    const sameChapterUpdate = createNarrativeFixtureCorpus();
    sameChapterUpdate.chapters[0]!.introducing = [
      { id: "organization:fixture-fleet", name: "Fixture fleet" },
    ];
    sameChapterUpdate.chapters[0]!.updates = [
      { entity_id: "organization:fixture-fleet", current_state: "Invalid" },
    ];
    expect(() => validateNarrativeCorpus(sameChapterUpdate)).toThrow(
      "Chapter 1.1 cannot update its own introduction: organization:fixture-fleet",
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

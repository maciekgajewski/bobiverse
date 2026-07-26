import { describe, expect, it } from "vitest";
import canonicalChapter1 from "../../data/narrative/chapters/1/1.json";
import canonicalChapter2 from "../../data/narrative/chapters/1/2.json";
import { buildNarrativeBrowserGroups } from "../../src/narrative/browser";
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
    corpus.chapters = [structuredClone(canonicalChapter1)];

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

  it("projects chapter 1.2 acronym naming and Robert's confirmed death without changing chapter 1.1 knowledge", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters = [
      structuredClone(canonicalChapter1),
      structuredClone(canonicalChapter2),
    ];

    const chapter1World = generateNarrativeWorld(corpus, "1.1");
    expect(
      chapter1World.entities.find(
        (entity) => entity.id === "character:robert-johansson",
      ),
    ).toMatchObject({
      current_state: "Presumed dead after the road incident.",
    });
    expect(
      chapter1World.entities.find(
        (entity) => entity.id === "character:robert-johansson",
      ),
    ).not.toHaveProperty("death_date");

    const chapter2World = generateNarrativeWorld(corpus, "1.2");
    expect(
      chapter2World.entities.find(
        (entity) => entity.id === "character:robert-johansson",
      ),
    ).toMatchObject({
      current_state: "Dead.",
      death_date: "2016",
      death_event_id: "event:bob-road-incident",
    });
    expect(
      chapter2World.entities.find(
        (entity) =>
          entity.id ===
          "organization:free-american-independent-theocratic-hegemony",
      ),
    ).toMatchObject({
      name: "FAITH",
      description: expect.stringContaining(
        "Free American Independent Theocratic Hegemony",
      ),
    });
    expect(
      buildNarrativeBrowserGroups(chapter2World, "chapter", "faith")
        .flatMap((group) => group.items)
        .map((item) => item.entity.id),
    ).toContain("organization:free-american-independent-theocratic-hegemony");
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

  it("accepts important mentions for every direct entity type without changing world state", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.zeroState.entities = [
      { id: "character:fixture-known", name: "Known fixture character" },
      { id: "event:fixture-known", name: "Known fixture event" },
      { id: "species:fixture-known", name: "Known fixture species" },
      { id: "technology:fixture-known", name: "Known fixture technology" },
      { id: "organization:fixture-known", name: "Known fixture organization" },
      { id: "vessel_type:fixture-known", name: "Known fixture vessel type" },
    ];
    corpus.chapters[0]!.mentions = [
      "character:fixture-known",
      "event:fixture-known",
      "location:mars",
      "organization:fixture-known",
      "species:fixture-known",
      "technology:fixture-known",
      "vessel_type:fixture-known",
    ];

    const withoutMentions = structuredClone(corpus);
    delete withoutMentions.chapters[0]!.mentions;
    const mentionedWorld = generateNarrativeWorld(corpus, "1.1");
    const ordinaryWorld = generateNarrativeWorld(withoutMentions, "1.1");

    expect(mentionedWorld.entities).toEqual(ordinaryWorld.entities);
    expect(mentionedWorld.activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity_id: "character:fixture-known",
          source_chapter: "1.1",
          effective_date: "2200.0",
          reasons: ["mention"],
        }),
        expect.objectContaining({
          entity_id: "location:mars",
          reasons: ["mention"],
        }),
        expect.objectContaining({
          entity_id: "location:solar-system",
          reasons: ["mapped_system_ancestry"],
        }),
      ]),
    );
  });

  it("rejects unknown, later, and structurally redundant important mentions", () => {
    expect(
      narrativeSchemaErrors("chapter_source", {
        chapter: "1.1",
        title: "Fixture duplicate mention",
        summary: "A fictional schema-validation fixture.",
        date: "2200",
        location_id: "location:earth",
        mentions: ["technology:fixture", "technology:fixture"],
      }),
    ).not.toEqual([]);

    const unknown = createNarrativeFixtureCorpus();
    unknown.chapters[0]!.mentions = ["technology:missing"];
    expect(() => validateNarrativeCorpus(unknown)).toThrow(
      "Chapter 1.1 /mentions/0: important mention target is unknown: technology:missing.",
    );

    const later = createNarrativeFixtureCorpus();
    later.chapters[1]!.introducing = [
      { id: "technology:future", name: "Future fixture technology" },
    ];
    later.chapters[0]!.mentions = ["technology:future"];
    expect(() => validateNarrativeCorpus(later)).toThrow(
      "Chapter 1.1 /mentions/0: important mention target is introduced later in chapter 1.2: technology:future.",
    );

    const structural = createNarrativeFixtureCorpus();
    structural.chapters[0]!.mentions = ["character:fixture-alex"];
    expect(() => validateNarrativeCorpus(structural)).toThrow(
      "Chapter 1.1 /mentions/0: important mention target is already represented structurally in this chapter: character:fixture-alex.",
    );
  });

  it("coalesces same-date reasons while retaining distinct and unplaced event dates", () => {
    const corpus = createNarrativeFixtureCorpus();
    const introductions = corpus.chapters[0]!.introducing as Array<
      Record<string, unknown>
    >;
    introductions.push(
      {
        id: "event:fixture-dated",
        name: "Fixture dated event",
        date: "2199",
        location_id: "location:mars",
        participant_ids: ["character:fixture-alex"],
      },
      {
        id: "event:fixture-unplaced",
        name: "Fixture unplaced event",
        location_id: "location:mars",
      },
    );

    const activity = generateNarrativeWorld(corpus, "1.3").activity;
    expect(activity).toContainEqual({
      entity_id: "character:fixture-alex",
      source_chapter: "1.1",
      effective_date: "2200.0",
      reasons: ["introduction", "appearance"],
    });
    expect(activity).toContainEqual({
      entity_id: "character:fixture-alex",
      source_chapter: "1.1",
      effective_date: "2199",
      reasons: ["event_participant"],
    });
    expect(
      activity.filter(
        (record) => record.entity_id === "event:fixture-unplaced",
      ),
    ).toEqual([
      {
        entity_id: "event:fixture-unplaced",
        source_chapter: "1.1",
        effective_date: null,
        reasons: ["event"],
      },
    ]);
    expect(
      generateNarrativeWorld(corpus, "1.3", "2200.1").entities.some(
        (entity) => entity.id === "event:fixture-unplaced",
      ),
    ).toBe(false);
    expect(activity.map((record) => record.source_chapter)).toEqual(
      [...activity.map((record) => record.source_chapter)].sort(
        (left, right) => {
          const [leftBook, leftChapter] = left.split(".").map(Number);
          const [rightBook, rightChapter] = right.split(".").map(Number);
          return leftBook - rightBook || leftChapter - rightChapter;
        },
      ),
    );
  });

  it("projects only one uniquely latest eligible character sighting", () => {
    const corpus = createNarrativeFixtureCorpus();
    expect(
      generateNarrativeWorld(corpus, "1.3", "2200.1").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      )?.last_known_location,
    ).toEqual({
      location_id: "location:earth",
      source_chapter: "1.3",
      effective_date: "2200.1",
    });

    const tied = createNarrativeFixtureCorpus();
    tied.chapters[0]!.appearances = [
      { character_id: "character:fixture-alex", role: "lead" },
      {
        character_id: "character:fixture-alex",
        role: "other",
        location_id: "location:mars",
      },
    ];
    expect(
      generateNarrativeWorld(tied, "1.1").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      )?.last_known_location,
    ).toBeUndefined();
  });
});

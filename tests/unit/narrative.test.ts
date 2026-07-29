import { describe, expect, it } from "vitest";
import canonicalChapter1 from "../../data/narrative/chapters/1/1.json";
import canonicalChapter10 from "../../data/narrative/chapters/1/10.json";
import canonicalChapter11 from "../../data/narrative/chapters/1/11.json";
import canonicalChapter2 from "../../data/narrative/chapters/1/2.json";
import canonicalChapter3 from "../../data/narrative/chapters/1/3.json";
import canonicalChapter4 from "../../data/narrative/chapters/1/4.json";
import canonicalChapter5 from "../../data/narrative/chapters/1/5.json";
import canonicalChapter6 from "../../data/narrative/chapters/1/6.json";
import canonicalChapter7 from "../../data/narrative/chapters/1/7.json";
import canonicalChapter8 from "../../data/narrative/chapters/1/8.json";
import canonicalChapter9 from "../../data/narrative/chapters/1/9.json";
import canonicalZeroState from "../../data/narrative/baseline/zero-state.json";
import { buildNarrativeBrowserGroups } from "../../src/narrative/browser";
import { focusSystemIdForSelection } from "../../src/narrative/map";
import {
  compareNarrativeDates,
  compareNarrativeMoments,
  generateNarrativeWorld,
  narrativeSchemaErrors,
  narrativeValidatorCompilationCounts,
  prepareNarrativeCorpus,
  validateNarrativeCorpus,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

function collectDescriptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectDescriptions);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [
    ...(typeof record.description === "string" ? [record.description] : []),
    ...Object.entries(record).flatMap(([key, child]) =>
      key === "description" ? [] : collectDescriptions(child),
    ),
  ];
}

const canonicalMoons = [
  { id: "location:moon", name: "Moon", parent_location_id: "location:earth" },
  {
    id: "location:phobos",
    name: "Phobos",
    parent_location_id: "location:mars",
  },
  {
    id: "location:deimos",
    name: "Deimos",
    parent_location_id: "location:mars",
  },
  { id: "location:io", name: "Io", parent_location_id: "location:jupiter" },
  {
    id: "location:europa",
    name: "Europa",
    parent_location_id: "location:jupiter",
  },
  {
    id: "location:ganymede",
    name: "Ganymede",
    parent_location_id: "location:jupiter",
  },
  {
    id: "location:callisto",
    name: "Callisto",
    parent_location_id: "location:jupiter",
  },
  {
    id: "location:dione",
    name: "Dione",
    parent_location_id: "location:saturn",
  },
  {
    id: "location:rhea",
    name: "Rhea",
    parent_location_id: "location:saturn",
  },
  {
    id: "location:titan",
    name: "Titan",
    parent_location_id: "location:saturn",
  },
  {
    id: "location:iapetus",
    name: "Iapetus",
    parent_location_id: "location:saturn",
  },
  {
    id: "location:ariel",
    name: "Ariel",
    parent_location_id: "location:uranus",
  },
  {
    id: "location:umbriel",
    name: "Umbriel",
    parent_location_id: "location:uranus",
  },
  {
    id: "location:titania",
    name: "Titania",
    parent_location_id: "location:uranus",
  },
  {
    id: "location:oberon",
    name: "Oberon",
    parent_location_id: "location:uranus",
  },
  {
    id: "location:larissa",
    name: "Larissa",
    parent_location_id: "location:neptune",
  },
  {
    id: "location:proteus",
    name: "Proteus",
    parent_location_id: "location:neptune",
  },
  {
    id: "location:triton",
    name: "Triton",
    parent_location_id: "location:neptune",
  },
  {
    id: "location:nereid",
    name: "Nereid",
    parent_location_id: "location:neptune",
  },
] as const;

describe("narrative corpus validation and projection", () => {
  it("isolates and freezes prepared input before projection", () => {
    const raw = createNarrativeFixtureCorpus();
    const prepared = prepareNarrativeCorpus(raw);
    const before = generateNarrativeWorld(prepared, "1.1");

    raw.chapters[0]!.title = "Mutated after preparation";
    raw.chapters.push(structuredClone(raw.chapters[0]!));

    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.chapters[0])).toBe(true);
    expect(generateNarrativeWorld(prepared, "1.1")).toEqual(before);
  });

  it("never lets source-aware formatting bypass structural preparation", () => {
    const raw = createNarrativeFixtureCorpus();
    raw.assets.unexpected = true;

    expect(() =>
      prepareNarrativeCorpus(raw, {
        formatStructureErrors: () => [],
      }),
    ).toThrow("Asset registry fails JSON Schema validation");
  });

  it("reuses every named schema validator for repeated assertions", () => {
    const corpus = createNarrativeFixtureCorpus();
    prepareNarrativeCorpus(corpus);
    const before = narrativeValidatorCompilationCounts();
    prepareNarrativeCorpus(structuredClone(corpus));
    narrativeSchemaErrors("chapter_source", corpus.chapters[0]);
    const after = narrativeValidatorCompilationCounts();

    expect(after).toEqual(before);
    expect([...after.values()].every((count) => count === 1)).toBe(true);
  });

  it("keeps canonical state brief and descriptions entity-centered without disclosure gaps", () => {
    const chapters = [
      canonicalChapter1,
      canonicalChapter2,
      canonicalChapter3,
      canonicalChapter4,
      canonicalChapter5,
      canonicalChapter6,
      canonicalChapter7,
      canonicalChapter8,
      canonicalChapter9,
      canonicalChapter10,
      canonicalChapter11,
    ];

    const authoredRecords = chapters.flatMap((chapter) => [
      ...("introducing" in chapter ? chapter.introducing : []),
      ...("updates" in chapter ? chapter.updates : []),
    ]);
    const currentStates = authoredRecords.flatMap((record) =>
      "current_state" in record && typeof record.current_state === "string"
        ? [record.current_state]
        : [],
    );
    const technologyDescriptions = authoredRecords.flatMap((record) => {
      const entityId =
        ("id" in record && record.id) ||
        ("entity_id" in record && record.entity_id);
      return typeof entityId === "string" &&
        entityId.startsWith("technology:") &&
        "description" in record &&
        typeof record.description === "string"
        ? [record.description]
        : [];
    });
    const allDescriptions = [
      ...collectDescriptions(canonicalZeroState),
      ...authoredRecords.flatMap((record) =>
        "description" in record && typeof record.description === "string"
          ? [record.description]
          : [],
      ),
    ];
    const disclosureGapPatterns = [
      /\b(?:has|have|had|is|are|was|were|remains?|remained)\s+not\s+(?:yet\s+)?(?:been\s+)?(?:revealed|known|explained|specified|disclosed|provided|established|stated)\b/i,
      /\b(?:remains?|remained)\s+(?:unknown|unrevealed|unexplained|unspecified)\b/i,
      /\b(?:details?|specifications?|mechanism|principle|expansion|identity|scope|purpose|function|capabilities|limitations)\b[^.!?]{0,120}\b(?:unknown|unrevealed|unexplained|unavailable|unspecified)\b/i,
      /\bneither (?:is|are|was|were) stated directly\b/i,
      /\bhas not read (?:its|the) theory\b/i,
    ];

    expect(currentStates.length).toBeGreaterThan(0);
    for (const currentState of currentStates) {
      const sentences = currentState.match(/[.!?](?:\s|$)/g) ?? [];
      expect(sentences.length, currentState).toBeLessThanOrEqual(2);
      expect(currentState).not.toMatch(
        /A nightly backed-up computer simulation made from/,
      );
    }
    expect(technologyDescriptions.length).toBeGreaterThan(0);
    for (const description of technologyDescriptions) {
      expect(description).not.toMatch(/\bBob(?:'s)?\b/);
    }
    expect(allDescriptions.length).toBeGreaterThan(0);
    for (const description of allDescriptions) {
      for (const pattern of disclosureGapPatterns) {
        expect(description, pattern.source).not.toMatch(pattern);
      }
    }
  });

  it("accepts the zero state as a complete pre-book world with an empty catalogue", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.books = { books: {} };
    corpus.chapters = [];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(prepareNarrativeCorpus(corpus));
    expect(world.view).toEqual({ chapter: null, display_date: null });
    expect(world.entities).toHaveLength(34);
    expect(world.entities).toContainEqual(
      expect.objectContaining({
        id: "species:human",
        entity_type: "species",
        homeworld_id: "location:earth",
      }),
    );
    expect(world.entities).toContainEqual({
      id: "technology:ami",
      name: "AMI",
      description:
        "Artificial Machine Intelligence (AMI) is an artificial intelligence created directly as a machine mind rather than copied from a biological mind.",
      entity_type: "technology",
    });
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
    const moons = world.entities.filter((entity) => entity.kind === "moon");
    expect(moons).toHaveLength(canonicalMoons.length);
    for (const expected of canonicalMoons) {
      expect(
        world.entities.find((entity) => entity.id === expected.id),
      ).toEqual({
        ...expected,
        kind: "moon",
        parent_relation: "orbits",
        entity_type: "location",
        child_ids: [],
      });
    }
    for (const [planetId, childIds] of [
      ["location:earth", ["location:moon"]],
      ["location:mars", ["location:phobos", "location:deimos"]],
      [
        "location:jupiter",
        [
          "location:io",
          "location:europa",
          "location:ganymede",
          "location:callisto",
        ],
      ],
      [
        "location:saturn",
        [
          "location:dione",
          "location:rhea",
          "location:titan",
          "location:iapetus",
        ],
      ],
      [
        "location:uranus",
        [
          "location:ariel",
          "location:umbriel",
          "location:titania",
          "location:oberon",
        ],
      ],
      [
        "location:neptune",
        [
          "location:larissa",
          "location:proteus",
          "location:triton",
          "location:nereid",
        ],
      ],
    ] as const) {
      expect(
        world.entities.find((entity) => entity.id === planetId)?.child_ids,
      ).toEqual(childIds);
      expect(childIds).toHaveLength(Math.min(4, childIds.length));
    }
  });

  it("uses story time rather than reader order for the selected chapter world", () => {
    const world = generateNarrativeWorld(
      prepareNarrativeCorpus(createNarrativeFixtureCorpus()),
      "1.3",
    );
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
        id: "vessel:fixture-probe",
        name: "Fixture probe",
        description: "A fictional test vessel and design.",
        current_state: "Ready in the fixture.",
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
        entity_id: "vessel:fixture-probe",
        name: "Fixture probe successor",
        description: "Later fictional vessel description.",
        current_state: "Operating in the later fixture.",
      },
    ];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    expect(
      generateNarrativeWorld(prepareNarrativeCorpus(corpus)).entities,
    ).toEqual(
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
          id: "vessel:fixture-probe",
          entity_type: "vessel",
        }),
      ]),
    );
    expect(
      generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.2").entities,
    ).toEqual(
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
          id: "vessel:fixture-probe",
          name: "Fixture probe successor",
          description: "Later fictional vessel description.",
          current_state: "Operating in the later fixture.",
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
        id: "vessel:fixture-probe",
        name: "Fixture probe",
        description: "Initial fictional vessel description.",
        current_state: "Initially ready.",
      },
    );
    corpus.chapters[1]!.updates = [
      { entity_id: "technology:fixture-drive", description: null },
      { entity_id: "organization:fixture-fleet", current_state: null },
      {
        entity_id: "vessel:fixture-probe",
        name: "Renamed fixture probe",
        description: "Later fictional vessel description.",
        current_state: null,
      },
    ];

    const beforeLaterChapter = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.1",
    );
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
        expect.objectContaining({
          id: "vessel:fixture-probe",
          name: "Fixture probe",
          current_state: "Initially ready.",
        }),
      ]),
    );

    const afterLaterChapter = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.2",
    );
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
        (entity) => entity.id === "vessel:fixture-probe",
      ),
    ).toMatchObject({
      name: "Renamed fixture probe",
      description: "Later fictional vessel description.",
      current_state: null,
    });

    const readerVisibleEarlierStoryTime = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.3",
    );
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
        (entity) => entity.id === "vessel:fixture-probe",
      ),
    ).toMatchObject({
      name: "Fixture probe",
      description: "Initial fictional vessel description.",
      current_state: "Initially ready.",
    });
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
        id: "vessel:fixture-probe",
        name: "Fixture probe",
      },
    ];

    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.1",
      ).entities.map((entity) => entity.id),
    ).not.toEqual(
      expect.arrayContaining([
        "technology:fixture-drive",
        "organization:fixture-fleet",
        "vessel:fixture-probe",
      ]),
    );
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.2",
      ).entities.map((entity) => entity.id),
    ).toEqual(
      expect.arrayContaining([
        "technology:fixture-drive",
        "organization:fixture-fleet",
        "vessel:fixture-probe",
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
      ["vessel", { id: "vessel:wrong", name: "Wrong", owner: "x" }],
      [
        "technology_update",
        { entity_id: "technology:wrong-update", current_state: "unsupported" },
      ],
      [
        "organization_update",
        { entity_id: "technology:wrong-prefix", name: "Wrong" },
      ],
      ["vessel_update", { entity_id: "vessel_type:legacy", name: "Wrong" }],
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
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.3",
      ).entities.find((entity) => entity.id === "species:human")?.description,
    ).toBe("A fixture update to seeded state.");
  });

  it("keeps Human in the zero state while chapter 1.1 introduces Robert", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters = [structuredClone(canonicalChapter1)];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.1");
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

    const chapter1World = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.1",
    );
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

    const chapter2World = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.2",
    );
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

  it("retains the road incident while excluding non-significant canonical events through chapter 1.10", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters = [
      structuredClone(canonicalChapter1),
      structuredClone(canonicalChapter2),
      structuredClone(canonicalChapter3),
      structuredClone(canonicalChapter4),
      structuredClone(canonicalChapter5),
      structuredClone(canonicalChapter6),
      structuredClone(canonicalChapter7),
      structuredClone(canonicalChapter8),
      structuredClone(canonicalChapter9),
      structuredClone(canonicalChapter10),
    ];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.10",
    );
    const entityIds = world.entities.map((entity) => entity.id);

    expect(entityIds).toContain("event:bob-road-incident");
    expect(entityIds).not.toContain("event:the-vortex");
    expect(entityIds).not.toContain("event:replicant-candidate-selection");
    expect(entityIds).not.toContain("event:project-complex-raid");
    const activityEntityIds = world.activity.map(
      (activity) => activity.entity_id,
    );
    expect(activityEntityIds).not.toContain("event:the-vortex");
    expect(activityEntityIds).not.toContain(
      "event:replicant-candidate-selection",
    );
    expect(activityEntityIds).not.toContain("event:project-complex-raid");
    expect(
      world.entities.find(
        (entity) => entity.id === "character:robert-johansson",
      ),
    ).toMatchObject({
      current_state: "Dead.",
      death_date: "2016",
      death_event_id: "event:bob-road-incident",
    });
    expect(canonicalChapter2.mentions).toContain("event:bob-road-incident");
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

  it("orders equal year-only state writes by canonical chapter", () => {
    const corpus = createNarrativeFixtureCorpus();
    for (const chapter of corpus.chapters) chapter.date = "2200";

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.3",
      ).entities.find((entity) => entity.id === "character:fixture-alex"),
    ).toMatchObject({ current_state: "middle state" });
  });

  it("keeps explicit state-write indices authoritative over chapter order", () => {
    const corpus = createNarrativeFixtureCorpus();

    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.3",
        "2200.2",
      ).entities.find((entity) => entity.id === "character:fixture-alex"),
    ).toMatchObject({ current_state: "later state" });
  });

  it("rejects equal indexed state-write moments", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[2]!.date = "2200.2";

    expect(() => validateNarrativeCorpus(corpus)).toThrow(
      "equal or incomparable moments",
    );
  });

  it("rejects mixed year-only and indexed state-write moments", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[2]!.date = "2200";

    expect(() => validateNarrativeCorpus(corpus)).toThrow(
      "equal or incomparable moments",
    );
  });

  it("keeps year-only and indexed dates explicitly unordered within one year", () => {
    expect(compareNarrativeDates("2200", "2200.0")).toBeNull();
    expect(compareNarrativeDates("2200.1", "2200.2")).toBeLessThan(0);
  });

  it("orders equal year-only narrative moments by canonical chapter only", () => {
    expect(
      compareNarrativeMoments(
        { date: "2200", sourceChapter: "1.2" },
        { date: "2200", sourceChapter: "1.11" },
      ),
    ).toBeLessThan(0);
    expect(
      compareNarrativeMoments(
        { date: "2200.1", sourceChapter: "1.11" },
        { date: "2200.1", sourceChapter: "1.2" },
      ),
    ).toBe(0);
    expect(
      compareNarrativeMoments(
        { date: "2200", sourceChapter: "1.2" },
        { date: "2200.1", sourceChapter: "1.11" },
      ),
    ).toBeNull();
  });

  it("accepts important mentions for every direct entity type without changing world state", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.zeroState.entities = [
      { id: "character:fixture-known", name: "Known fixture character" },
      { id: "event:fixture-known", name: "Known fixture event" },
      { id: "species:fixture-known", name: "Known fixture species" },
      { id: "technology:fixture-known", name: "Known fixture technology" },
      { id: "organization:fixture-known", name: "Known fixture organization" },
      { id: "vessel:fixture-known", name: "Known fixture vessel" },
    ];
    corpus.chapters[0]!.mentions = [
      "character:fixture-known",
      "event:fixture-known",
      "location:mars",
      "organization:fixture-known",
      "species:fixture-known",
      "technology:fixture-known",
      "vessel:fixture-known",
    ];

    const withoutMentions = structuredClone(corpus);
    delete withoutMentions.chapters[0]!.mentions;
    const mentionedWorld = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.1",
    );
    const ordinaryWorld = generateNarrativeWorld(
      prepareNarrativeCorpus(withoutMentions),
      "1.1",
    );

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

    const activity = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.3",
    ).activity;
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
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.3",
        "2200.1",
      ).entities.some((entity) => entity.id === "event:fixture-unplaced"),
    ).toBe(false);
    const placed = activity.filter((record) => record.effective_date !== null);
    for (let index = 1; index < placed.length; index += 1) {
      const previous = placed[index - 1]!;
      const current = placed[index]!;
      expect(
        compareNarrativeMoments(
          {
            date: previous.effective_date!,
            sourceChapter: previous.source_chapter,
          },
          {
            date: current.effective_date!,
            sourceChapter: current.source_chapter,
          },
        ),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("topologically orders activity without overriding mixed-precision boundaries", () => {
    const corpus = createNarrativeFixtureCorpus();
    const moments = [
      {
        chapterIndex: 0,
        event: {
          id: "event:fixture-indexed-late",
          name: "Fixture indexed late event",
          date: "2200.2",
        },
      },
      {
        chapterIndex: 1,
        event: {
          id: "event:fixture-year-only",
          name: "Fixture year-only event",
          date: "2200",
        },
      },
      {
        chapterIndex: 2,
        event: {
          id: "event:fixture-indexed-early",
          name: "Fixture indexed early event",
          date: "2200.1",
        },
      },
    ];
    for (const { chapterIndex, event } of moments) {
      const chapter = corpus.chapters[chapterIndex]!;
      const introductions = (chapter.introducing ??= []) as Array<
        Record<string, unknown>
      >;
      introductions.push(event);
    }

    const first = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.3",
    ).activity;
    const second = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.3",
    ).activity;
    expect(second).toEqual(first);
    const eventOrder = first
      .filter((record) => record.reasons.includes("event"))
      .map((record) => record.entity_id);
    expect(eventOrder.indexOf("event:fixture-indexed-early")).toBeLessThan(
      eventOrder.indexOf("event:fixture-indexed-late"),
    );
  });

  it("keeps event-derived equal-indexed and mixed-precision activity unresolved", () => {
    const lastEventParticipantActivity = (
      leftDate: string,
      rightDate: string,
    ) => {
      const corpus = createNarrativeFixtureCorpus();
      for (const [chapterIndex, event] of [
        [
          0,
          {
            id: "event:fixture-left",
            name: "Fixture left event",
            date: leftDate,
            participant_ids: ["character:fixture-alex"],
          },
        ],
        [
          1,
          {
            id: "event:fixture-right",
            name: "Fixture right event",
            date: rightDate,
            participant_ids: ["character:fixture-alex"],
          },
        ],
      ] as const) {
        const chapter = corpus.chapters[chapterIndex]!;
        const introductions = (chapter.introducing ??= []) as Array<
          Record<string, unknown>
        >;
        introductions.push(event);
      }
      const world = generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.3",
      );
      world.view.display_date = "2300";
      world.activity = world.activity.filter(
        (record) =>
          record.entity_id === "character:fixture-alex" &&
          record.reasons.includes("event_participant"),
      );
      return buildNarrativeBrowserGroups(world, "date")[0]?.items.find(
        ({ entity }) => entity.id === "character:fixture-alex",
      )?.lastActivity;
    };

    expect(lastEventParticipantActivity("2200.1", "2200.1")).toBeNull();
    expect(lastEventParticipantActivity("2200", "2200.1")).toBeNull();
  });

  it("projects only one uniquely latest eligible character sighting", () => {
    const corpus = createNarrativeFixtureCorpus();
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.3",
        "2200.1",
      ).entities.find((entity) => entity.id === "character:fixture-alex")
        ?.last_known_location,
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
      generateNarrativeWorld(prepareNarrativeCorpus(tied), "1.1").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      )?.last_known_location,
    ).toBeUndefined();

    const yearOnly = createNarrativeFixtureCorpus();
    for (const chapter of yearOnly.chapters) chapter.date = "2200";
    yearOnly.chapters[1]!.appearances = [
      {
        character_id: "character:fixture-alex",
        role: "lead",
        location_id: "location:mars",
      },
    ];
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(yearOnly),
        "1.3",
      ).entities.find((entity) => entity.id === "character:fixture-alex")
        ?.last_known_location,
    ).toEqual({
      location_id: "location:earth",
      source_chapter: "1.3",
      effective_date: "2200",
    });

    const equalIndexed = createNarrativeFixtureCorpus();
    for (const chapter of equalIndexed.chapters) {
      chapter.date = "2200.1";
      delete chapter.updates;
    }
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(equalIndexed),
        "1.3",
      ).entities.find((entity) => entity.id === "character:fixture-alex")
        ?.last_known_location,
    ).toBeUndefined();

    const mixedPrecision = createNarrativeFixtureCorpus();
    mixedPrecision.chapters[1]!.date = "2200";
    mixedPrecision.chapters[2]!.date = "2300";
    mixedPrecision.chapters[2]!.introducing = [
      { id: "character:fixture-other", name: "Fixture Other" },
    ];
    mixedPrecision.chapters[2]!.appearances = [
      { character_id: "character:fixture-other", role: "lead" },
    ];
    for (const chapter of mixedPrecision.chapters) delete chapter.updates;
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(mixedPrecision),
        "1.3",
      ).entities.find((entity) => entity.id === "character:fixture-alex")
        ?.last_known_location,
    ).toBeUndefined();
  });

  it("projects canonical Bob at New Handeltown and resolves Sol through chapter 1.11", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters = [
      structuredClone(canonicalChapter1),
      structuredClone(canonicalChapter2),
      structuredClone(canonicalChapter3),
      structuredClone(canonicalChapter4),
      structuredClone(canonicalChapter5),
      structuredClone(canonicalChapter6),
      structuredClone(canonicalChapter7),
      structuredClone(canonicalChapter8),
      structuredClone(canonicalChapter9),
      structuredClone(canonicalChapter10),
      structuredClone(canonicalChapter11),
    ];

    const world = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.11",
    );
    expect(
      world.entities.find((entity) => entity.id === "character:bob-replicant")
        ?.last_known_location,
    ).toEqual({
      location_id: "location:new-handeltown",
      source_chapter: "1.11",
      effective_date: "2133",
    });
    expect(
      focusSystemIdForSelection(
        { kind: "narrative", id: "character:bob-replicant" },
        world,
        new Set(["sol"]),
      ),
    ).toBe("sol");
  });
});

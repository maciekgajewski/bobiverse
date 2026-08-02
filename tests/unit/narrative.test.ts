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
  characterAncestors,
  characterTravelLegs,
  characterTravelStops,
  generateNarrativeWorld,
  narrativeSchemaErrors,
  narrativeValidatorCompilationCounts,
  narrativeWorldGenerationCount,
  prepareNarrativeCorpus,
  projectCharacterTravelHistories,
  projectNarrativeChapterDetail,
  validateNarrativeCorpus,
} from "../../src/narrative/model";
import type { NarrativeEntity } from "../../src/narrative/model";
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

  it("validates optional chapter pictures and reports unavailable assets at the chapter field", () => {
    const structurallyValid = createNarrativeFixtureCorpus();
    structurallyValid.chapters[0]!.picture_id = "asset:fixture-chapter";
    structurallyValid.assets = {
      assets: [
        {
          id: "asset:fixture-chapter",
          path: "assets/fixture-chapter.webp",
          source: "Test-only chapter illustration.",
        },
      ],
    };
    expect(() => validateNarrativeCorpus(structurallyValid)).not.toThrow();

    const unknown = createNarrativeFixtureCorpus();
    unknown.chapters[0]!.picture_id = "asset:missing";
    expect(() => validateNarrativeCorpus(unknown)).toThrow(
      "Chapter 1.1 /picture_id: chapter picture references unavailable asset asset:missing.",
    );

    expect(
      narrativeSchemaErrors("chapter_source", {
        ...createNarrativeFixtureCorpus().chapters[0],
        picture_id: "character:not-an-asset",
      }),
    ).not.toEqual([]);
  });

  it("derives immutable chapter detail from the prepared source and exact existing world", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.assets = {
      assets: [
        {
          id: "asset:fixture-chapter",
          path: "assets/fixture-chapter.webp",
          source: "Test-only chapter illustration.",
        },
      ],
    };
    corpus.chapters[0]!.picture_id = "asset:fixture-chapter";
    const introductions = corpus.chapters[0]!.introducing as Array<
      Record<string, unknown>
    >;
    introductions.push(
      { id: "character:fixture-riley", name: "Fixture Riley" },
      {
        id: "event:fixture-present",
        name: "Fixture present event",
        date: "2199",
        participant_ids: ["character:fixture-alex"],
      },
      {
        id: "event:fixture-future",
        name: "Fixture future event",
        date: "2201",
      },
      { id: "vessel:fixture-ship", name: "Fixture ship" },
      { id: "technology:fixture-drive", name: "Fixture drive" },
      { id: "organization:fixture-group", name: "Fixture group" },
    );
    corpus.chapters[0]!.appearances = [
      { character_id: "character:fixture-alex", role: "lead" },
      { character_id: "character:fixture-alex", role: "lead" },
      { character_id: "character:fixture-riley", role: "lead" },
      { character_id: "character:fixture-riley", role: "other" },
    ];
    const prepared = prepareNarrativeCorpus(corpus);
    const world = generateNarrativeWorld(prepared, "1.1");
    const detail = projectNarrativeChapterDetail(prepared, "1.1", world);

    expect(detail).toMatchObject({
      chapter: "1.1",
      bookNumber: "1",
      bookTitle: "Fixture volume",
      localNumber: "1",
      title: "Fixture introduction",
      pictureId: "asset:fixture-chapter",
      location: { id: "location:earth", name: "Earth" },
      leadCharacters: [
        { id: "character:fixture-alex", name: "Fixture Alex" },
        { id: "character:fixture-riley", name: "Fixture Riley" },
      ],
      events: [{ id: "event:fixture-present", name: "Fixture present event" }],
      vessels: [{ id: "vessel:fixture-ship", name: "Fixture ship" }],
      technologies: [{ id: "technology:fixture-drive", name: "Fixture drive" }],
      appearingCharacters: [
        { id: "character:fixture-alex", name: "Fixture Alex" },
        { id: "character:fixture-riley", name: "Fixture Riley" },
      ],
    });
    expect(detail.events).not.toContainEqual(
      expect.objectContaining({ id: "event:fixture-future" }),
    );
    expect(Object.isFrozen(detail)).toBe(true);
    expect(() =>
      projectNarrativeChapterDetail(
        prepared,
        "1.1",
        generateNarrativeWorld(prepared, "1.1", "2199"),
      ),
    ).toThrow("requires its exact Chapter-mode projection");
  });

  it("omits both character groups for a valid chapter without appearances", () => {
    const corpus = createNarrativeFixtureCorpus();
    delete corpus.chapters[0]!.appearances;
    const prepared = prepareNarrativeCorpus(corpus);
    const detail = projectNarrativeChapterDetail(
      prepared,
      "1.1",
      generateNarrativeWorld(prepared, "1.1"),
    );
    expect(detail.leadCharacters).toEqual([]);
    expect(detail.appearingCharacters).toEqual([]);
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
      const parent = world.entities.find(
        (entity) => entity.id === expected.parent_location_id,
      );
      const siblingIndex = (parent?.child_ids as string[]).indexOf(expected.id);
      expect(
        world.entities.find((entity) => entity.id === expected.id),
      ).toEqual({
        ...expected,
        kind: "moon",
        parent_relation: "orbits",
        orbital_order: (siblingIndex + 1) * 1024,
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

  it("accepts order-independent and cyclic zero-state character parents", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.zeroState.entities = [
      {
        id: "character:fixture-child",
        name: "Fixture Child",
        parent_id: "character:fixture-parent",
      },
      {
        id: "character:fixture-parent",
        name: "Fixture Parent",
        parent_id: "character:fixture-child",
      },
    ];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(prepareNarrativeCorpus(corpus));
    expect(
      world.entities.find((entity) => entity.id === "character:fixture-child"),
    ).toMatchObject({ parent_id: "character:fixture-parent" });
    expect(
      world.entities.find((entity) => entity.id === "character:fixture-parent"),
    ).toMatchObject({ parent_id: "character:fixture-child" });
  });

  it("validates character parent reference order without adding cycle rules", () => {
    const valid = createNarrativeFixtureCorpus();
    const introductions = valid.chapters[0]!.introducing as Array<
      Record<string, unknown>
    >;
    introductions.splice(1, 0, {
      id: "character:fixture-parent",
      name: "Fixture Parent",
    });
    introductions[2]!.parent_id = "character:fixture-parent";

    expect(() => validateNarrativeCorpus(valid)).not.toThrow();

    const laterSameChapter = createNarrativeFixtureCorpus();
    const laterIntroductions = laterSameChapter.chapters[0]!
      .introducing as Array<Record<string, unknown>>;
    laterIntroductions[1]!.parent_id = "character:fixture-parent";
    laterIntroductions.push({
      id: "character:fixture-parent",
      name: "Fixture Parent",
    });
    expect(() => validateNarrativeCorpus(laterSameChapter)).toThrow(
      "Introduction character:fixture-alex references unavailable entity character:fixture-parent.",
    );

    const sameChapterUpdate = createNarrativeFixtureCorpus();
    sameChapterUpdate.chapters[1]!.introducing = [
      {
        id: "character:fixture-parent",
        name: "Fixture Parent",
      },
    ];
    (
      sameChapterUpdate.chapters[1]!.updates as Array<Record<string, unknown>>
    )[0]!.parent_id = "character:fixture-parent";
    expect(() => validateNarrativeCorpus(sameChapterUpdate)).not.toThrow();

    const unavailableUpdate = createNarrativeFixtureCorpus();
    (
      unavailableUpdate.chapters[1]!.updates as Array<Record<string, unknown>>
    )[0]!.parent_id = "character:fixture-future-parent";
    expect(() => validateNarrativeCorpus(unavailableUpdate)).toThrow(
      "Update character:fixture-alex references unavailable entity character:fixture-future-parent.",
    );

    expect(
      narrativeSchemaErrors("chapter_source", {
        chapter: "1.1",
        title: "Fixture invalid parent type",
        summary: "A fictional schema-validation fixture.",
        date: "2200",
        location_id: "location:earth",
        introducing: [
          {
            id: "character:fixture-child",
            name: "Fixture Child",
            parent_id: "technology:not-a-character",
          },
        ],
      }),
    ).not.toEqual([]);
  });

  it("projects character parent introduction, replacement, and clearing at reader-safe boundaries", () => {
    const corpus = createNarrativeFixtureCorpus();
    (corpus.zeroState.entities as Array<Record<string, unknown>>).push(
      { id: "character:fixture-parent-a", name: "Fixture Parent A" },
      { id: "character:fixture-parent-b", name: "Fixture Parent B" },
    );
    const introduced = (
      corpus.chapters[0]!.introducing as Array<Record<string, unknown>>
    ).find((entity) => entity.id === "character:fixture-alex")!;
    introduced.parent_id = "character:fixture-parent-a";
    corpus.chapters[1]!.updates = [
      {
        entity_id: "character:fixture-alex",
        parent_id: "character:fixture-parent-b",
      },
    ];
    corpus.chapters[2]!.updates = [
      {
        entity_id: "character:fixture-alex",
        parent_id: null,
      },
    ];

    const prepared = prepareNarrativeCorpus(corpus);
    expect(
      generateNarrativeWorld(prepared).entities.find(
        (entity) => entity.id === "character:fixture-alex",
      ),
    ).toBeUndefined();
    expect(
      generateNarrativeWorld(prepared, "1.1").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      )?.parent_id,
    ).toBe("character:fixture-parent-a");
    expect(
      generateNarrativeWorld(prepared, "1.2").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      )?.parent_id,
    ).toBe("character:fixture-parent-b");
    expect(
      generateNarrativeWorld(prepared, "1.3").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      ),
    ).toHaveProperty("parent_id", null);
  });

  it("validates and projects explicit character birth chapters", () => {
    const corpus = createNarrativeFixtureCorpus();
    const introduced = (
      corpus.chapters[0]!.introducing as Array<Record<string, unknown>>
    ).find((entity) => entity.id === "character:fixture-alex")!;
    introduced.birth_chapter = "1.1";
    corpus.chapters[1]!.updates = [
      { entity_id: "character:fixture-alex", birth_chapter: null },
    ];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const prepared = prepareNarrativeCorpus(corpus);
    expect(
      generateNarrativeWorld(prepared, "1.1").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      )?.birth_chapter,
    ).toBe("1.1");
    expect(
      generateNarrativeWorld(prepared, "1.2").entities.find(
        (entity) => entity.id === "character:fixture-alex",
      ),
    ).toHaveProperty("birth_chapter", null);

    const later = createNarrativeFixtureCorpus();
    (later.chapters[0]!.introducing as Array<Record<string, unknown>>).find(
      (entity) => entity.id === "character:fixture-alex",
    )!.birth_chapter = "1.2";
    expect(() => validateNarrativeCorpus(later)).toThrow(
      "Introduction character:fixture-alex references unavailable birth chapter 1.2.",
    );

    const zeroState = createNarrativeFixtureCorpus();
    (zeroState.zeroState.entities as Array<Record<string, unknown>>).push({
      id: "character:fixture-zero",
      name: "Fixture Zero",
      birth_chapter: "1.1",
    });
    expect(() => validateNarrativeCorpus(zeroState)).toThrow(
      "Zero-state character character:fixture-zero cannot define birth_chapter.",
    );
  });

  it("derives projected ancestors direct-parent-first and stops on cycles", () => {
    const entities: NarrativeEntity[] = [
      {
        id: "character:child",
        entity_type: "character",
        name: "Child",
        parent_id: "character:parent",
      },
      {
        id: "character:parent",
        entity_type: "character",
        name: "Parent",
        parent_id: "character:grandparent",
      },
      {
        id: "character:grandparent",
        entity_type: "character",
        name: "Grandparent",
        parent_id: "character:child",
      },
    ];
    expect(
      characterAncestors(
        {
          entities,
          activity: [],
          view: { chapter: "1.1", display_date: null },
        },
        "character:child",
      ).map((entity) => entity.id),
    ).toEqual(["character:parent", "character:grandparent"]);
  });

  it("derives only definite interstellar travel legs, retaining route gaps and latest repeats", () => {
    const stops = [
      {
        location_id: "a",
        source_chapter: "1.1",
        effective_date: "2200",
        appearance_index: 0,
        astronomy_system_id: "system:sol",
      },
      {
        location_id: "b",
        source_chapter: "1.2",
        effective_date: "2200",
        appearance_index: 0,
        astronomy_system_id: "system:alpha",
      },
      {
        location_id: "gap",
        source_chapter: "1.3",
        effective_date: "2200.1",
        appearance_index: 0,
        astronomy_system_id: null,
      },
      {
        location_id: "c",
        source_chapter: "1.4",
        effective_date: "2201",
        appearance_index: 0,
        astronomy_system_id: "system:sol",
      },
      {
        location_id: "d",
        source_chapter: "1.5",
        effective_date: "2202",
        appearance_index: 0,
        astronomy_system_id: "system:alpha",
      },
    ];
    expect(characterTravelLegs(stops)).toEqual([
      expect.objectContaining({
        from_astronomy_system_id: "system:sol",
        to_astronomy_system_id: "system:alpha",
        arrival: expect.objectContaining({ source_chapter: "1.5" }),
      }),
    ]);
  });

  it("derives travel stops only from projected explicit appearances in chronological display order", () => {
    const corpus = prepareNarrativeCorpus(createNarrativeFixtureCorpus());
    const world = generateNarrativeWorld(corpus, "1.3");
    expect(
      characterTravelStops(corpus, world, "character:fixture-alex"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_chapter: "1.1",
          location_id: "location:earth",
        }),
        expect.objectContaining({
          source_chapter: "1.3",
          location_id: "location:earth",
        }),
      ]),
    );
    expect(
      characterTravelStops(corpus, world, "character:fixture-alex").map(
        (stop) => stop.source_chapter,
      ),
    ).toEqual(["1.1", "1.3"]);
  });

  it("projects every character history without regenerating a world per stop", () => {
    const corpus = prepareNarrativeCorpus(createNarrativeFixtureCorpus());
    const world = generateNarrativeWorld(corpus, "1.3");
    const generationCount = narrativeWorldGenerationCount(corpus);
    const histories = projectCharacterTravelHistories(corpus, world);
    expect(histories.get("character:fixture-alex")).toHaveLength(2);
    expect(narrativeWorldGenerationCount(corpus)).toBe(generationCount);
  });

  it("breaks a historical route endpoint around an incomparable mapping update", () => {
    const source = createNarrativeFixtureCorpus();
    source.chapters[0]!.date = "2200";
    const introductions = source.chapters[0]!.introducing as Array<
      Record<string, unknown>
    >;
    delete introductions[1]!.current_state;
    delete source.chapters[1]!.appearances;
    delete source.chapters[1]!.updates;
    delete source.chapters[2]!.appearances;
    source.chapters[2]!.updates = [
      {
        entity_id: "location:earth",
        map_status: "unmapped",
      },
    ];
    source.chapters.push({
      chapter: "1.4",
      title: "Fixture later projection",
      summary: "A later projection exposes the mixed-precision history.",
      date: "2201",
      location_id: "location:earth",
    });
    const corpus = prepareNarrativeCorpus(source);
    const world = generateNarrativeWorld(corpus, "1.4");

    expect(
      projectCharacterTravelHistories(corpus, world).get(
        "character:fixture-alex",
      ),
    ).toEqual([
      expect.objectContaining({
        source_chapter: "1.1",
        astronomy_system_id: null,
      }),
    ]);
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

  it("validates surveyed-body observations and nullable location updates", () => {
    const surveyedPlanet = {
      id: "location:fixture-survey-planet",
      name: "Fixture survey planet",
      kind: "planet",
      description: "A fictional surveyed planet with qualitative gravity.",
      body_class: "rocky",
      color: "rust red",
      visual_description: "A cratered surface beneath thin clouds.",
      surface_gravity_g: 1.2,
      parent_location_id: "location:sol",
      parent_relation: "orbits",
    };

    expect(narrativeSchemaErrors("location", surveyedPlanet)).toEqual([]);
    expect(
      narrativeSchemaErrors("location", {
        ...surveyedPlanet,
        id: "location:fixture-survey-dwarf",
        kind: "dwarf_planet",
        body_class: "dwarf_planet",
      }),
    ).toEqual([]);
    expect(
      narrativeSchemaErrors("location", {
        ...surveyedPlanet,
        id: "location:fixture-survey-moon",
        kind: "moon",
        parent_location_id: "location:earth",
        body_class: "icy",
      }),
    ).toEqual([]);
    expect(
      narrativeSchemaErrors("location_update", {
        entity_id: surveyedPlanet.id,
        body_class: null,
        color: null,
        visual_description: null,
        surface_gravity_g: null,
      }),
    ).toEqual([]);

    for (const candidate of [
      { ...surveyedPlanet, body_class: "terrestrial" },
      { ...surveyedPlanet, color: "" },
      { ...surveyedPlanet, visual_description: "" },
      { ...surveyedPlanet, surface_gravity_g: 0 },
      { ...surveyedPlanet, surface_gravity_g: -0.1 },
      { ...surveyedPlanet, surface_gravity_g: "1.2" },
      { ...surveyedPlanet, surface_gravity_g: Number.POSITIVE_INFINITY },
      {
        id: "location:fixture-survey-locale",
        name: "Fixture locale",
        kind: "locale",
        color: "red",
        parent_location_id: "location:earth",
        parent_relation: "located_on",
      },
    ]) {
      expect(narrativeSchemaErrors("location", candidate)).not.toEqual([]);
    }
  });

  it("projects surveyed-body observations only after reveal and supports replacement and clearing", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.chapters[1]!.introducing = [
      {
        id: "location:fixture-survey-planet",
        name: "Fixture survey planet",
        kind: "planet",
        description: "A fictional surveyed world.",
        body_class: "rocky",
        color: "rust red",
        visual_description: "A cratered surface.",
        surface_gravity_g: 1.2,
        parent_location_id: "location:sol",
        parent_relation: "orbits",
      },
    ];
    corpus.chapters.push({
      chapter: "1.4",
      title: "Fixture survey update",
      summary: "A fictional survey update clears optional observations.",
      date: "2200.3",
      location_id: "location:earth",
      updates: [
        {
          entity_id: "location:fixture-survey-planet",
          color: "dark red",
          visual_description: null,
          surface_gravity_g: null,
        },
      ],
    });

    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.1",
      ).entities.some(
        (entity) => entity.id === "location:fixture-survey-planet",
      ),
    ).toBe(false);
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.2",
      ).entities.find(
        (entity) => entity.id === "location:fixture-survey-planet",
      ),
    ).toMatchObject({
      body_class: "rocky",
      color: "rust red",
      visual_description: "A cratered surface.",
      surface_gravity_g: 1.2,
    });
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(corpus),
        "1.4",
      ).entities.find(
        (entity) => entity.id === "location:fixture-survey-planet",
      ),
    ).toMatchObject({
      body_class: "rocky",
      color: "dark red",
      visual_description: null,
      surface_gravity_g: null,
    });
  });

  it("uses effective location kind for survey fields and caps direct moon children at four", () => {
    const eligibleUpdate = createNarrativeFixtureCorpus();
    eligibleUpdate.chapters[1]!.updates = [
      { entity_id: "location:mars", color: "rust red" },
    ];
    expect(() => validateNarrativeCorpus(eligibleUpdate)).not.toThrow();

    const ineligibleUpdate = createNarrativeFixtureCorpus();
    ineligibleUpdate.chapters[1]!.updates = [
      {
        entity_id: "location:mars",
        kind: "locale",
        color: "rust red",
      },
    ];
    expect(() => validateNarrativeCorpus(ineligibleUpdate)).toThrow(
      "projection at 2200.2 leaves survey properties color on effective location kind locale for location:mars",
    );

    const retainedAfterKindChange = createNarrativeFixtureCorpus();
    retainedAfterKindChange.chapters[0]!.updates = [
      { entity_id: "location:mars", color: "rust red" },
    ];
    retainedAfterKindChange.chapters[1]!.updates = [
      { entity_id: "location:mars", kind: "locale" },
    ];
    expect(() => validateNarrativeCorpus(retainedAfterKindChange)).toThrow(
      "projection at 2200.2 leaves survey properties color on effective location kind locale for location:mars",
    );

    const clearedDuringKindChange = structuredClone(retainedAfterKindChange);
    clearedDuringKindChange.chapters[1]!.updates = [
      {
        entity_id: "location:mars",
        kind: "locale",
        color: null,
      },
    ];
    expect(() =>
      validateNarrativeCorpus(clearedDuringKindChange),
    ).not.toThrow();
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(clearedDuringKindChange),
        "1.2",
      ).entities.find((entity) => entity.id === "location:mars"),
    ).toMatchObject({ kind: "locale", color: null });

    const fourMoons = createNarrativeFixtureCorpus();
    (fourMoons.chapters[0]!.introducing as Array<Record<string, unknown>>).push(
      {
        id: "location:fixture-moon-parent",
        name: "Fixture moon parent",
        kind: "planet",
        description: "A fictional planet with exactly four moons.",
        parent_location_id: "location:sol",
        parent_relation: "orbits",
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `location:fixture-moon-parent-moon-0${index + 1}`,
        name: `Moon ${index + 1}`,
        kind: "moon",
        parent_location_id: "location:fixture-moon-parent",
        parent_relation: "orbits",
      })),
    );
    expect(() => validateNarrativeCorpus(fourMoons)).not.toThrow();

    const fiveMoons = structuredClone(fourMoons);
    (fiveMoons.chapters[0]!.introducing as Array<Record<string, unknown>>).push(
      {
        id: "location:fixture-moon-parent-moon-05",
        name: "Moon 5",
        kind: "moon",
        parent_location_id: "location:fixture-moon-parent",
        parent_relation: "orbits",
      },
    );
    expect(() => validateNarrativeCorpus(fiveMoons)).toThrow(
      "location location:fixture-moon-parent 5 direct moon children; maximum is 4",
    );

    const reparentedMoon = structuredClone(fourMoons);
    reparentedMoon.chapters[1]!.updates = [
      {
        entity_id: "location:moon",
        parent_location_id: "location:fixture-moon-parent",
        parent_relation: "orbits",
      },
    ];
    expect(() => validateNarrativeCorpus(reparentedMoon)).toThrow(
      "location location:fixture-moon-parent 5 direct moon children; maximum is 4",
    );

    const moonSwapUpdates = [
      {
        entity_id: "location:moon",
        parent_location_id: "location:jupiter",
        parent_relation: "orbits",
      },
      {
        entity_id: "location:io",
        parent_location_id: "location:earth",
        parent_relation: "orbits",
      },
    ];
    for (const updates of [moonSwapUpdates, [...moonSwapUpdates].reverse()]) {
      const moonSwap = createNarrativeFixtureCorpus();
      moonSwap.chapters[0]!.updates = updates;
      expect(() => validateNarrativeCorpus(moonSwap)).not.toThrow();
    }

    const completedFiveMoonState = createNarrativeFixtureCorpus();
    completedFiveMoonState.chapters[0]!.updates = [moonSwapUpdates[0]!];
    expect(() => validateNarrativeCorpus(completedFiveMoonState)).toThrow(
      "location location:jupiter 5 direct moon children; maximum is 4",
    );

    const nonChronologicalKindChange = createNarrativeFixtureCorpus();
    nonChronologicalKindChange.chapters[1]!.updates = [
      {
        entity_id: "location:mars",
        kind: "locale",
        color: null,
      },
    ];
    nonChronologicalKindChange.chapters[2]!.updates = [
      { entity_id: "location:mars", color: "rust red" },
    ];
    expect(() =>
      validateNarrativeCorpus(nonChronologicalKindChange),
    ).not.toThrow();
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(nonChronologicalKindChange),
        "1.3",
      ).entities.find((entity) => entity.id === "location:mars"),
    ).toMatchObject({ kind: "planet", color: "rust red" });

    const nonChronologicalMoonOverflow = createNarrativeFixtureCorpus();
    nonChronologicalMoonOverflow.chapters[1]!.updates = [
      {
        entity_id: "location:io",
        parent_location_id: "location:earth",
        parent_relation: "orbits",
      },
    ];
    nonChronologicalMoonOverflow.chapters[2]!.updates = [
      {
        entity_id: "location:moon",
        parent_location_id: "location:jupiter",
        parent_relation: "orbits",
      },
    ];
    expect(() => validateNarrativeCorpus(nonChronologicalMoonOverflow)).toThrow(
      "projection at 2200.1 gives location location:jupiter 5 direct moon children; maximum is 4",
    );
  });

  it("projects deterministic non-metric orbital ordering across introductions and updates", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.knownAstronomyObjectIds = ["sol", "fixture-system"];
    (corpus.chapters[0]!.introducing as Array<Record<string, unknown>>).push(
      {
        id: "location:fixture-system",
        name: "Fixture System",
        kind: "star_system",
        astronomy_object_id: "fixture-system",
      },
      {
        id: "location:fixture-star",
        name: "Fixture Star",
        kind: "star",
        parent_location_id: "location:fixture-system",
        parent_relation: "member_of_system",
      },
      {
        id: "location:fixture-first-orbit",
        name: "Fixture First Orbit",
        kind: "planet",
        parent_location_id: "location:fixture-star",
        parent_relation: "orbits",
      },
      {
        id: "location:fixture-orbit-z",
        name: "Fixture Orbit Z",
        kind: "planet",
        parent_location_id: "location:sol",
        parent_relation: "orbits",
      },
      {
        id: "location:fixture-orbit-explicit",
        name: "Fixture Explicit Orbit",
        kind: "planet",
        parent_location_id: "location:sol",
        parent_relation: "orbits",
        orbital_order: 512,
      },
      {
        id: "location:fixture-orbit-a",
        name: "Fixture Orbit A",
        kind: "planet",
        parent_location_id: "location:sol",
        parent_relation: "orbits",
      },
    );
    corpus.chapters[1]!.updates = [
      {
        entity_id: "location:fixture-orbit-a",
        description: "An ordinary update retains its effective ordering key.",
      },
      {
        entity_id: "location:fixture-orbit-z",
        name: "Fixture Reparented Moon",
        kind: "moon",
        parent_location_id: "location:earth",
        parent_relation: "orbits",
      },
    ];

    const world = generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.2");
    const byId = new Map(world.entities.map((entity) => [entity.id, entity]));
    expect(byId.get("location:fixture-first-orbit")?.orbital_order).toBe(1024);
    expect(byId.get("location:fixture-orbit-explicit")?.orbital_order).toBe(
      512,
    );
    expect(byId.get("location:fixture-orbit-a")?.orbital_order).toBe(12288);
    expect(byId.get("location:fixture-orbit-z")?.orbital_order).toBe(2048);
    const introductionWorld = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.1",
    );
    const introducedById = new Map(
      introductionWorld.entities.map((entity) => [entity.id, entity]),
    );
    expect(introducedById.get("location:fixture-orbit-a")?.orbital_order).toBe(
      12288,
    );
    expect(introducedById.get("location:fixture-orbit-z")?.orbital_order).toBe(
      13312,
    );
    expect(byId.get("location:sol")?.child_ids).toEqual(
      expect.arrayContaining([
        "location:fixture-orbit-explicit",
        "location:fixture-orbit-a",
      ]),
    );
    expect(
      (byId.get("location:sol")?.child_ids as string[]).indexOf(
        "location:fixture-orbit-explicit",
      ),
    ).toBeLessThan(
      (byId.get("location:sol")?.child_ids as string[]).indexOf(
        "location:mercury",
      ),
    );
    expect(byId.get("location:earth")?.child_ids).toEqual([
      "location:moon",
      "location:fixture-orbit-z",
    ]);

    const reset = structuredClone(corpus);
    reset.chapters[1]!.updates = [
      {
        entity_id: "location:fixture-orbit-a",
        orbital_order: null,
      },
    ];
    expect(() => validateNarrativeCorpus(reset)).toThrow(
      "orbital_order may be null only when the effective parent_relation no longer is orbits",
    );

    const clearedWhileLeavingOrbit = structuredClone(corpus);
    clearedWhileLeavingOrbit.chapters[1]!.updates = [
      {
        entity_id: "location:fixture-orbit-z",
        kind: "locale",
        parent_location_id: "location:earth",
        parent_relation: "located_on",
        orbital_order: null,
      },
    ];
    expect(
      generateNarrativeWorld(
        prepareNarrativeCorpus(clearedWhileLeavingOrbit),
        "1.2",
      ).entities.find((entity) => entity.id === "location:fixture-orbit-z"),
    ).not.toHaveProperty("orbital_order");

    const collision = structuredClone(corpus);
    collision.chapters[1]!.updates = [
      {
        entity_id: "location:fixture-orbit-a",
        orbital_order: 512,
      },
    ];
    expect(() => validateNarrativeCorpus(collision)).toThrow(
      "Chapter 1.2 /updates/0/orbital_order: projection at 2200.2 gives siblings location:fixture-orbit-explicit and location:fixture-orbit-a duplicate orbital_order 512",
    );

    const ineligible = structuredClone(corpus);
    ineligible.chapters[1]!.updates = [
      {
        entity_id: "location:fixture-orbit-a",
        parent_location_id: "location:earth",
        parent_relation: "located_on",
        orbital_order: 42,
      },
    ];
    expect(() => validateNarrativeCorpus(ineligible)).toThrow(
      "/updates/0/orbital_order: orbital_order is allowed only when the effective parent_relation is orbits",
    );

    const overflow = structuredClone(corpus);
    const overflowIntroductions = overflow.chapters[0]!.introducing as Array<
      Record<string, unknown>
    >;
    overflowIntroductions.find(
      (entity) => entity.id === "location:fixture-first-orbit",
    )!.orbital_order = Number.MAX_SAFE_INTEGER;
    overflowIntroductions.push({
      id: "location:fixture-overflow-orbit",
      name: "Fixture Overflow Orbit",
      kind: "planet",
      parent_location_id: "location:fixture-star",
      parent_relation: "orbits",
    });
    expect(() => validateNarrativeCorpus(overflow)).toThrow(
      "overflows the safe-integer range",
    );
  });

  it("locks the Chapter 1.19 Omicron2 lower-bound Jovian contract and order", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.knownAstronomyObjectIds = ["sol", "stellar-system-002424"];
    const jovianDescription =
      "One of several outer Jovian planets observed in the Omicron2 Eridani system.";
    corpus.chapters[0]!.introducing = [
      ...(corpus.chapters[0]!.introducing as Array<Record<string, unknown>>),
      {
        id: "location:omicron2-eridani",
        name: "Omicron2 Eridani",
        kind: "star_system",
        astronomy_object_id: "stellar-system-002424",
        description:
          "A triple-star system whose early observations identify several outer Jovian planets.",
      },
      {
        id: "location:omicron-eridani-a",
        name: "Omicron Eridani A",
        kind: "star",
        parent_location_id: "location:omicron2-eridani",
        parent_relation: "member_of_system",
      },
      ...[
        ["location:vulcan", "Vulcan", "planet", 1024],
        ["location:romulus", "Romulus", "planet", 2048],
        [
          "location:omicron2-asteroid-belt",
          "asteroid belt",
          "asteroid_belt",
          3072,
        ],
        ["location:oe-2", "OE-2", "planet", 4096],
      ].map(([id, name, kind, orbital_order]) => ({
        id,
        name,
        kind,
        parent_location_id: "location:omicron-eridani-a",
        parent_relation: "orbits",
        orbital_order,
      })),
      ...[1, 2, 3].map((ordinal) => ({
        id: `location:omicron2-outer-jovian-0${ordinal}`,
        name: `Outer Jovian ${ordinal}`,
        kind: "planet",
        body_class: "gas_giant",
        description: jovianDescription,
        parent_location_id: "location:omicron-eridani-a",
        parent_relation: "orbits",
        orbital_order: 4096 + ordinal * 1024,
      })),
    ];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    const world = generateNarrativeWorld(prepareNarrativeCorpus(corpus), "1.1");
    const byId = new Map(world.entities.map((entity) => [entity.id, entity]));
    expect(byId.get("location:omicron2-eridani")).toMatchObject({
      kind: "star_system",
      astronomy_object_id: "stellar-system-002424",
    });
    expect(byId.get("location:omicron-eridani-a")?.child_ids).toEqual([
      "location:vulcan",
      "location:romulus",
      "location:omicron2-asteroid-belt",
      "location:oe-2",
      "location:omicron2-outer-jovian-01",
      "location:omicron2-outer-jovian-02",
      "location:omicron2-outer-jovian-03",
    ]);
    expect(
      [1, 2, 3].map((ordinal) =>
        byId.get(`location:omicron2-outer-jovian-0${ordinal}`),
      ),
    ).toEqual(
      [1, 2, 3].map((ordinal) =>
        expect.objectContaining({
          id: `location:omicron2-outer-jovian-0${ordinal}`,
          name: `Outer Jovian ${ordinal}`,
          kind: "planet",
          body_class: "gas_giant",
          description: jovianDescription,
          parent_location_id: "location:omicron-eridani-a",
          parent_relation: "orbits",
          orbital_order: 4096 + ordinal * 1024,
        }),
      ),
    );
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
        (entity) => entity.id === "character:bob-replicant",
      ),
    ).toMatchObject({
      parent_id: "character:robert-johansson",
    });
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

  it("accepts supplemental mentions for every direct entity type without changing world state", () => {
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

  it("derives mapped-system ancestry for a mention-only mapped location", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.knownAstronomyObjectIds = ["sol", "fixture-system"];
    (corpus.chapters[0]!.introducing as Array<Record<string, unknown>>).push({
      id: "location:fixture-system",
      name: "Fixture System",
      kind: "star_system",
      astronomy_object_id: "fixture-system",
    });
    corpus.chapters[1]!.mentions = ["location:fixture-system"];

    const activity = generateNarrativeWorld(
      prepareNarrativeCorpus(corpus),
      "1.2",
    ).activity;

    expect(activity).toContainEqual({
      entity_id: "location:fixture-system",
      source_chapter: "1.2",
      effective_date: "2200.2",
      reasons: ["mention", "mapped_system_ancestry"],
    });
  });

  it("rejects unknown, later, and structurally redundant supplemental mentions", () => {
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
      "Chapter 1.1 /mentions/0: supplemental mention target is unknown: technology:missing.",
    );

    const later = createNarrativeFixtureCorpus();
    later.chapters[1]!.introducing = [
      { id: "technology:future", name: "Future fixture technology" },
    ];
    later.chapters[0]!.mentions = ["technology:future"];
    expect(() => validateNarrativeCorpus(later)).toThrow(
      "Chapter 1.1 /mentions/0: supplemental mention target is introduced later in chapter 1.2: technology:future.",
    );

    const structural = createNarrativeFixtureCorpus();
    structural.chapters[0]!.mentions = ["character:fixture-alex"];
    expect(() => validateNarrativeCorpus(structural)).toThrow(
      "Chapter 1.1 /mentions/0: supplemental mention target is already represented structurally in this chapter: character:fixture-alex.",
    );
  });

  it.each([
    {
      field: "character species",
      target: "species:human",
      apply: (chapter: Record<string, unknown>) => {
        chapter.updates = [
          {
            entity_id: "character:fixture-alex",
            species_id: "species:human",
          },
        ];
      },
    },
    {
      field: "character death event",
      target: "event:fixture-known",
      apply: (chapter: Record<string, unknown>) => {
        chapter.updates = [
          {
            entity_id: "character:fixture-alex",
            death_event_id: "event:fixture-known",
          },
        ];
      },
    },
    {
      field: "character parent",
      target: "character:fixture-parent",
      apply: (chapter: Record<string, unknown>) => {
        chapter.updates = [
          {
            entity_id: "character:fixture-alex",
            parent_id: "character:fixture-parent",
          },
        ];
      },
    },
    {
      field: "species homeworld",
      target: "location:mars",
      apply: (chapter: Record<string, unknown>) => {
        chapter.updates = [
          {
            entity_id: "species:fixture-human",
            homeworld_id: "location:mars",
          },
        ];
      },
    },
    {
      field: "location parent",
      target: "location:mars",
      apply: (chapter: Record<string, unknown>) => {
        chapter.introducing = [
          {
            id: "location:fixture-base",
            name: "Fixture Base",
            kind: "locale",
            parent_location_id: "location:mars",
            parent_relation: "located_on",
          },
        ];
      },
    },
    {
      field: "transit origin",
      target: "location:mars",
      apply: (chapter: Record<string, unknown>) => {
        chapter.introducing = [
          {
            id: "location:fixture-transit",
            name: "Fixture Transit",
            kind: "transit",
            map_status: "unmapped",
            origin_location_id: "location:mars",
            destination_location_id: "location:venus",
          },
        ];
      },
    },
    {
      field: "transit destination",
      target: "location:venus",
      apply: (chapter: Record<string, unknown>) => {
        chapter.introducing = [
          {
            id: "location:fixture-transit",
            name: "Fixture Transit",
            kind: "transit",
            map_status: "unmapped",
            origin_location_id: "location:mars",
            destination_location_id: "location:venus",
          },
        ];
      },
    },
  ])(
    "rejects a supplemental mention repeated through $field",
    ({ target, apply }) => {
      const corpus = createNarrativeFixtureCorpus();
      (corpus.zeroState.entities as Array<Record<string, unknown>>).push({
        id: "event:fixture-known",
        name: "Known fixture event",
      });
      (corpus.zeroState.entities as Array<Record<string, unknown>>).push({
        id: "character:fixture-parent",
        name: "Fixture Parent",
      });
      const chapter: Record<string, unknown> = {
        chapter: "1.14",
        title: "Fixture supplemental-mention boundary",
        summary: "A fictional structural-reference validation fixture.",
        date: "2201",
        location_id: "location:earth",
      };
      apply(chapter);
      chapter.mentions = [target];
      corpus.chapters.push(chapter);

      expect(() => validateNarrativeCorpus(corpus)).toThrow(
        `Chapter 1.14 /mentions/0: supplemental mention target is already represented structurally in this chapter: ${target}.`,
      );
    },
  );

  it("does not treat an ID-shaped prose string as structural", () => {
    const corpus = createNarrativeFixtureCorpus();
    corpus.zeroState.entities = [
      {
        id: "technology:fixture-known",
        name: "Known fixture technology",
      },
    ];
    corpus.chapters[0]!.summary =
      "The fictional prose contains technology:fixture-known as plain text.";
    corpus.chapters[0]!.mentions = ["technology:fixture-known"];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
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

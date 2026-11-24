import { describe, expect, it } from "vitest";
import { narrativeCorpus } from "../../src/narrative/runtime";
import {
  validateNarrativeCorpus,
  type NarrativeCatalogueSystem,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

const catalogue = (systems: readonly NarrativeCatalogueSystem[]) => systems;

function unmappedStar(id: string, name: string, aliases?: string[]) {
  return {
    id,
    name,
    kind: "star_system",
    map_status: "unmapped" as const,
    ...(aliases ? { aliases } : {}),
  };
}

function withLocations(
  locations: ReturnType<typeof unmappedStar>[],
  systems: readonly NarrativeCatalogueSystem[],
) {
  const corpus = createNarrativeFixtureCorpus();
  corpus.chapters[0]!.introducing = [
    ...(corpus.chapters[0]!.introducing as unknown[]),
    ...locations,
  ];
  corpus.astronomyCatalogue = systems;
  corpus.knownAstronomyObjectIds = ["sol", ...systems.map(({ id }) => id)];
  return corpus;
}

describe("unmapped catalogued-star guard", () => {
  it("rejects a uniquely catalogued unmapped star_system", () => {
    const corpus = withLocations(
      [unmappedStar("location:fixture-star", "Fixture Star")],
      catalogue([
        {
          id: "stellar-system-fixture",
          name: "Fixture Star",
          alternates: [],
          components: [],
        },
      ]),
    );

    expect(() => validateNarrativeCorpus(corpus)).toThrow(
      "Unmapped star_system location:fixture-star uniquely matches catalogue system stellar-system-fixture.",
    );
  });

  it("accepts an entity whose name and ID slug match different catalogue systems", () => {
    const corpus = withLocations(
      [unmappedStar("location:id-slug-system", "Named system")],
      catalogue([
        {
          id: "stellar-system-named",
          name: "Named system",
          alternates: [],
          components: [],
        },
        {
          id: "stellar-system-slug",
          name: "Id slug system",
          alternates: [],
          components: [],
        },
      ]),
    );

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
  });

  it("accepts a uniquely catalogued unmapped star_system on the allowlist", () => {
    const corpus = withLocations(
      [unmappedStar("location:fixture-star", "Fixture Star")],
      catalogue([
        {
          id: "stellar-system-fixture",
          name: "Fixture Star",
          alternates: [],
          components: [],
        },
      ]),
    );
    corpus.unmappedStarAllowlist = [
      { location_id: "location:fixture-star", reason: "Fixture exception." },
    ];

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
  });

  it("rejects stale, missing, and non-star_system allowlist entries", () => {
    const mapped = withLocations(
      [unmappedStar("location:fixture-star", "Fixture Star")],
      catalogue([
        {
          id: "stellar-system-fixture",
          name: "Fixture Star",
          alternates: [],
          components: [],
        },
      ]),
    );
    mapped.chapters[1]!.updates = [
      {
        entity_id: "location:fixture-star",
        astronomy_object_id: "stellar-system-fixture",
        map_status: null,
      },
    ];
    mapped.unmappedStarAllowlist = [
      { location_id: "location:fixture-star", reason: "Fixture exception." },
    ];
    expect(() => validateNarrativeCorpus(mapped)).toThrow(
      "Unmapped star allowlist entry location:fixture-star is mapped.",
    );

    const missing = createNarrativeFixtureCorpus();
    missing.unmappedStarAllowlist = [
      { location_id: "location:missing", reason: "Fixture exception." },
    ];
    expect(() => validateNarrativeCorpus(missing)).toThrow(
      "Unmapped star allowlist entry location:missing does not exist.",
    );

    const nonStar = createNarrativeFixtureCorpus();
    nonStar.unmappedStarAllowlist = [
      { location_id: "location:earth", reason: "Fixture exception." },
    ];
    expect(() => validateNarrativeCorpus(nonStar)).toThrow(
      "Unmapped star allowlist entry location:earth is not a star_system.",
    );
  });

  it("does not match non-unique keys, partial keys, or component suffixes", () => {
    const corpus = withLocations(
      [
        unmappedStar("location:gamma-leporis-a", "Gamma Leporis A"),
        unmappedStar("location:ambiguous", "Ambiguous"),
        unmappedStar("location:fixture", "Fixture"),
      ],
      catalogue([
        {
          id: "stellar-system-gamma-leporis",
          name: "Gamma Leporis",
          alternates: [],
          components: [],
        },
        {
          id: "stellar-system-one",
          name: "One",
          alternates: ["Ambiguous"],
          components: [],
        },
        {
          id: "stellar-system-two",
          name: "Two",
          alternates: ["Ambiguous"],
          components: [],
        },
      ]),
    );

    expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
  });

  it("normalizes Gliese/GJ and HIP catalogue designations exactly", () => {
    const systems = catalogue([
      {
        id: "stellar-system-gj-54",
        name: "Not Gliese",
        alternates: [],
        components: [{ designation: "GJ 54" }],
      },
      {
        id: "stellar-system-hip-14101",
        name: "Named system",
        alternates: [],
        components: [{ identifiers: { hip_id: "14101" } }],
      },
    ]);
    for (const [id, name, systemId] of [
      ["location:gliese-54", "Gliese 54", "stellar-system-gj-54"],
      ["location:hip-14101", "HIP 14101", "stellar-system-hip-14101"],
    ] as const) {
      const corpus = withLocations([unmappedStar(id, name)], systems);
      expect(() => validateNarrativeCorpus(corpus)).toThrow(
        `Unmapped star_system ${id} uniquely matches catalogue system ${systemId}.`,
      );
    }
  });

  it("validates the real corpus after the six catalogue-C mappings", () => {
    expect(narrativeCorpus).not.toBeNull();
    expect(() => validateNarrativeCorpus(narrativeCorpus!)).not.toThrow();

    // These locations are now mapped in the runtime catalogue and no longer
    // appear on, or require, the unmapped-star allowlist.
    const nowMappedIds = [
      "location:gamma-pavonis",
      "location:delta-pavonis",
      "location:hip-14101",
      "location:gliese-54",
      "location:gliese-877",
      "location:hip-84051",
    ];
    for (const locationId of nowMappedIds) {
      expect(
        narrativeCorpus!.unmappedStarAllowlist.some(
          (entry) => entry.location_id === locationId,
        ),
      ).toBe(false);
      const corpus = structuredClone(narrativeCorpus!);
      corpus.unmappedStarAllowlist = corpus.unmappedStarAllowlist.filter(
        (entry) => entry.location_id !== locationId,
      );
      expect(() => validateNarrativeCorpus(corpus)).not.toThrow();
    }

    expect(
      narrativeCorpus!.unmappedStarAllowlist.map((entry) => entry.location_id),
    ).toEqual(["location:gamma-leporis-a"]);
  }, 60_000);
});

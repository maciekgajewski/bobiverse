import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  narrativeSchemaErrors,
  prepareNarrativeCorpus,
  validateNarrativeCorpus,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Every text here is synthetic. No book text is read or written.

type Chapter = NarrativeRecord & {
  introducing?: NarrativeRecord[];
  updates?: NarrativeRecord[];
};

function corpus(): NarrativeCorpus & { chapters: Chapter[] } {
  return createNarrativeFixtureCorpus() as NarrativeCorpus & {
    chapters: Chapter[];
  };
}

function alex(world: { entities: { id: string }[] }) {
  return world.entities.find(
    (entity) => entity.id === "character:fixture-alex",
  );
}

function introAlex(fixture: NarrativeCorpus & { chapters: Chapter[] }) {
  const introduced = fixture.chapters[0]!.introducing?.find(
    (record) => record.id === "character:fixture-alex",
  );
  if (!introduced) throw new Error("missing fixture-alex introduction");
  return introduced;
}

describe("character description schema", () => {
  it("accepts an optional identity blurb on the introduction and on updates", () => {
    const fixture = corpus();
    introAlex(fixture).description = "A fictional test character from Earth.";
    const laterUpdate = fixture.chapters[1]!.updates?.find(
      (record) => record.entity_id === "character:fixture-alex",
    );
    if (!laterUpdate)
      throw new Error("missing fixture-alex chapter 1.2 update");
    laterUpdate.description =
      "A fictional test character later known as a surveyor.";
    expect(narrativeSchemaErrors("character", introAlex(fixture))).toEqual([]);
    expect(
      narrativeSchemaErrors("character_update", {
        entity_id: "character:fixture-alex",
        description: "A fictional test character later known as a surveyor.",
      }),
    ).toEqual([]);
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
  });

  it("accepts a description longer than the 300-character guideline", () => {
    const longDescription = `A fictional identity blurb ${"x".repeat(320)}`;
    expect(longDescription.length).toBeGreaterThan(300);
    expect(
      narrativeSchemaErrors("character", {
        id: "character:fixture-alex",
        name: "Fixture Alex",
        description: longDescription,
      }),
    ).toEqual([]);
  });

  it("accepts a null description on an update to clear the prior value", () => {
    expect(
      narrativeSchemaErrors("character_update", {
        entity_id: "character:fixture-alex",
        description: null,
      }),
    ).toEqual([]);
  });

  it("rejects an empty or non-string description on the introduction", () => {
    const empty = narrativeSchemaErrors("character", {
      id: "character:fixture-alex",
      name: "Fixture Alex",
      description: "",
    });
    expect(empty.length).toBeGreaterThan(0);
    expect(
      empty.some((error) => error.instancePath.includes("description")),
    ).toBe(true);
    const wrongType = narrativeSchemaErrors("character", {
      id: "character:fixture-alex",
      name: "Fixture Alex",
      description: 12,
    });
    expect(wrongType.length).toBeGreaterThan(0);
  });

  it("rejects a null description on the introduction", () => {
    const errors = narrativeSchemaErrors("character", {
      id: "character:fixture-alex",
      name: "Fixture Alex",
      description: null,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("character description projection", () => {
  it("uses the latest description at the viewed chapter and hides later writes", () => {
    const fixture = corpus();
    introAlex(fixture).description = "Introduced identity.";
    const laterUpdate = fixture.chapters[1]!.updates?.find(
      (record) => record.entity_id === "character:fixture-alex",
    );
    const latestUpdate = fixture.chapters[2]!.updates?.find(
      (record) => record.entity_id === "character:fixture-alex",
    );
    if (!laterUpdate || !latestUpdate)
      throw new Error("missing fixture-alex updates");
    laterUpdate.description = "Later identity.";
    latestUpdate.description = "Latest identity.";
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
    const prepared = prepareNarrativeCorpus(fixture);

    expect(alex(generateNarrativeWorld(prepared, "1.1"))).toMatchObject({
      description: "Introduced identity.",
      current_state: "initial state",
    });
    expect(alex(generateNarrativeWorld(prepared, "1.2"))).toMatchObject({
      description: "Later identity.",
      current_state: "later state",
    });
    expect(alex(generateNarrativeWorld(prepared, "1.3"))).toMatchObject({
      description: "Latest identity.",
    });
    // Date mode: a later-dated write must not leak into an earlier story date,
    // even when the later chapter has already been read.
    expect(
      alex(generateNarrativeWorld(prepared, "1.3", "2200.0")),
    ).toMatchObject({
      description: "Introduced identity.",
    });
    expect(
      alex(generateNarrativeWorld(prepared, "1.3", "2200.0")),
    ).not.toMatchObject({
      description: "Later identity.",
    });
  });

  it("clears the projected description when a later update sets it to null", () => {
    const fixture = corpus();
    introAlex(fixture).description = "Introduced identity.";
    const laterUpdate = fixture.chapters[1]!.updates?.find(
      (record) => record.entity_id === "character:fixture-alex",
    );
    if (!laterUpdate)
      throw new Error("missing fixture-alex chapter 1.2 update");
    laterUpdate.description = null;
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
    const prepared = prepareNarrativeCorpus(fixture);
    expect(alex(generateNarrativeWorld(prepared, "1.1"))).toMatchObject({
      description: "Introduced identity.",
    });
    expect(alex(generateNarrativeWorld(prepared, "1.2"))).toMatchObject({
      description: null,
    });
  });
});

describe("character description inline links", () => {
  it("rejects a description link to an unknown or later-introduced entity", () => {
    const fixture = corpus();
    introAlex(fixture).description =
      "A friend of [[character:fixture-unknown]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      /\/introducing\/1\/description: inline link at offset \d+ targets an unknown entity: character:fixture-unknown/,
    );

    const later = corpus();
    later.chapters[1]!.introducing = [
      { id: "character:fixture-later", name: "Fixture Later" },
    ];
    introAlex(later).description = "Knows [[character:fixture-later]].";
    expect(() => validateNarrativeCorpus(later)).toThrow(
      /targets character:fixture-later, which is introduced later in chapter 1\.2/,
    );
  });

  it("accepts a description link to an already-introduced entity", () => {
    const fixture = corpus();
    introAlex(fixture).description = "Lives on [[location:earth]].";
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
  });
});

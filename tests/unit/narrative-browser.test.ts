import { describe, expect, it } from "vitest";
import {
  buildNarrativeBrowserGroups,
  normalizeBrowserGroupState,
  normalizeBrowserSearch,
} from "../../src/narrative/browser";
import type { NarrativeWorld } from "../../src/narrative/model";

function world(): NarrativeWorld {
  return {
    entities: [
      {
        id: "character:zoe",
        entity_type: "character",
        name: "Zoë",
        aliases: ["Zed"],
      },
      {
        id: "character:ada",
        entity_type: "character",
        name: "Ada",
      },
      { id: "event:arrival", entity_type: "event", name: "Arrival" },
      {
        id: "location:alpha",
        entity_type: "location",
        name: "Alpha",
        kind: "star_system",
      },
      {
        id: "location:camp",
        entity_type: "location",
        name: "Camp",
        kind: "locale",
        map_status: "unmapped",
      },
      { id: "species:test", entity_type: "species", name: "Test species" },
      {
        id: "technology:test",
        entity_type: "technology",
        name: "Test technology",
      },
      {
        id: "organization:test",
        entity_type: "organization",
        name: "Test organization",
      },
      {
        id: "vessel:test",
        entity_type: "vessel",
        name: "Test vessel",
      },
    ],
    activity: [
      {
        entity_id: "character:ada",
        source_chapter: "1.1",
        effective_date: "2200",
        reasons: ["appearance"],
      },
      {
        entity_id: "character:zoe",
        source_chapter: "1.2",
        effective_date: "2190",
        reasons: ["appearance"],
      },
      {
        entity_id: "event:arrival",
        source_chapter: "1.2",
        effective_date: null,
        reasons: ["event"],
      },
    ],
    view: { chapter: "1.2", display_date: "2200" },
  };
}

describe("narrative object browser projection", () => {
  it("uses the fixed progressive group order and supports every entity type", () => {
    expect(
      buildNarrativeBrowserGroups(world(), "chapter").map(({ id }) => id),
    ).toEqual([
      "characters",
      "events",
      "star-systems",
      "other-locations",
      "species",
      "technologies",
      "organizations",
      "vessels",
    ]);
  });

  it("separates chapter recency from comparable date recency", () => {
    const chapterCharacters = buildNarrativeBrowserGroups(
      world(),
      "chapter",
    )[0]!;
    expect(chapterCharacters.items.map(({ name }) => name)).toEqual([
      "Zoë",
      "Ada",
    ]);
    expect(chapterCharacters.activeCount).toBe(1);

    const dateCharacters = buildNarrativeBrowserGroups(world(), "date")[0]!;
    expect(dateCharacters.items.map(({ name }) => name)).toEqual([
      "Ada",
      "Zoë",
    ]);
    expect(dateCharacters.activeCount).toBe(2);
    expect(
      buildNarrativeBrowserGroups(world(), "date").find(
        ({ id }) => id === "events",
      )?.items[0]?.lastActivity,
    ).toBeNull();
  });

  it("marks date-mode activity active through shared containment and suffix eligibility", () => {
    const candidate = world();
    candidate.view.display_date = "2165";
    candidate.activity = [
      {
        entity_id: "character:ada",
        source_chapter: "1.1",
        effective_date: "2165-08",
        reasons: ["appearance"],
      },
      {
        entity_id: "character:zoe",
        source_chapter: "1.2",
        effective_date: "2166",
        reasons: ["appearance"],
      },
    ];
    let characters = buildNarrativeBrowserGroups(candidate, "date")[0]!;
    expect(
      characters.items.find(({ entity }) => entity.id === "character:ada")
        ?.active,
    ).toBe(true);
    expect(
      characters.items.find(({ entity }) => entity.id === "character:zoe")
        ?.active,
    ).toBe(false);

    candidate.view.display_date = "2165-08.1";
    candidate.activity[0]!.effective_date = "2165-08";
    characters = buildNarrativeBrowserGroups(candidate, "date")[0]!;
    expect(
      characters.items.find(({ entity }) => entity.id === "character:ada")
        ?.active,
    ).toBe(true);
    candidate.activity[0]!.effective_date = "2165";
    characters = buildNarrativeBrowserGroups(candidate, "date")[0]!;
    expect(
      characters.items.find(({ entity }) => entity.id === "character:ada")
        ?.active,
    ).toBe(false);
  });

  it("uses an ordering suffix before chapter fallback", () => {
    const candidate = world();
    candidate.view.display_date = "2300";
    candidate.activity.push(
      {
        entity_id: "character:zoe",
        source_chapter: "1.1",
        effective_date: "2200",
        reasons: ["mention"],
      },
      {
        entity_id: "character:zoe",
        source_chapter: "1.2",
        effective_date: "2200.1",
        reasons: ["appearance"],
      },
    );
    expect(
      buildNarrativeBrowserGroups(candidate, "date")[0]?.items.find(
        ({ entity }) => entity.id === "character:zoe",
      )?.lastActivity,
    ).toMatchObject({ source_chapter: "1.2", effective_date: "2200.1" });
  });

  it("orders equal year-only activity and event facts by canonical chapter", () => {
    const candidate = world();
    candidate.activity.push(
      {
        entity_id: "character:ada",
        source_chapter: "1.2",
        effective_date: "2200",
        reasons: ["mention"],
      },
      {
        entity_id: "event:arrival",
        source_chapter: "1.1",
        effective_date: "2200",
        reasons: ["event"],
      },
      {
        entity_id: "event:arrival",
        source_chapter: "1.2",
        effective_date: "2200",
        reasons: ["update"],
      },
    );

    const groups = buildNarrativeBrowserGroups(candidate, "date");
    expect(
      groups[0]?.items.find(({ entity }) => entity.id === "character:ada")
        ?.lastActivity,
    ).toMatchObject({ source_chapter: "1.2", effective_date: "2200" });
    expect(
      groups
        .find(({ id }) => id === "events")
        ?.items.find(({ entity }) => entity.id === "event:arrival")
        ?.lastActivity,
    ).toMatchObject({ source_chapter: "1.2", effective_date: "2200" });
  });

  it("orders equal-suffix activity by canonical chapter", () => {
    const candidate = world();
    candidate.view.display_date = "2300";
    candidate.activity = [
      {
        entity_id: "character:ada",
        source_chapter: "1.1",
        effective_date: "2200.1",
        reasons: ["appearance"],
      },
      {
        entity_id: "character:ada",
        source_chapter: "1.2",
        effective_date: "2200.1",
        reasons: ["mention"],
      },
    ];

    expect(
      buildNarrativeBrowserGroups(candidate, "date")[0]?.items.find(
        ({ entity }) => entity.id === "character:ada",
      )?.lastActivity,
    ).toMatchObject({ source_chapter: "1.2", effective_date: "2200.1" });
  });

  it("matches projected names and aliases without case or diacritics", () => {
    expect(normalizeBrowserSearch("  ZOË  ")).toBe("zoe");
    const byName = buildNarrativeBrowserGroups(world(), "chapter", "zoe");
    expect(byName[0]?.items.map(({ name }) => name)).toEqual(["Zoë"]);
    const byAlias = buildNarrativeBrowserGroups(world(), "chapter", "ZED");
    expect(byAlias[0]?.items.map(({ name }) => name)).toEqual(["Zoë"]);
    expect(
      buildNarrativeBrowserGroups(world(), "chapter", "description"),
    ).toEqual([]);
  });

  it("migrates absent and partial saved group state safely", () => {
    expect(
      normalizeBrowserGroupState({
        characters: false,
        "vessel-types": false,
      }),
    ).toMatchObject({
      characters: false,
      events: true,
      vessels: true,
    });
    expect(normalizeBrowserGroupState("corrupt")).toMatchObject({
      characters: true,
      events: true,
    });
  });
});

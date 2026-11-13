import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  meaningfulNarrativeDates,
  prepareNarrativeCorpus,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Synthetic, fictional records only (ADR-0028). Reader order reveals a write;
// `effective_date ?? chapter date` places it in story time.

function chapter(
  id: string,
  date: string,
  updates: NarrativeRecord[] = [],
  introducing: NarrativeRecord[] = [],
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for backdated-update tests.",
    date,
    location_id: "location:earth",
    ...(introducing.length ? { introducing } : {}),
    appearances: [{ character_id: "character:fixture-alex", role: "lead" }],
    ...(updates.length ? { updates } : {}),
  };
}

const alex = "character:fixture-alex";
const sam = "character:fixture-sam";
const event = "event:fixture-meeting";

function corpus(
  overrides: Record<string, NarrativeRecord[]> = {},
): NarrativeCorpus {
  const base = createNarrativeFixtureCorpus();
  base.chapters = [
    chapter(
      "1.1",
      "2160-01",
      [],
      [
        { id: "species:fixture-human", name: "Fixture human" },
        {
          id: alex,
          name: "Fixture Alex",
          species_id: "species:fixture-human",
          current_state: "active",
        },
        {
          id: sam,
          name: "Fixture Sam",
          species_id: "species:fixture-human",
          current_state: "active",
        },
        { id: event, name: "Fixture meeting", date: "2160-01" },
      ],
    ),
    chapter("1.2", "2165-08", [{ entity_id: alex, current_state: "ambushed" }]),
    chapter(
      "1.3",
      "2170-03",
      overrides["1.3"] ?? [{ entity_id: sam, current_state: "travelling" }],
    ),
    // Reveals, at a later chapter date, something that happened in 2165-09.
    chapter(
      "1.4",
      "2174-01",
      overrides["1.4"] ?? [
        {
          entity_id: alex,
          current_state: "lost",
          death_date: "2165-09",
          effective_date: "2165-09",
        },
      ],
    ),
    // Out of order: an earlier chapter date than 1.4, revealing a 2166-02 write.
    chapter(
      "1.5",
      "2168-06",
      overrides["1.5"] ?? [
        {
          entity_id: sam,
          current_state: "repairing",
          effective_date: "2166-02",
        },
      ],
    ),
  ];
  return base;
}

const prepared = prepareNarrativeCorpus(corpus());

function entity(knowledge: string, date: string | null, id: string) {
  const world = generateNarrativeWorld(prepared, knowledge, date);
  return world.entities.find((candidate) => candidate.id === id)!;
}

describe("backdated updates (effective_date)", () => {
  it("stays hidden before its reveal chapter in both views and at every date", () => {
    expect(entity("1.3", null, alex).death_date).toBeUndefined();
    expect(entity("1.3", null, alex).current_state).toBe("ambushed");
    const dates = meaningfulNarrativeDates(prepared, "1.3");
    expect(dates).not.toContain("2165-09");
    for (const date of dates) {
      expect(entity("1.3", date, alex).death_date).toBeUndefined();
    }
  });

  it("shows in chapter view at its reveal chapter and in date view from its effective date", () => {
    const shown = entity("1.4", null, alex);
    expect(shown.death_date).toBe("2165-09");
    expect(shown.current_state).toBe("lost");
    expect(shown).not.toHaveProperty("effective_date");
    const dates = meaningfulNarrativeDates(prepared, "1.4");
    expect(dates).toContain("2165-09");
    for (const date of dates) {
      const dead = ["2165-09", "2170-03", "2174-01"].includes(date);
      expect(entity("1.4", date, alex).death_date, date).toBe(
        dead ? "2165-09" : undefined,
      );
    }
    expect(entity("1.4", "2165-08", alex).current_state).toBe("ambushed");
  });

  it("orders an out-of-order pair by effective date in both views", () => {
    // Before 1.5 is revealed, its 2166-02 write never appears.
    expect(meaningfulNarrativeDates(prepared, "1.4")).not.toContain("2166-02");
    for (const date of meaningfulNarrativeDates(prepared, "1.4")) {
      expect(entity("1.4", date, sam).current_state).not.toBe("repairing");
    }
    // Chapter view at 1.5 shows the world at 2168-06: 1.4's death (2165-09) shows
    // although 1.4's own date (2174-01) is later, and 1.3's 2170-03 write does not.
    expect(entity("1.5", null, alex).death_date).toBe("2165-09");
    expect(entity("1.5", null, sam).current_state).toBe("repairing");
    // Date view with read-through 1.5.
    expect(entity("1.5", "2166-02", sam).current_state).toBe("repairing");
    expect(entity("1.5", "2166-02", alex).death_date).toBe("2165-09");
    expect(entity("1.5", "2165-08", sam).current_state).toBe("active");
    expect(entity("1.5", "2170-03", sam).current_state).toBe("travelling");
  });

  it("lets a later-dated write from an earlier chapter win after its date (current rule)", () => {
    const shadowed = prepareNarrativeCorpus(
      corpus({ "1.3": [{ entity_id: alex, current_state: "seen" }] }),
    );
    const world = generateNarrativeWorld(shadowed, "1.4");
    const shownAlex = world.entities.find(
      (candidate) => candidate.id === alex,
    )!;
    expect(shownAlex.death_date).toBe("2165-09");
    expect(shownAlex.current_state).toBe("seen");
  });

  it.each([
    ["a later month", "2174-02"],
    ["a containing year", "2174"],
  ])(
    "rejects an effective_date at %s than the chapter date",
    (_case, effective) => {
      expect(() =>
        prepareNarrativeCorpus(
          corpus({
            "1.4": [
              {
                entity_id: alex,
                death_date: "2165-09",
                effective_date: effective,
              },
            ],
          }),
        ),
      ).toThrow(
        /updates\/0\/effective_date: .* must be on or before the chapter date 2174-01/,
      );
    },
  );

  it("accepts an effective_date equal to the chapter date", () => {
    expect(() =>
      prepareNarrativeCorpus(
        corpus({
          "1.4": [
            {
              entity_id: alex,
              death_date: "2165-09",
              effective_date: "2174-01",
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it.each([
    ["an update with no ordinary property", { entity_id: alex }, null],
    [
      "an event update",
      { entity_id: event, name: "Fixture meeting renamed" },
      "name",
    ],
    [
      "a location update",
      { entity_id: "location:earth", state: "Fixture state." },
      "state",
    ],
  ])("rejects effective_date on %s", (_case, update, property) => {
    if (property) {
      // The same update without effective_date is valid.
      expect(() =>
        prepareNarrativeCorpus(corpus({ "1.4": [update] })),
      ).not.toThrow();
    }
    expect(() =>
      prepareNarrativeCorpus(
        corpus({ "1.4": [{ ...update, effective_date: "2170-01" }] }),
      ),
    ).toThrow(/fails JSON Schema validation/);
  });
});

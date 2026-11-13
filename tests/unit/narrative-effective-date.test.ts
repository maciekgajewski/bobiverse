import { describe, expect, it } from "vitest";
import {
  compareNarrativeChapters,
  compareWriteMoments,
  generateNarrativeWorld,
  meaningfulNarrativeDates,
  prepareNarrativeCorpus,
  projectCharacterTravelHistories,
  projectNarrativeChapterDetail,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Synthetic, fictional records only (ADR-0028). Reader order reveals a write.
// Chapter view shows the latest known state from every revealed chapter, and
// the last chapter read wins a competing write; Date view cuts at the requested
// date using `effective_date ?? chapter date` and keeps story-date order.

function chapter(
  id: string,
  date: string,
  updates: NarrativeRecord[] = [],
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for backdated-update tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: "character:fixture-alex", role: "lead" }],
    ...(updates.length ? { updates } : {}),
    ...extra,
  };
}

const alex = "character:fixture-alex";
const sam = "character:fixture-sam";
const kai = "character:fixture-kai";
const event = "event:fixture-meeting";
const human = "species:fixture-human";

function corpus(
  overrides: Record<string, NarrativeRecord[]> = {},
): NarrativeCorpus {
  const base = createNarrativeFixtureCorpus();
  const person = (id: string, name: string) => ({
    id,
    name,
    species_id: human,
    current_state: "active",
  });
  base.chapters = [
    chapter("1.1", "2160-01", [], {
      introducing: [
        { id: human, name: "Fixture human" },
        person(alex, "Fixture Alex"),
        person(sam, "Fixture Sam"),
        person(kai, "Fixture Kai"),
        { id: event, name: "Fixture meeting", date: "2160-01" },
      ],
    }),
    chapter("1.2", "2165-08", [{ entity_id: alex, current_state: "ambushed" }]),
    chapter(
      "1.3",
      "2170-03",
      overrides["1.3"] ?? [{ entity_id: sam, current_state: "travelling" }],
    ),
    // Like 1.51: a later chapter date reveals something from 2165-09. Alex is
    // last seen on Mars here.
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
      { location_id: "location:mars" },
    ),
    // Like 1.52: read after 1.4 but with an earlier chapter date (2168-06).
    chapter(
      "1.5",
      "2168-06",
      overrides["1.5"] ?? [
        {
          entity_id: sam,
          current_state: "repairing",
          effective_date: "2166-02",
        },
        { entity_id: kai, current_state: "found" },
      ],
    ),
  ];
  return base;
}

const prepared = prepareNarrativeCorpus(corpus());

function world(knowledge: string, date: string | null = null) {
  return generateNarrativeWorld(prepared, knowledge, date);
}

function entity(knowledge: string, date: string | null, id: string) {
  return world(knowledge, date).entities.find(
    (candidate) => candidate.id === id,
  )!;
}

describe("backdated updates and chapter-view latest known state", () => {
  it("hides a backdated write before its reveal chapter in both views and at every date", () => {
    expect(entity("1.3", null, alex).death_date).toBeUndefined();
    expect(entity("1.3", null, alex).current_state).toBe("ambushed");
    const dates = meaningfulNarrativeDates(prepared, "1.3");
    expect(dates).not.toContain("2165-09");
    for (const date of dates) {
      expect(entity("1.3", date, alex).death_date).toBeUndefined();
    }
  });

  it("shows it in chapter view at its reveal chapter and in date view from its effective date", () => {
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

  it("never shows anything from a chapter after N, even one dated earlier", () => {
    // 1.5 is dated before 1.4, but at read-through 1.4 it is unread.
    const dates = meaningfulNarrativeDates(prepared, "1.4");
    expect(dates).not.toContain("2166-02");
    expect(dates).not.toContain("2168-06");
    for (const date of [null, ...dates]) {
      const at = world("1.4", date);
      const byId = new Map(at.entities.map((item) => [item.id, item]));
      expect(byId.get(sam)?.current_state, String(date)).not.toBe("repairing");
      expect(byId.get(kai)?.current_state, String(date)).toBe("active");
      // Activity (which feeds browser search and recency) stays revealed-only.
      expect(
        at.activity.every(
          (item) => compareNarrativeChapters(item.source_chapter, "1.4") <= 0,
        ),
      ).toBe(true);
    }
  });

  it("chapter view at an earlier-dated later chapter shows the states of both", () => {
    // Read-through 1.5 (2168-06) after 1.4 (2174-01): no story-time cutoff.
    expect(entity("1.5", null, alex)).toMatchObject({
      death_date: "2165-09",
      current_state: "lost",
    });
    expect(entity("1.5", null, kai).current_state).toBe("found");
    // Date view still cuts at the requested date among revealed chapters.
    expect(entity("1.5", "2166-02", sam).current_state).toBe("repairing");
    expect(entity("1.5", "2166-02", alex).death_date).toBe("2165-09");
    expect(entity("1.5", "2165-08", sam).current_state).toBe("active");
    expect(entity("1.5", "2165-08", kai).current_state).toBe("active");
    expect(entity("1.5", "2168-06", kai).current_state).toBe("found");
    expect(entity("1.5", "2170-03", sam).current_state).toBe("travelling");
  });

  it("lets the latest-read chapter win competing writes in chapter view", () => {
    // 1.3 (2170-03) writes sam; 1.5, read later, writes sam with an earlier
    // effective date (2166-02). Decision (c) (ADR-0028): in chapter view the
    // write from the last chapter read wins.
    expect(entity("1.5", null, sam).current_state).toBe("repairing");
    const shadowed = prepareNarrativeCorpus(
      corpus({ "1.3": [{ entity_id: alex, current_state: "seen" }] }),
    );
    const alexAt14 = generateNarrativeWorld(shadowed, "1.4").entities.find(
      (candidate) => candidate.id === alex,
    )!;
    expect(alexAt14.death_date).toBe("2165-09");
    expect(alexAt14.current_state).toBe("lost");
  });

  it("keeps story-date order for competing writes in date view", () => {
    const dates = meaningfulNarrativeDates(prepared, "1.5");
    expect(dates).toEqual(
      expect.arrayContaining(["2166-02", "2170-03", "2174-01"]),
    );
    expect(entity("1.5", "2166-02", sam).current_state).toBe("repairing");
    // From 1.3's story date on, its write wins even though 1.5 was read later.
    expect(entity("1.5", "2170-03", sam).current_state).toBe("travelling");
    expect(entity("1.5", "2174-01", sam).current_state).toBe("travelling");
    const shadowed = prepareNarrativeCorpus(
      corpus({ "1.3": [{ entity_id: alex, current_state: "seen" }] }),
    );
    const alexAt = (date: string) =>
      generateNarrativeWorld(shadowed, "1.4", date).entities.find(
        (candidate) => candidate.id === alex,
      )!;
    expect(alexAt("2165-09").current_state).toBe("lost");
    expect(alexAt("2174-01")).toMatchObject({
      death_date: "2165-09",
      current_state: "seen",
    });
  });

  it("keeps story-date order between writes from the same chapter in both orders", () => {
    // Validation allows one update per entity per chapter, so this pins the
    // comparator directly: within one chapter, reading order falls back to the
    // existing story-date order.
    const early = { date: "2165-09", sourceChapter: "1.4" };
    const late = { date: "2174-01", sourceChapter: "1.4" };
    for (const order of ["reading", "story"] as const) {
      expect(compareWriteMoments(early, late, order), order).toBeLessThan(0);
      expect(compareWriteMoments(late, early, order), order).toBeGreaterThan(0);
      expect(compareWriteMoments(late, late, order), order).toBe(0);
    }
    // Across chapters, only reading order ignores the story date.
    const laterRead = { date: "2166-02", sourceChapter: "1.5" };
    expect(compareWriteMoments(late, laterRead, "reading")).toBeLessThan(0);
    expect(compareWriteMoments(late, laterRead, "story")).toBeGreaterThan(0);
  });

  it("applies the same write order to locations in both views", () => {
    // Location writes cannot be backdated, but chapter dates still diverge
    // from reading order: 1.5 (2168-06) is read after 1.4 (2174-01).
    const earth = "location:earth";
    const located = prepareNarrativeCorpus(
      corpus({
        "1.4": [{ entity_id: earth, state: "Fixture later-dated state." }],
        "1.5": [{ entity_id: earth, state: "Fixture later-read state." }],
      }),
    );
    const stateAt = (date: string | null) =>
      generateNarrativeWorld(located, "1.5", date).entities.find(
        (candidate) => candidate.id === earth,
      )!.state;
    expect(stateAt(null)).toBe("Fixture later-read state.");
    expect(stateAt("2168-06")).toBe("Fixture later-read state.");
    expect(stateAt("2174-01")).toBe("Fixture later-dated state.");
  });

  it("keeps last-known location and travel history in agreement in both views", () => {
    const cases: Array<[string | null, string, string]> = [
      [null, "location:mars", "1.4"],
      ["2168-06", "location:earth", "1.5"],
    ];
    for (const [date, location, source] of cases) {
      const at = world("1.5", date);
      const person = at.entities.find((candidate) => candidate.id === alex)!;
      expect(person.last_known_location, String(date)).toMatchObject({
        location_id: location,
        source_chapter: source,
      });
      const stops = projectCharacterTravelHistories(prepared, at).get(alex)!;
      expect(stops.at(-1), String(date)).toMatchObject({
        location_id: location,
        source_chapter: source,
      });
    }
  });

  it("gives chapter detail only for an explicit chapter-view world", () => {
    expect(() =>
      projectNarrativeChapterDetail(prepared, "1.5", world("1.5")),
    ).not.toThrow();
    expect(() =>
      projectNarrativeChapterDetail(prepared, "1.5", world("1.5", "2168-06")),
    ).toThrow("requires its exact Chapter-mode projection");
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

  it("rejects an effective_date before the entity's introduction", () => {
    expect(() =>
      prepareNarrativeCorpus(
        corpus({
          "1.4": [
            { entity_id: alex, death_date: "2150", effective_date: "2150" },
          ],
        }),
      ),
    ).toThrow(
      /effective_date: 2150 is before character:fixture-alex was introduced \(2160-01\)/,
    );
  });

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

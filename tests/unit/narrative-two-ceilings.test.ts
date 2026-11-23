import { describe, expect, it } from "vitest";
import {
  chapterLatestDate,
  isKnownAtCeiling,
} from "../../src/narrative/ceiling";
import {
  chapterSoftCeiling,
  compareNarrativeChapters,
  generateNarrativeWorld,
  narrativeEntitiesBeforeExistence,
  narrativeStateAsOf,
  narrativeWorldCeilings,
  prepareNarrativeCorpus,
  preparedNarrativeChapters,
  projectNarrativeChapterDetail,
  softCeilingProperties,
  type NarrativeRecord,
  type NarrativeWorld,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Synthetic, fictional records only. The two-ceiling projection (design
// principles §1–§3, ADR-0031): Read through is the hard ceiling, the soft
// ceiling is a story date. State shows as of the soft ceiling; description and
// name follow Read through only; entities show from their earliest known date.

const alex = "character:fixture-alex";
const kai = "character:fixture-kai";
const late = "character:fixture-late";
const human = "species:fixture-human";
const moved = "event:fixture-moved";
const undated = "event:fixture-undated";
const mars = "location:mars";

function chapter(
  id: string,
  date: string,
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for two-ceiling projection tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: alex, role: "lead" }],
    ...extra,
  };
}

function corpus() {
  const base = createNarrativeFixtureCorpus();
  base.chapters = [
    chapter("1.1", "2160-01", {
      introducing: [
        { id: human, name: "Fixture human" },
        {
          id: alex,
          name: "Fixture Alex",
          species_id: human,
          description: "First fictional description.",
          current_state: "alex 2160",
        },
        { id: moved, name: "Fixture moved event", date: "2161-05" },
      ],
    }),
    chapter("1.2", "2170-06", {
      introducing: [
        {
          id: kai,
          name: "Fixture Kai",
          species_id: human,
          current_state: "kai 2170",
        },
      ],
      updates: [
        {
          entity_id: alex,
          name: "Fixture Alex Renamed",
          description: "Second fictional description.",
          current_state: "alex 2170",
        },
      ],
    }),
    // A non-linear chapter: read after 1.2, set earlier in story time.
    chapter("1.3", "2165-03", {
      introducing: [{ id: undated, name: "Fixture undated event" }],
      appearances: [
        { character_id: alex, role: "lead" },
        { character_id: kai, role: "other" },
      ],
      updates: [{ entity_id: alex, current_state: "alex 2165" }],
    }),
    // Year precision, and the moved event's date is corrected to a later one.
    chapter("1.4", "2175", {
      updates: [
        { entity_id: alex, current_state: "alex 2175" },
        { entity_id: moved, date: "2172-02" },
      ],
    }),
    chapter("1.5", "2185-04", {
      introducing: [
        {
          id: late,
          name: "Fixture latecomer",
          species_id: human,
          current_state: "late 2185",
        },
      ],
      updates: [{ entity_id: alex, current_state: "alex 2185-04" }],
    }),
    // Same story date as 1.5: the later-read write wins the tie.
    chapter("1.6", "2185-04", {
      updates: [{ entity_id: alex, current_state: "alex 2185-04 later read" }],
    }),
    // Other soft-ceiling properties: a death and a colony written in 2190-02.
    chapter("1.7", "2190-02", {
      updates: [
        { entity_id: alex, status_events: [{ date: "2190-02", kind: "died" }] },
        { entity_id: mars, colony_of: [human] },
      ],
    }),
  ];
  return base;
}

const prepared = prepareNarrativeCorpus(corpus());

function at(readThrough: string, softCeiling: string): NarrativeWorld {
  return generateNarrativeWorld(prepared, { readThrough, softCeiling });
}

function find(world: NarrativeWorld, id: string) {
  return world.entities.find((candidate) => candidate.id === id);
}

function ids(world: NarrativeWorld): Set<string> {
  return new Set(world.entities.map((entity) => entity.id));
}

describe("two-ceiling narrative projection", () => {
  it("keeps an earlier-dated write read later from becoming current at a later soft ceiling", () => {
    // 1.3 (2165-03) is read after 1.2 (2170-06).
    expect(find(at("1.3", "2170-06"), alex)?.current_state).toBe("alex 2170");
    expect(find(at("1.3", "2172-01"), alex)?.current_state).toBe("alex 2170");
    expect(find(at("1.3", "2165-03"), alex)?.current_state).toBe("alex 2165");
  });

  it("ignores a later-dated write at an earlier soft ceiling, even when read", () => {
    expect(find(at("1.2", "2165-03"), alex)?.current_state).toBe("alex 2160");
    expect(find(at("1.2", "2170-05"), alex)?.current_state).toBe("alex 2160");
    expect(find(at("1.2", "2170-06"), alex)?.current_state).toBe("alex 2170");
  });

  it("breaks a same-date tie by reading order", () => {
    expect(find(at("1.6", "2185-04"), alex)?.current_state).toBe(
      "alex 2185-04 later read",
    );
    expect(find(at("1.5", "2185-04"), alex)?.current_state).toBe(
      "alex 2185-04",
    );
  });

  it("projects description and name from Read through, whatever the soft ceiling", () => {
    const early = find(at("1.2", "2160-01"), alex);
    expect(early).toMatchObject({
      name: "Fixture Alex Renamed",
      description: "Second fictional description.",
      current_state: "alex 2160",
    });
    expect(find(at("1.1", "2160-01"), alex)).toMatchObject({
      name: "Fixture Alex",
      description: "First fictional description.",
    });
    // The classification names state, not description or name.
    expect(softCeilingProperties.has("current_state")).toBe(true);
    expect(softCeilingProperties.has("state")).toBe(true);
    for (const property of ["description", "visual_description", "name"])
      expect(softCeilingProperties.has(property), property).toBe(false);
  });

  it("hides an entity before its earliest known date and shows it after", () => {
    // Read through 1.2: Kai's earliest fact is the 2170-06 introduction.
    expect(ids(at("1.2", "2165-03")).has(kai)).toBe(false);
    expect(
      narrativeEntitiesBeforeExistence(at("1.2", "2165-03")).find(
        (entity) => entity.id === kai,
      ),
    ).toMatchObject({ name: "Fixture Kai" });
    expect(ids(at("1.2", "2170-06")).has(kai)).toBe(true);
    // Read through 1.3: Kai's 1.3 appearance (2165-03) moves the earliest date
    // back, but no state is known that early (rule (b)).
    const world = at("1.3", "2165-03");
    const shown = find(world, kai)!;
    expect(shown).toBeDefined();
    expect(shown).not.toHaveProperty("current_state");
    expect(narrativeStateAsOf(world, shown)).toEqual({
      state: null,
      asOf: "2165-03",
    });
    expect(ids(at("1.3", "2165-02")).has(kai)).toBe(false);
    // Zero-state entities exist at every soft ceiling.
    expect(ids(at("1.1", "2160-01")).has("location:earth")).toBe(true);
  });

  it("hides status_event and colony_of written after the soft ceiling", () => {
    const before = at("1.7", "2190-01");
    expect(find(before, alex)).not.toHaveProperty("status_event");
    expect(find(before, mars)).not.toHaveProperty("colony_of");
    // Read, but dated after the soft ceiling: the same as unread for state.
    expect(find(at("1.7", "2185"), alex)).not.toHaveProperty("status_event");
    const after = at("1.7", "2190-02");
    expect(find(after, alex)?.status_event).toEqual({
      date: "2190-02",
      kind: "died",
    });
    expect(find(after, mars)?.colony_of).toEqual([human]);
    expect(softCeilingProperties.has("status_events")).toBe(false);
    expect(softCeilingProperties.has("status_event")).toBe(false);
    expect(softCeilingProperties.has("colony_of")).toBe(true);
  });

  it("lists exactly the read entities that do not exist yet, with hard-ceiling fields and no state", () => {
    const beforeIds = (world: NarrativeWorld) =>
      narrativeEntitiesBeforeExistence(world).map((entity) => entity.id);
    // Kai is introduced in 2170-06 and not yet seen at 2165-03.
    const early = at("1.2", "2165-03");
    expect(beforeIds(early)).toEqual([kai]);
    const kaiBefore = narrativeEntitiesBeforeExistence(early)[0]!;
    expect(kaiBefore).toMatchObject({
      id: kai,
      entity_type: "character",
      name: "Fixture Kai",
      species_id: human,
    });
    expect(kaiBefore).not.toHaveProperty("current_state");
    expect(ids(early).has(kai)).toBe(false);
    // The moved event waits for its current date; Kai now exists via 1.3.
    const moving = at("1.4", "2165-03");
    expect(beforeIds(moving)).toEqual([moved]);
    expect(narrativeEntitiesBeforeExistence(moving)[0]).toMatchObject({
      name: "Fixture moved event",
      date: "2172-02",
    });
    // Unread entities are never listed; existing ones never are either.
    expect(beforeIds(at("1.5", "2185-03"))).toEqual([late]);
    expect(beforeIds(at("1.6", "2190"))).toEqual([]);
    // Zero state and hand-built worlds list nothing.
    expect(beforeIds(generateNarrativeWorld(prepared))).toEqual([]);
    expect(
      narrativeEntitiesBeforeExistence({
        entities: [],
        activity: [],
        view: { chapter: null, display_date: null },
      }),
    ).toEqual([]);
  });

  it("counts a year- or month-precision fact for its whole period", () => {
    // 1.4's year-dated write is known throughout 2175.
    expect(find(at("1.4", "2175-01"), alex)?.current_state).toBe("alex 2175");
    expect(find(at("1.4", "2174-12"), alex)?.current_state).toBe("alex 2170");
    // 1.5's month-dated write is known at a year soft ceiling, not before its month.
    expect(find(at("1.5", "2185"), alex)?.current_state).toBe("alex 2185-04");
    expect(find(at("1.5", "2185-03"), alex)?.current_state).toBe("alex 2175");
    // The latecomer exists from 2185-04, so at a 2185 soft ceiling too.
    expect(ids(at("1.5", "2185")).has(late)).toBe(true);
    expect(ids(at("1.5", "2185-03")).has(late)).toBe(false);
  });

  it("shows an event from its current date, not the earliest date it ever had", () => {
    // Before 1.4 the event is dated 2161-05.
    expect(ids(at("1.3", "2165-03")).has(moved)).toBe(true);
    // 1.4 moves it to 2172-02.
    expect(ids(at("1.4", "2165-03")).has(moved)).toBe(false);
    expect(ids(at("1.4", "2172-02")).has(moved)).toBe(true);
    expect(find(at("1.4", "2172-02"), moved)?.date).toBe("2172-02");
  });

  it("dates an undated fact by its revealing chapter in every view", () => {
    expect(ids(at("1.3", "2165-02")).has(undated)).toBe(false);
    expect(ids(at("1.3", "2165-03")).has(undated)).toBe(true);
    // Chapter view and the compatibility Date view alike.
    expect(ids(generateNarrativeWorld(prepared, "1.3")).has(undated)).toBe(
      true,
    );
    expect(
      ids(generateNarrativeWorld(prepared, "1.3", "2165-03")).has(undated),
    ).toBe(true);
  });

  it("never uses anything from a chapter after Read through", () => {
    for (const softCeiling of ["2160-01", "2165-03", "2185", "2190"]) {
      const world = at("1.2", softCeiling);
      const all = [
        ...world.entities,
        ...narrativeEntitiesBeforeExistence(world),
      ];
      expect(all.some((entity) => entity.id === undated)).toBe(false);
      expect(all.some((entity) => entity.id === late)).toBe(false);
      expect(find(world, alex)?.current_state).not.toBe("alex 2165");
      expect(find(world, alex)?.current_state).not.toBe("alex 2175");
      expect(
        world.activity.every(
          (item) => compareNarrativeChapters(item.source_chapter, "1.2") <= 0,
        ),
      ).toBe(true);
    }
    expect(() =>
      generateNarrativeWorld(prepared, {
        readThrough: "1.2",
        softCeiling: "2165-03",
        chapter: "1.3",
      }),
    ).toThrow("past Read through");
  });

  it("uses the chapter's latest date as the chapter-view soft ceiling", () => {
    for (const source of preparedNarrativeChapters(prepared)) {
      const id = source.chapter as string;
      expect(chapterSoftCeiling(prepared, id)).toBe(chapterLatestDate(source));
      expect(
        narrativeWorldCeilings(generateNarrativeWorld(prepared, id)),
      ).toEqual({ readThrough: id, softCeiling: chapterLatestDate(source) });
    }
    // The compatibility Date view keeps the selected chapter as Read through.
    expect(
      narrativeWorldCeilings(
        generateNarrativeWorld(prepared, "1.3", "2160-01"),
      ),
    ).toEqual({ readThrough: "1.3", softCeiling: "2160-01" });
    expect(narrativeWorldCeilings(generateNarrativeWorld(prepared))).toEqual({
      readThrough: null,
      softCeiling: null,
    });
  });

  it("views an earlier chapter with everything read so far", () => {
    // Read through 1.6, looking at 1.3 (T4 wires this into the app).
    const world = generateNarrativeWorld(prepared, {
      readThrough: "1.6",
      softCeiling: chapterSoftCeiling(prepared, "1.3"),
      chapter: "1.3",
    });
    expect(world.view).toEqual({ chapter: "1.3", display_date: "2165-03" });
    expect(find(world, alex)).toMatchObject({
      name: "Fixture Alex Renamed",
      description: "Second fictional description.",
      current_state: "alex 2165",
    });
    expect(ids(world).has(late)).toBe(false);
    expect(() =>
      projectNarrativeChapterDetail(prepared, "1.3", world),
    ).not.toThrow();
  });

  it("cuts activity at the soft ceiling, dating undated activity by its chapter", () => {
    // Read through 1.6, looking at 2165-03 (BOB-20261120-C3EY9W).
    const world = at("1.6", "2165-03");
    const keys = world.activity.map(
      (item) => `${item.entity_id}|${item.source_chapter}`,
    );
    // 1.3 (2165-03) is read after 1.2 but set before it.
    expect(keys).toContain(`${alex}|1.3`);
    expect(keys).toContain(`${kai}|1.3`);
    // The undated event takes 1.3's date (rule (c)).
    expect(keys).toContain(`${undated}|1.3`);
    // Later-dated activity waits for its date, though read.
    expect(keys).not.toContain(`${alex}|1.2`);
    expect(keys.some((key) => key.startsWith(`${late}|`))).toBe(false);
    expect(
      world.activity.every(
        (item) =>
          item.effective_date === null ||
          isKnownAtCeiling(item.effective_date, "2165-03"),
      ),
    ).toBe(true);
    expect(
      at("1.6", "2165-02").activity.some((item) => item.entity_id === undated),
    ).toBe(false);
    // Year precision: Alex's 2175 activity in 1.4 is known at 2175-01 (rule (e)).
    expect(
      at("1.6", "2175-01").activity.some(
        (item) => item.entity_id === alex && item.source_chapter === "1.4",
      ),
    ).toBe(true);
    expect(
      at("1.6", "2174-12").activity.some(
        (item) => item.entity_id === alex && item.source_chapter === "1.4",
      ),
    ).toBe(false);
    // Activity only names entities the world shows.
    for (const softCeiling of ["2160-01", "2165-03", "2175", "2190-02"]) {
      const shown = ids(at("1.7", softCeiling));
      expect(
        at("1.7", softCeiling).activity.filter(
          (item) => !shown.has(item.entity_id),
        ),
        softCeiling,
      ).toEqual([]);
    }
  });

  it("requires a soft ceiling exactly when something is read", () => {
    expect(() =>
      generateNarrativeWorld(prepared, {
        readThrough: "1.2",
        softCeiling: null,
      }),
    ).toThrow("soft ceiling");
    expect(() =>
      generateNarrativeWorld(prepared, {
        readThrough: null,
        softCeiling: "2160-01",
      }),
    ).toThrow("soft ceiling");
    expect(() =>
      generateNarrativeWorld(prepared, {
        readThrough: "1.2",
        softCeiling: "not a date",
      }),
    ).toThrow();
  });
});

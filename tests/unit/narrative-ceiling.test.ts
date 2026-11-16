import { describe, expect, it } from "vitest";
import {
  chapterLatestDate,
  entityEarliestDate,
  entityEarliestDates,
  isKnownAtCeiling,
} from "../../src/narrative/ceiling";
import {
  isNarrativeDateEligible,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

function canonicalChapters(): NarrativeRecord[] {
  if (!narrativeCorpus) throw new Error("Canonical corpus failed to prepare.");
  return narrativeCorpus.chapters;
}

// Synthetic, fictional records only, except the canonical book 1 checks, which
// read chapter dates and IDs, never chapter prose. See
// docs/design-principles.md rules (a), (d), (e) and §3.1.

describe("isKnownAtCeiling (rule (e) calendar precision)", () => {
  const matrix: [fact: string, ceiling: string, known: boolean][] = [
    // Year against month, both ways.
    ["2185", "2185-04", true],
    ["2185-04", "2185", true],
    ["2185-12", "2185", true],
    ["2186-01", "2185", false],
    ["2184", "2185-04", true],
    ["2186", "2185-04", false],
    // Month against month.
    ["2185-03", "2185-04", true],
    ["2185-04", "2185-04", true],
    ["2185-05", "2185-04", false],
    // Day precision.
    ["2185-04-30", "2185-04", true],
    ["2185-05-01", "2185-04", false],
    ["2185-04", "2185-04-01", true],
    ["2185", "2185-01-01", true],
    ["2185-04-01", "2185-04-01", true],
    ["2185-04-02", "2185-04-01", false],
    ["2185-03-31", "2185-04-01", true],
    ["2185-04", "2185-03-31", false],
    ["2184-02-29", "2184-02", true],
    ["2184-03", "2184-02-29", false],
    // Ordering suffixes decide only between identical calendar ranges.
    ["2185.1", "2185.2", true],
    ["2185.2", "2185.2", true],
    ["2185.2", "2185.1", false],
    ["2185.1", "2185", false],
    ["2185", "2185.0", true],
    ["2185.0", "2185", true],
    ["2185-04.3", "2185-04", false],
    ["2185-04", "2185-04.3", true],
    ["2185-04-01.2", "2185-04-01.1", false],
    ["2185-04-01.1", "2185-04-01.1", true],
    ["2185-04-01", "2185-04-01.1", true],
    ["2185-04.3", "2185", true],
    ["2185.9", "2185-04", true],
    ["2185.9", "2185-01-01", true],
    ["2185-05.0", "2185-04.9", false],
  ];

  it.each(matrix)("%s at a %s ceiling is known: %s", (fact, ceiling, known) => {
    expect(isKnownAtCeiling(fact, ceiling)).toBe(known);
  });

  it("leaves strict display eligibility unchanged", () => {
    expect(isNarrativeDateEligible("2185", "2185-04")).toBe(false);
    expect(isKnownAtCeiling("2185", "2185-04")).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(() => isKnownAtCeiling("2185-13", "2185")).toThrow();
    expect(() => isKnownAtCeiling("2185", "2185-02-30")).toThrow();
  });
});

function chapter(
  id: string,
  date: string,
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for ceiling helper tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: "character:fixture-alex", role: "lead" }],
    ...extra,
  };
}

describe("chapterLatestDate (§3.1)", () => {
  it("returns the header date of a chapter with no dated events", () => {
    expect(
      chapterLatestDate(
        chapter("1.1", "2165-08", {
          introducing: [
            {
              id: "character:fixture-sam",
              name: "Fixture Sam",
              birth_date: "2190",
            },
            { id: "event:fixture-undated", name: "Undated event" },
          ],
          updates: [
            { entity_id: "character:fixture-alex", current_state: "busy" },
          ],
          mentions: ["event:fixture-later"],
        }),
      ),
    ).toBe("2165-08");
  });

  it("takes a later date of an event the chapter introduces", () => {
    expect(
      chapterLatestDate(
        chapter("1.1", "2165", {
          introducing: [
            { id: "event:fixture-early", name: "Early", date: "2150" },
            { id: "event:fixture-late", name: "Late", date: "2170-02" },
          ],
        }),
      ),
    ).toBe("2170-02");
  });

  it("takes an event date an update supplies, but not a clearing null", () => {
    expect(
      chapterLatestDate(
        chapter("1.2", "2165", {
          updates: [{ entity_id: "event:fixture-meeting", date: "2168" }],
        }),
      ),
    ).toBe("2168");
    expect(
      chapterLatestDate(
        chapter("1.2", "2165", {
          updates: [{ entity_id: "event:fixture-meeting", date: null }],
        }),
      ),
    ).toBe("2165");
  });

  it("counts effective dates", () => {
    expect(
      chapterLatestDate(
        chapter("1.2", "2160", {
          updates: [
            {
              entity_id: "character:fixture-alex",
              effective_date: "2160-06",
              current_state: "resting",
            },
          ],
        }),
      ),
    ).toBe("2160");
    // Validation keeps effective dates on or before the header; the helper
    // still compares them.
    expect(
      chapterLatestDate(
        chapter("1.2", "2160", {
          updates: [
            {
              entity_id: "character:fixture-alex",
              effective_date: "2161",
              current_state: "resting",
            },
          ],
        }),
      ),
    ).toBe("2161");
  });

  it("compares range ends, then starts, then suffixes", () => {
    const withEvent = (header: string, eventDate: string) =>
      chapterLatestDate(
        chapter("1.3", header, {
          introducing: [
            { id: "event:fixture-x", name: "Fixture X", date: eventDate },
          ],
        }),
      );
    // A year ends after a month inside it.
    expect(withEvent("2165-06", "2165")).toBe("2165");
    expect(withEvent("2165", "2165-06")).toBe("2165");
    // Same end: the later start wins.
    expect(withEvent("2165", "2165-12")).toBe("2165-12");
    expect(withEvent("2165-12", "2165-12-31")).toBe("2165-12-31");
    // Same range: the higher suffix wins; an exact tie keeps the header.
    expect(withEvent("2165-12.1", "2165-12.3")).toBe("2165-12.3");
    expect(withEvent("2165-12.3", "2165-12.1")).toBe("2165-12.3");
    expect(withEvent("2165-12", "2165-12.0")).toBe("2165-12");
    // A suffix never beats a later calendar range.
    expect(withEvent("2165-11.9", "2165-12")).toBe("2165-12");
  });

  it("resolves a year-only event later than a month header by range end", () => {
    // The shape canonical 1.24 had before its diversion was dated 2157-04: the
    // year 2157 ends after April 2157, so the event, not the header, is latest.
    expect(
      chapterLatestDate(
        chapter("1.24", "2157-04", {
          introducing: [
            { id: "event:fixture-diversion", name: "Diversion", date: "2157" },
          ],
        }),
      ),
    ).toBe("2157");
  });

  it("resolves canonical chapter 1.24 to 2157-04", () => {
    const record = canonicalChapters().find(
      (candidate) => candidate.chapter === "1.24",
    )!;
    // The four-asteroid diversion is dated 2157-04, the same as the header.
    expect(chapterLatestDate(record)).toBe("2157-04");
  });

  it("returns the header date for every canonical chapter without event dates or effective dates", () => {
    const plain = canonicalChapters().filter((record) => {
      const introduced =
        (record.introducing as NarrativeRecord[] | undefined) ?? [];
      const updates = (record.updates as NarrativeRecord[] | undefined) ?? [];
      return (
        !introduced.some(
          (entity) =>
            String(entity.id).startsWith("event:") &&
            typeof entity.date === "string",
        ) &&
        !updates.some(
          (update) =>
            (String(update.entity_id).startsWith("event:") &&
              typeof update.date === "string") ||
            typeof update.effective_date === "string",
        )
      );
    });
    expect(plain.length).toBeGreaterThan(0);
    for (const record of plain) {
      expect(chapterLatestDate(record), String(record.chapter)).toBe(
        record.date,
      );
    }
  });
});

describe("entityEarliestDate (rule (a))", () => {
  const alex = "character:fixture-alex";
  const sam = "character:fixture-sam";
  const kai = "character:fixture-kai";
  const battle = "event:fixture-battle";
  const meeting = "event:fixture-meeting";
  const chapters: NarrativeRecord[] = [
    chapter("1.1", "2160", {
      introducing: [
        { id: alex, name: "Fixture Alex" },
        { id: meeting, name: "Fixture meeting" },
      ],
    }),
    chapter("1.2", "2165", {
      introducing: [
        { id: sam, name: "Fixture Sam" },
        { id: battle, name: "Fixture battle", date: "2140-03" },
      ],
    }),
    // A non-linear chapter: read third, its backdated update is set in 2150.
    chapter("1.3", "2170", {
      introducing: [{ id: kai, name: "Fixture Kai" }],
      updates: [
        { entity_id: sam, effective_date: "2150", current_state: "young" },
        { entity_id: meeting, date: "2130-05-02" },
      ],
    }),
    chapter("1.4", "2171", {
      updates: [{ entity_id: alex, current_state: "older" }],
    }),
  ];

  it("lowers an entity's earliest date to a backdated update once it is read", () => {
    expect(entityEarliestDate(chapters, sam, "1.2")).toBe("2165");
    expect(entityEarliestDate(chapters, sam, "1.3")).toBe("2150");
    expect(entityEarliestDate(chapters, sam, "1.4")).toBe("2150");
  });

  it("never uses chapters past Read through", () => {
    expect(entityEarliestDate(chapters, sam, "1.1")).toBeNull();
    expect(entityEarliestDate(chapters, kai, "1.2")).toBeNull();
    expect(entityEarliestDate(chapters, alex, null)).toBeNull();
    expect(entityEarliestDates(chapters, null).size).toBe(0);
  });

  it("dates events by their own date, and undated events by the revealing chapter", () => {
    expect(entityEarliestDate(chapters, battle, "1.4")).toBe("2140-03");
    expect(entityEarliestDate(chapters, meeting, "1.2")).toBe("2160");
    expect(entityEarliestDate(chapters, meeting, "1.3")).toBe("2130-05-02");
  });

  it("keeps the introduction date when later writes are later", () => {
    expect(entityEarliestDate(chapters, alex, "1.4")).toBe("2160");
    expect(entityEarliestDate(chapters, kai, "1.4")).toBe("2170");
  });

  it("counts appearances and ignores input order", () => {
    const appeared = [
      chapter("1.2", "2165", {
        appearances: [{ character_id: kai, role: "lead" }],
      }),
      chapter("1.1", "2163", {
        introducing: [{ id: kai, name: "Fixture Kai" }],
      }),
    ];
    expect(entityEarliestDates(appeared, "1.2").get(kai)).toBe("2163");
    expect(entityEarliestDates(appeared, "1.2").get(alex)).toBe("2163");
  });

  it("prefers the earliest start, then the earliest end, then the lower suffix", () => {
    const tied = (dates: string[]) =>
      entityEarliestDate(
        dates.map((date, index) =>
          chapter(`1.${index + 1}`, "2190", {
            ...(index === 0 ? { introducing: [{ id: sam, name: "Sam" }] } : {}),
            updates:
              index === 0
                ? []
                : [{ entity_id: sam, effective_date: date, state: "s" }],
          }),
        ),
        sam,
        "1.9",
      );
    expect(tied(["", "2185-04", "2185"])).toBe("2185");
    expect(tied(["", "2185", "2185-01"])).toBe("2185-01");
    expect(tied(["", "2185-01.2", "2185-01.1"])).toBe("2185-01.1");
  });

  it("shows an entity at a soft ceiling from its earliest known date", () => {
    const earliest = entityEarliestDate(chapters, sam, "1.3")!;
    expect(isKnownAtCeiling(earliest, "2150-06")).toBe(true);
    expect(isKnownAtCeiling(earliest, "2149")).toBe(false);
  });
});

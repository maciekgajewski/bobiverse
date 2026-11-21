import { describe, expect, it } from "vitest";
import {
  prepareNarrativeCorpus,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Synthetic, fictional records only (BOB-20261121-5A8W76). A write that sets
// death_date must be dated (effective_date ?? chapter date; an introduction by
// its chapter date) no later than its death_date period, so the character
// never shows alive between the death and the write.

const alex = "character:fixture-alex";
const kai = "character:fixture-kai";
const human = "species:fixture-human";

function chapter(
  id: string,
  date: string,
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for death-date dating tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: alex, role: "lead" }],
    ...extra,
  };
}

function corpus(date: string, extra: NarrativeRecord): NarrativeCorpus {
  const base = createNarrativeFixtureCorpus();
  base.chapters = [
    chapter("1.1", "2160-01", {
      introducing: [
        { id: human, name: "Fixture human" },
        {
          id: alex,
          name: "Fixture Alex",
          species_id: human,
          current_state: "active",
        },
      ],
    }),
    chapter("1.2", date, extra),
  ];
  return base;
}

function death(date: string, write: NarrativeRecord) {
  return () =>
    prepareNarrativeCorpus(
      corpus(date, {
        updates: [{ entity_id: alex, current_state: "dead", ...write }],
      }),
    );
}

const tooLate = /updates\/0\/death_date: .*after the death.*"effective_date"/;

describe("death_date write dating", () => {
  it("accepts an update dated by its chapter within the death period", () => {
    expect(death("2165-08-20", { death_date: "2165-08" })).not.toThrow();
    expect(death("2165-08", { death_date: "2165-08" })).not.toThrow();
  });

  it("accepts a back-dated effective_date on or before the death", () => {
    expect(
      death("2174-01", { death_date: "2165-09", effective_date: "2165-09" }),
    ).not.toThrow();
    expect(
      death("2174-01", { death_date: "2165-09", effective_date: "2165-03" }),
    ).not.toThrow();
  });

  it("rejects an update dated after the death period", () => {
    expect(death("2174-01", { death_date: "2165-09" })).toThrow(tooLate);
    expect(
      death("2174-01", { death_date: "2165-09", effective_date: "2165-10" }),
    ).toThrow(tooLate);
  });

  it("compares partial dates as calendar periods", () => {
    // A year-dated death allows any write in that year.
    expect(death("2165-12-31", { death_date: "2165" })).not.toThrow();
    expect(death("2166-01-01", { death_date: "2165" })).toThrow(tooLate);
    // A month-dated write overlapping a day-dated death is known at it.
    expect(
      death("2174-01", { death_date: "2165-09-14", effective_date: "2165-09" }),
    ).not.toThrow();
    expect(
      death("2174-01", {
        death_date: "2165-09-14",
        effective_date: "2165-09-15",
      }),
    ).toThrow(tooLate);
    // Within the same period the ordering suffix decides (ADR-0026).
    expect(
      death("2174-01", { death_date: "2165.2", effective_date: "2165.1" }),
    ).not.toThrow();
    expect(
      death("2174-01", { death_date: "2165.2", effective_date: "2165.3" }),
    ).toThrow(tooLate);
  });

  it("checks an introduction by its chapter date", () => {
    const introduce = (date: string, deathDate: string) => () =>
      prepareNarrativeCorpus(
        corpus(date, {
          introducing: [
            {
              id: kai,
              name: "Fixture Kai",
              species_id: human,
              current_state: "dead",
              death_date: deathDate,
            },
          ],
        }),
      );
    expect(introduce("2185-04", "2185-04")).not.toThrow();
    expect(introduce("2185-04", "2185")).not.toThrow();
    expect(introduce("2185-04", "2160")).toThrow(
      /introducing\/0\/death_date: .*after the death.*later update with "effective_date": "2160"/,
    );
  });
});

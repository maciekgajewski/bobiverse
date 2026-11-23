import { describe, expect, it } from "vitest";
import { chapterLatestDate } from "../../src/narrative/ceiling";
import {
  assertAccumulatedStatusEventsInChapter,
  generateNarrativeWorld,
  prepareNarrativeCorpus,
  projectedStatusEventAtCeiling,
  projectedStatusEventFromChapterWrites,
  softCeilingProperties,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Synthetic, fictional records only (ADR-0033).

const alex = "character:fixture-alex";
const kai = "character:fixture-kai";
const human = "species:fixture-human";
const knownEvent = "event:fixture-known";

function chapter(
  id: string,
  date: string,
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for status-event tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: alex, role: "lead" }],
    ...extra,
  };
}

function baseCorpus(): NarrativeCorpus {
  const corpus = createNarrativeFixtureCorpus();
  corpus.chapters = [
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
  ];
  return corpus;
}

function prepare(extraChapters: NarrativeRecord[]) {
  const corpus = baseCorpus();
  corpus.chapters.push(...extraChapters);
  return prepareNarrativeCorpus(corpus);
}

function died(date: string, extra: NarrativeRecord = {}) {
  return { date, kind: "died" as const, ...extra };
}

function restored(date: string, extra: NarrativeRecord = {}) {
  return { date, kind: "restored_from_backup" as const, ...extra };
}

describe("status event validation (ADR-0033)", () => {
  it("accepts a death dated on or before the chapter header", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2165-08", {
          updates: [{ entity_id: alex, status_events: [died("2165-08")] }],
        }),
      ]),
    ).not.toThrow();
    expect(() =>
      prepare([
        chapter("1.2", "2174-01", {
          updates: [{ entity_id: alex, status_events: [died("2165-09")] }],
        }),
      ]),
    ).not.toThrow();
    // Year-dated events are known throughout that year (rule (e)), as in 1.13.
    expect(() =>
      prepare([
        chapter("1.2", "2133-08-17", {
          updates: [{ entity_id: alex, status_events: [died("2133")] }],
        }),
      ]),
    ).not.toThrow();
  });

  it("rejects a status event dated after the chapter header", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2165-08", {
          updates: [{ entity_id: alex, status_events: [died("2165-09")] }],
        }),
      ]),
    ).toThrow(
      /status_events\/0\/date:.*must be on or before the chapter date 2165-08/,
    );
  });

  it("rejects a restore without a preceding death", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2165-08", {
          updates: [{ entity_id: alex, status_events: [restored("2165-08")] }],
        }),
      ]),
    ).toThrow(/restored_from_backup is allowed only immediately after died/);
  });

  it("accepts a die/restore/die cycle and rejects died after died", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2185-04", {
          updates: [{ entity_id: alex, status_events: [died("2185-04")] }],
        }),
        chapter("1.3", "2185-06", {
          updates: [{ entity_id: alex, status_events: [restored("2185-06")] }],
        }),
        chapter("1.4", "2188-05", {
          updates: [{ entity_id: alex, status_events: [died("2188-05")] }],
        }),
      ]),
    ).not.toThrow();
    expect(() =>
      prepare([
        chapter("1.2", "2185-04", {
          updates: [
            {
              entity_id: alex,
              status_events: [died("2185-03"), died("2185-04")],
            },
          ],
        }),
      ]),
    ).toThrow(
      /died is allowed only when the list is empty or immediately after restored_from_backup/,
    );
  });

  it("rejects backup_date on died and a backup_date after the restore", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2185-04", {
          updates: [
            {
              entity_id: alex,
              status_events: [died("2185-04", { backup_date: "2185-03" })],
            },
          ],
        }),
      ]),
    ).toThrow(/backup_date is allowed only on restored_from_backup/);
    expect(() =>
      prepare([
        chapter("1.2", "2185-06", {
          updates: [
            {
              entity_id: alex,
              status_events: [
                died("2185-04"),
                restored("2185-06", { backup_date: "2185-07" }),
              ],
            },
          ],
        }),
      ]),
    ).toThrow(
      /backup_date 2185-07 must be on or before the restore date 2185-06/,
    );
  });

  it("checks event_id only on died, resolution, and identical dates", () => {
    const withEvent = () => {
      const corpus = baseCorpus();
      (corpus.zeroState.entities as NarrativeRecord[]).push({
        id: knownEvent,
        name: "Known fixture event",
        date: "2165-08",
      });
      return corpus;
    };
    expect(() =>
      prepareNarrativeCorpus(
        (() => {
          const corpus = withEvent();
          corpus.chapters.push(
            chapter("1.2", "2165-08", {
              updates: [
                {
                  entity_id: alex,
                  status_events: [died("2165-08", { event_id: knownEvent })],
                },
              ],
            }),
          );
          return corpus;
        })(),
      ),
    ).not.toThrow();
    expect(() =>
      prepareNarrativeCorpus(
        (() => {
          const corpus = withEvent();
          corpus.chapters.push(
            chapter("1.2", "2165-08", {
              updates: [
                {
                  entity_id: alex,
                  status_events: [
                    died("2165-08", { event_id: "event:missing" }),
                  ],
                },
              ],
            }),
          );
          return corpus;
        })(),
      ),
    ).toThrow(/references unavailable entity event:missing/);
    expect(() =>
      prepareNarrativeCorpus(
        (() => {
          const corpus = withEvent();
          corpus.chapters.push(
            chapter("1.2", "2165-08", {
              updates: [
                {
                  entity_id: alex,
                  status_events: [died("2165-07", { event_id: knownEvent })],
                },
              ],
            }),
          );
          return corpus;
        })(),
      ),
    ).toThrow(
      /has date 2165-08, which must be identical to the death date 2165-07/,
    );
    expect(() =>
      prepareNarrativeCorpus(
        (() => {
          const corpus = withEvent();
          corpus.chapters.push(
            chapter("1.2", "2185-06", {
              updates: [
                {
                  entity_id: alex,
                  status_events: [
                    died("2185-04"),
                    restored("2185-06", { event_id: knownEvent }),
                  ],
                },
              ],
            }),
          );
          return corpus;
        })(),
      ),
    ).toThrow(/event_id is allowed only on died/);
  });

  it("rejects a later-read event dated before a previous one", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2185-06", {
          updates: [{ entity_id: alex, status_events: [died("2185-06")] }],
        }),
        chapter("1.3", "2185-08", {
          updates: [
            {
              entity_id: alex,
              status_events: [restored("2185-04")],
            },
          ],
        }),
      ]),
    ).toThrow(/is not after the previous event/);
  });

  it("rejects overlapping-precision dates that cannot be ordered", () => {
    // Repro: died 2185-06 then restored 2185 would otherwise be accepted via
    // chapter order and project as restored at a ceiling that hides the death.
    expect(() =>
      prepare([
        chapter("1.2", "2185-06", {
          updates: [{ entity_id: alex, status_events: [died("2185-06")] }],
        }),
        chapter("1.3", "2185-08", {
          updates: [{ entity_id: alex, status_events: [restored("2185")] }],
        }),
      ]),
    ).toThrow(/overlaps the previous event at 2185-06.*cannot be ordered/);
    expect(() =>
      prepare([
        chapter("1.2", "2185-08", {
          updates: [
            {
              entity_id: alex,
              status_events: [died("2185"), restored("2185-06")],
            },
          ],
        }),
      ]),
    ).toThrow(/overlaps the previous event at 2185.*cannot be ordered/);
  });

  it("accepts equal dates in chapter or array order", () => {
    expect(() =>
      prepare([
        chapter("1.2", "2185-06", {
          updates: [
            {
              entity_id: alex,
              status_events: [died("2185-06"), restored("2185-06")],
            },
          ],
        }),
      ]),
    ).not.toThrow();
    expect(() =>
      prepare([
        chapter("1.2", "2185-06", {
          updates: [{ entity_id: alex, status_events: [died("2185-06")] }],
        }),
        chapter("1.3", "2185-08", {
          updates: [{ entity_id: alex, status_events: [restored("2185-06")] }],
        }),
      ]),
    ).not.toThrow();
  });

  it("orders equal-date events from two writes in one chapter by write position", () => {
    // The corpus rejects two writes for one character in one chapter (no
    // second update; no update of a same-chapter introduction). Exercise the
    // status-event checks directly.
    const twoUpdates = chapter("1.2", "2185-06", {
      updates: [
        { entity_id: alex, status_events: [died("2185-06")] },
        { entity_id: alex, status_events: [restored("2185-06")] },
      ],
    });
    expect(() =>
      assertAccumulatedStatusEventsInChapter(twoUpdates),
    ).not.toThrow();
    const introThenUpdate = chapter("1.2", "2185-06", {
      introducing: [
        {
          id: kai,
          name: "Fixture Kai",
          species_id: human,
          status_events: [died("2185-06")],
        },
      ],
      updates: [{ entity_id: kai, status_events: [restored("2185-06")] }],
    });
    expect(() =>
      assertAccumulatedStatusEventsInChapter(introThenUpdate),
    ).not.toThrow();
  });

  it("rejects a same-date restore in the first update followed by a death in the second", () => {
    // Write order is not a kind reorder: a restore still requires a preceding died.
    const restoreThenDied = chapter("1.2", "2185-06", {
      updates: [
        { entity_id: alex, status_events: [restored("2185-06")] },
        { entity_id: alex, status_events: [died("2185-06")] },
      ],
    });
    expect(() =>
      assertAccumulatedStatusEventsInChapter(restoreThenDied),
    ).toThrow(/restored_from_backup is allowed only immediately after died/);
  });
});

describe("status event projection (ADR-0033)", () => {
  const prepared = prepare([
    chapter("1.2", "2185-04", {
      introducing: [
        {
          id: kai,
          name: "Fixture Kai",
          species_id: human,
          status_events: [died("2185-04")],
        },
      ],
      updates: [{ entity_id: alex, status_events: [died("2185-04")] }],
    }),
    chapter("1.3", "2185-06", {
      updates: [{ entity_id: alex, status_events: [restored("2185-06")] }],
    }),
  ]);

  function world(readThrough: string, softCeiling?: string) {
    return softCeiling
      ? generateNarrativeWorld(prepared, { readThrough, softCeiling })
      : generateNarrativeWorld(prepared, readThrough);
  }

  function status(
    readThrough: string,
    softCeiling: string | undefined,
    id: string,
  ) {
    return world(readThrough, softCeiling).entities.find(
      (entity) => entity.id === id,
    )?.status_event;
  }

  it("shows died at the death, restored after the return, and nothing before the death", () => {
    expect(status("1.3", "2185-03", alex)).toBeUndefined();
    expect(status("1.3", "2185-04", alex)).toEqual({
      date: "2185-04",
      kind: "died",
    });
    expect(status("1.3", "2185-06", alex)).toEqual({
      date: "2185-06",
      kind: "restored_from_backup",
    });
    expect(status("1.3", undefined, alex)).toEqual({
      date: "2185-06",
      kind: "restored_from_backup",
    });
  });

  it("does not apply an unread restore, even at a later soft ceiling", () => {
    expect(status("1.2", "2185-06", alex)).toEqual({
      date: "2185-04",
      kind: "died",
    });
    expect(status("1.1", "2185-06", alex)).toBeUndefined();
  });

  it("keeps two events from one write in array order at the same soft ceiling", () => {
    const oneWrite = prepare([
      chapter("1.2", "2185-06", {
        updates: [
          {
            entity_id: alex,
            status_events: [died("2185-04"), restored("2185-06")],
          },
        ],
      }),
    ]);
    const at = (softCeiling: string) =>
      generateNarrativeWorld(oneWrite, {
        readThrough: "1.2",
        softCeiling,
      }).entities.find((entity) => entity.id === alex)?.status_event;
    expect(at("2185-04")).toEqual({ date: "2185-04", kind: "died" });
    expect(at("2185-06")).toEqual({
      date: "2185-06",
      kind: "restored_from_backup",
    });
  });

  it("projects two equal-date writes in one chapter in chapter write order", () => {
    const twoWrites = chapter("1.2", "2185-06", {
      updates: [
        { entity_id: alex, status_events: [died("2185-06")] },
        { entity_id: alex, status_events: [restored("2185-06")] },
      ],
    });
    expect(
      projectedStatusEventFromChapterWrites(twoWrites, alex, "2185-06"),
    ).toEqual({
      date: "2185-06",
      kind: "restored_from_backup",
    });
  });

  it("stops projection at the first event not known at the ceiling", () => {
    // Repro: at read-through 1.3 with soft ceiling 2185-03, a year-dated
    // restore must not show while the preceding month-dated death is hidden.
    expect(
      projectedStatusEventAtCeiling(
        [died("2185-06"), restored("2185")],
        "2185-03",
      ),
    ).toBeUndefined();
    // On a comparable later restore, stop at the first unknown event rather
    // than skipping to a still-later known one (there is none here; the
    // restore itself is the cut).
    expect(
      projectedStatusEventAtCeiling(
        [died("2185-06"), restored("2186-01")],
        "2185-06",
      ),
    ).toEqual({ date: "2185-06", kind: "died" });
    expect(
      projectedStatusEventAtCeiling(
        [died("2185-06"), restored("2186-01")],
        "2186-01",
      ),
    ).toEqual({ date: "2186-01", kind: "restored_from_backup" });
  });

  it("does not treat authored status_events as a replacing soft-ceiling property", () => {
    expect(softCeilingProperties.has("status_events")).toBe(false);
    expect(softCeilingProperties.has("status_event")).toBe(false);
  });

  it("does not count status-event dates toward a chapter's latest date", () => {
    const record = chapter("1.2", "2185-04", {
      updates: [{ entity_id: alex, status_events: [died("2185-03")] }],
    });
    expect(chapterLatestDate(record)).toBe("2185-04");
  });
});

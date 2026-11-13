import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareNarrativeChapters,
  compareNarrativeDates,
  generateNarrativeWorld,
  meaningfulNarrativeDates,
  prepareNarrativeCorpus,
  preparedNarrativeChapters,
  type NarrativeRecord,
  type NarrativeWorld,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

// Meaning-level expectations: facts about the projected canonical world, written
// only as IDs, chapter refs and enum values (never book text). See
// docs/tasks/BOB-20261113-97Z771-meaning-regression-tests.md.
// A text field is pinned as `sha256:` plus the first 16 hex characters of the
// SHA-256 of its projected UTF-8 string, so the fixture holds no text; `unset`
// pins a field that must be absent (undefined or null). A boolean field is pinned
// as "true" or "false". Two kinds check the canonical chapter record itself rather
// than the projection: `effective_date` pins the backdating date of the chapter's
// write to `subject`, and `no_write` pins that the chapter does not write `field`
// of `subject` (ADR-0028).

const kinds = [
  "location",
  "visible",
  "not_visible",
  "field",
  "unset",
  "effective_date",
  "no_write",
] as const;
type Kind = (typeof kinds)[number];

interface Expectation {
  chapter: string;
  kind: Kind;
  subject: string;
  field?: string;
  expected?: string;
  basis: string;
}

const CHAPTER = /^[1-9][0-9]*\.[1-9][0-9]*$/;
const ID = /^[a-z_]+:[a-z0-9-]{1,64}$/;
const VALUE = /^[a-z0-9_:-]{1,72}$/;
const FIELD = /^[a-z_]{1,32}$/;
// A short label naming where the fact was confirmed; no quotes or prose.
const BASIS = /^[A-Za-z0-9 .:()-]{1,48}$/;
const KEYS = ["chapter", "kind", "subject", "field", "expected", "basis"];
const HASHED = /^sha256:[0-9a-f]{16}$/;

function shortHash(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16)}`;
}

/** Return the problems with raw fixture entries; empty when every entry is valid. */
function entryProblems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["fixture must be an array"];
  const problems: string[] = [];
  raw.forEach((entry: unknown, index) => {
    const at = `entry ${index}`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    const record = entry as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!KEYS.includes(key)) problems.push(`${at}: unknown key ${key}`);
    }
    const check = (key: string, pattern: RegExp, required: boolean) => {
      const value = record[key];
      if (value === undefined) {
        if (required) problems.push(`${at}: missing ${key}`);
      } else if (typeof value !== "string" || !pattern.test(value)) {
        problems.push(`${at}: ${key} is not a short ID-like string`);
      }
    };
    const kind = record.kind;
    if (!kinds.includes(kind as Kind)) problems.push(`${at}: unknown kind`);
    check("chapter", CHAPTER, true);
    check("subject", ID, true);
    check("basis", BASIS, true);
    check(
      "expected",
      VALUE,
      kind === "location" || kind === "field" || kind === "effective_date",
    );
    check(
      "field",
      FIELD,
      kind === "field" || kind === "unset" || kind === "no_write",
    );
    if (
      (kind === "visible" ||
        kind === "not_visible" ||
        kind === "unset" ||
        kind === "no_write") &&
      "expected" in record
    )
      problems.push(`${at}: ${kind} takes no expected value`);
  });
  return problems;
}

type WorldAt = (chapter: string | null) => NarrativeWorld;

function canonicalWorldAt(): WorldAt {
  if (!narrativeCorpus)
    throw new Error("Canonical narrative preparation failed.");
  const corpus = narrativeCorpus;
  const cache = new Map<string | null, NarrativeWorld>();
  return (chapter) => {
    let world = cache.get(chapter);
    if (!world) {
      world = generateNarrativeWorld(corpus, chapter);
      cache.set(chapter, world);
    }
    return world;
  };
}

/** The canonical chapter's introducing and update records for one entity. */
function chapterWrites(
  chapter: string,
  subject: string,
): Record<string, unknown>[] {
  if (!narrativeCorpus)
    throw new Error("Canonical narrative preparation failed.");
  const record = narrativeCorpus.chapters.find(
    (candidate) => String(candidate.chapter) === chapter,
  );
  if (!record) throw new Error(`No canonical chapter ${chapter}.`);
  const list = (key: string) =>
    (record[key] as Record<string, unknown>[] | undefined) ?? [];
  return [
    ...list("introducing").filter((write) => write.id === subject),
    ...list("updates").filter((write) => write.entity_id === subject),
  ];
}

/** Evaluate one expectation; return a failure message, or null when it holds. */
function evaluate(entry: Expectation, worldAt: WorldAt): string | null {
  const label = `${entry.chapter} / ${entry.kind} / ${entry.subject}`;
  if (entry.kind === "no_write" || entry.kind === "effective_date") {
    const writes = chapterWrites(entry.chapter, entry.subject);
    if (entry.kind === "no_write")
      return writes.some((write) => (entry.field ?? "") in write)
        ? `${label}: expected no ${entry.field} write, but the chapter writes it`
        : null;
    const dates = writes.map((write) => write.effective_date);
    return dates.includes(entry.expected)
      ? null
      : `${label}: expected effective_date ${entry.expected}, got ${dates.map(String).join(", ") || "no write"}`;
  }
  const entity = worldAt(entry.chapter).entities.find(
    (candidate) => candidate.id === entry.subject,
  );
  if (entry.kind === "not_visible")
    return entity ? `${label}: expected not visible, but it is` : null;
  if (!entity) return `${label}: expected visible, but it is not`;
  if (entry.kind === "visible") return null;
  const actual =
    entry.kind === "location"
      ? entity.last_known_location?.location_id
      : (entity as unknown as Record<string, unknown>)[entry.field ?? ""];
  if (entry.kind === "unset")
    return actual === undefined || actual === null
      ? null
      : `${label}: expected ${entry.field} unset, but it is set`;
  if (entry.expected !== undefined && HASHED.test(entry.expected)) {
    // Report only the hash, never the projected text.
    const got = typeof actual === "string" ? shortHash(actual) : typeof actual;
    return got === entry.expected
      ? null
      : `${label}: expected ${entry.expected}, got ${got}`;
  }
  const comparable = typeof actual === "boolean" ? String(actual) : actual;
  return comparable === entry.expected
    ? null
    : `${label}: expected ${entry.expected}, got ${String(actual)}`;
}

/** IDs introduced in a chapter that are already visible before it. */
function earlyVisibility(
  chapters: { chapter: string; introduced: string[] }[],
  worldAt: WorldAt,
): string[] {
  return chapters.flatMap(({ chapter, introduced }, index) => {
    const before = index === 0 ? null : chapters[index - 1].chapter;
    const visible = new Set(
      worldAt(before).entities.map((entity) => entity.id),
    );
    return introduced
      .filter((id) => visible.has(id))
      .map(
        (id) =>
          `${id} (introduced in ${chapter}) is visible at ${before ?? "zero state"}`,
      );
  });
}

// Reader order comes from the prepared index, not from the manifest's order.
function introductions(chapters: readonly NarrativeRecord[]) {
  return chapters.map((chapter) => ({
    chapter: String(chapter.chapter),
    introduced: ((chapter.introducing as { id?: unknown }[] | undefined) ?? [])
      .map((record) => record.id)
      .filter((id): id is string => typeof id === "string"),
  }));
}

function canonicalIntroductions() {
  if (!narrativeCorpus)
    throw new Error("Canonical narrative preparation failed.");
  return introductions(preparedNarrativeChapters(narrativeCorpus));
}

const fixture: unknown = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, "../fixtures/narrative-meaning.json"),
    "utf8",
  ),
);

// Late chapters take about two seconds each to project, so one cache serves every
// test and the slow tests get a longer timeout.
const worldAt = canonicalWorldAt();
const SLOW = 120_000;

describe("meaning-level expectations on the canonical narrative", () => {
  it("has a well-formed, ID-only fixture", () => {
    expect(entryProblems(fixture)).toEqual([]);
  });

  it(
    "holds every pinned fact",
    () => {
      expect((fixture as Expectation[]).length).toBeGreaterThan(0);
      const failures = (fixture as Expectation[])
        .map((entry) => evaluate(entry, worldAt))
        .filter((failure) => failure !== null);
      expect(failures).toEqual([]);
    },
    SLOW,
  );

  it(
    "never shows an introduced ID before its introducing chapter",
    () => {
      const chapters = canonicalIntroductions();
      expect(chapters.some(({ introduced }) => introduced.length > 0)).toBe(
        true,
      );
      expect(earlyVisibility(chapters, worldAt)).toEqual([]);
    },
    SLOW,
  );
});

describe("introduction order", () => {
  it(
    "follows reader order even when the input chapters are shuffled",
    () => {
      if (!narrativeCorpus)
        throw new Error("Canonical narrative preparation failed.");
      const reversed = prepareNarrativeCorpus({
        ...narrativeCorpus,
        chapters: [...narrativeCorpus.chapters].reverse(),
      });
      const order = introductions(preparedNarrativeChapters(reversed)).map(
        ({ chapter }) => chapter,
      );
      expect(order).toEqual(
        canonicalIntroductions().map(({ chapter }) => chapter),
      );
      expect(order).toEqual([...order].sort(compareNarrativeChapters));
      expect(order[0]).toBe("1.1");
    },
    SLOW,
  );
});

describe("Milo's backdated death (1.51, ADR-0028)", () => {
  // Date view is a story-date cutoff over the chapters read so far, so a fact
  // hidden at the latest meaningful date is hidden at every date, and one shown
  // at a date stays shown at every later date. Checking the boundary dates is
  // therefore enough; a sweep over every date takes minutes.
  const milo = "character:milo";
  const deathAt = (chapter: string, date: string | null) => {
    if (!narrativeCorpus)
      throw new Error("Canonical narrative preparation failed.");
    return generateNarrativeWorld(narrativeCorpus, chapter, date).entities.find(
      (entity) => entity.id === milo,
    )?.death_date;
  };
  const datesAt = (chapter: string) =>
    [...meaningfulNarrativeDates(narrativeCorpus!, chapter)].sort(
      (left, right) =>
        compareNarrativeDates(left, right) ?? left.localeCompare(right),
    );

  it(
    "is not visible at read-through 1.50 in chapter view or at any date",
    () => {
      expect(deathAt("1.50", null)).toBeUndefined();
      const dates = datesAt("1.50");
      const probes = [dates[0], dates.at(-1)!];
      if (dates.includes("2165-08")) probes.push("2165-08");
      for (const date of probes)
        expect(deathAt("1.50", date), date).toBeUndefined();
    },
    SLOW,
  );

  it(
    "is visible at 1.51 in chapter view, and in date view first at 2165-08",
    () => {
      expect(deathAt("1.51", null)).toBe("2165-08");
      const dates = datesAt("1.51");
      const at = dates.indexOf("2165-08");
      expect(at).toBeGreaterThan(0);
      expect(deathAt("1.51", dates[at - 1]), dates[at - 1]).toBeUndefined();
      expect(deathAt("1.51", "2165-08")).toBe("2165-08");
      expect(deathAt("1.51", dates.at(-1)!), dates.at(-1)).toBe("2165-08");
    },
    SLOW,
  );
});

describe("meaning-level checks catch breakage (synthetic entries)", () => {
  const wrong: [Expectation, string][] = [
    [
      {
        chapter: "1.43",
        kind: "location",
        subject: "character:homer",
        expected: "location:sol",
        basis: "synthetic",
      },
      "1.43 / location / character:homer: expected location:sol, got location:earth",
    ],
    [
      {
        chapter: "1.19",
        kind: "visible",
        subject: "character:homer",
        basis: "synthetic",
      },
      "1.19 / visible / character:homer: expected visible, but it is not",
    ],
    [
      {
        chapter: "1.20",
        kind: "not_visible",
        subject: "character:homer",
        basis: "synthetic",
      },
      "1.20 / not_visible / character:homer: expected not visible, but it is",
    ],
    [
      {
        chapter: "1.43",
        kind: "field",
        subject: "character:homer",
        field: "parent_id",
        expected: "character:bill",
        basis: "synthetic",
      },
      "1.43 / field / character:homer: expected character:bill, got character:riker",
    ],
    [
      {
        chapter: "1.43",
        kind: "unset",
        subject: "character:homer",
        field: "parent_id",
        basis: "synthetic",
      },
      "1.43 / unset / character:homer: expected parent_id unset, but it is set",
    ],
    [
      {
        chapter: "1.43",
        kind: "field",
        subject: "character:homer",
        field: "parent_id",
        expected: "sha256:0000000000000000",
        basis: "synthetic",
      },
      `1.43 / field / character:homer: expected sha256:0000000000000000, got ${shortHash("character:riker")}`,
    ],
    [
      {
        chapter: "1.51",
        kind: "effective_date",
        subject: "character:milo",
        expected: "2165-09",
        basis: "synthetic",
      },
      "1.51 / effective_date / character:milo: expected effective_date 2165-09, got 2165-08",
    ],
    [
      {
        chapter: "1.51",
        kind: "no_write",
        subject: "character:milo",
        field: "death_date",
        basis: "synthetic",
      },
      "1.51 / no_write / character:milo: expected no death_date write, but the chapter writes it",
    ],
    [
      {
        chapter: "1.51",
        kind: "field",
        subject: "location:82-eridani",
        field: "possible_colony_target",
        expected: "false",
        basis: "synthetic",
      },
      "1.51 / field / location:82-eridani: expected false, got true",
    ],
  ];

  it.each(wrong)(
    "fails a deliberately wrong entry (%#)",
    (entry, message) => {
      expect(evaluate(entry, worldAt)).toBe(message);
    },
    SLOW,
  );

  it("reports an ID that leaks before its introducing chapter", () => {
    const leaky: WorldAt = (chapter) => {
      const world = worldAt(chapter);
      return chapter === "1.19"
        ? {
            ...world,
            entities: [
              ...world.entities,
              { ...world.entities[0], id: "character:homer" },
            ],
          }
        : world;
    };
    expect(
      earlyVisibility(
        [
          { chapter: "1.19", introduced: [] },
          { chapter: "1.20", introduced: ["character:homer"] },
        ],
        leaky,
      ),
    ).toEqual(["character:homer (introduced in 1.20) is visible at 1.19"]);
  });

  it.each([
    [
      {
        chapter: "1.43",
        kind: "visible",
        subject: "character:homer",
        basis: 'He said "quoted words"',
      },
      "basis",
    ],
    [
      {
        chapter: "1.43",
        kind: "field",
        subject: "character:homer",
        expected: "x",
        basis: "ok",
      },
      "missing field",
    ],
    [
      {
        chapter: "1.43",
        kind: "location",
        subject: "character:homer",
        expected: "a long sentence of prose, not an ID",
        basis: "ok",
      },
      "expected",
    ],
    [
      {
        chapter: "1.43",
        kind: "summary",
        subject: "character:homer",
        basis: "ok",
      },
      "unknown kind",
    ],
    [
      {
        chapter: "1.43",
        kind: "visible",
        subject: "character:homer",
        basis: "ok",
        note: "x",
      },
      "unknown key note",
    ],
    [
      {
        chapter: "1.43",
        kind: "unset",
        subject: "character:homer",
        field: "parent_id",
        expected: "x",
        basis: "ok",
      },
      "unset takes no expected value",
    ],
    [
      {
        chapter: "1.51",
        kind: "no_write",
        subject: "character:milo",
        field: "death_date",
        expected: "x",
        basis: "ok",
      },
      "no_write takes no expected value",
    ],
    [
      {
        chapter: "1.51",
        kind: "effective_date",
        subject: "character:milo",
        basis: "ok",
      },
      "missing expected",
    ],
    [
      {
        chapter: "one",
        kind: "visible",
        subject: "character:homer",
        basis: "ok",
      },
      "chapter",
    ],
  ])("rejects a malformed entry (%#)", (entry, problem) => {
    expect(entryProblems([entry]).join("\n")).toContain(problem);
  });
});

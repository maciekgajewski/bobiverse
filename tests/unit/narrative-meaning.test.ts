import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareNarrativeChapters,
  generateNarrativeWorld,
  prepareNarrativeCorpus,
  preparedNarrativeChapters,
  type NarrativeRecord,
  type NarrativeWorld,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

// Meaning-level expectations: facts about the projected canonical world, written
// only as IDs, chapter refs and enum values (never book text). See
// docs/tasks/BOB-20261113-97Z771-meaning-regression-tests.md.

const kinds = ["location", "visible", "not_visible", "field"] as const;
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
    check("expected", VALUE, kind === "location" || kind === "field");
    check("field", FIELD, kind === "field");
    if ((kind === "visible" || kind === "not_visible") && "expected" in record)
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

/** Evaluate one expectation; return a failure message, or null when it holds. */
function evaluate(entry: Expectation, worldAt: WorldAt): string | null {
  const label = `${entry.chapter} / ${entry.kind} / ${entry.subject}`;
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
  return actual === entry.expected
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

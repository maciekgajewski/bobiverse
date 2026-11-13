import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { NarrativeRecord } from "../../src/narrative/model";
import {
  applySentencePreservationExceptions,
  findSentencePreservationViolations,
  formatSentencePreservationViolation,
  parseSentencePreservationExceptions,
  sentenceOpening,
  splitSentences,
} from "../../src/narrative/sentence-preservation";

// Every text here is synthetic. No book text is read or written.

function chapter(
  reference: string,
  date: string,
  updates: NarrativeRecord[],
  introducing: NarrativeRecord[] = [],
): NarrativeRecord {
  return { chapter: reference, date, introducing, updates };
}

const earlier = "A test probe. It carries two drills. Dr. Vance built it.";

describe("splitSentences", () => {
  it("splits at terminal punctuation followed by whitespace", () => {
    expect(splitSentences("One. Two!  Three?\nFour")).toEqual([
      "One.",
      "Two!",
      "Three?",
      "Four",
    ]);
  });

  it("keeps abbreviations, initials and decimals inside one sentence", () => {
    expect(
      splitSentences(
        "Dr. Vance and St. Clair met R. J. Smith of the U.S. navy at Mt. Erebus, e.g. at 99.9 percent power. It ended.",
      ),
    ).toEqual([
      "Dr. Vance and St. Clair met R. J. Smith of the U.S. navy at Mt. Erebus, e.g. at 99.9 percent power.",
      "It ended.",
    ]);
  });

  it("keeps closing quotes and brackets with their sentence", () => {
    expect(splitSentences('He said "go." (It went.) Done...')).toEqual([
      'He said "go."',
      "(It went.)",
      "Done...",
    ]);
  });

  it("collapses whitespace and drops empty pieces", () => {
    expect(splitSentences("  One   two.\n\n ")).toEqual(["One two."]);
  });
});

describe("findSentencePreservationViolations", () => {
  it("passes a write that keeps every earlier sentence and adds more", () => {
    expect(
      findSentencePreservationViolations([
        chapter(
          "1.1",
          "2100",
          [],
          [{ id: "technology:probe", description: earlier }],
        ),
        chapter("1.2", "2101", [
          {
            entity_id: "technology:probe",
            description: `${earlier} It was upgraded.`,
          },
        ]),
      ]),
    ).toEqual([]);
  });

  it("reports a dropped sentence with its index and pointer", () => {
    const violations = findSentencePreservationViolations([
      chapter(
        "1.1",
        "2100",
        [],
        [{ id: "technology:probe", description: earlier }],
      ),
      chapter("1.2", "2101", [
        {
          entity_id: "technology:probe",
          description: "A test probe. Dr. Vance built it.",
        },
      ]),
    ]);
    expect(violations).toEqual([
      {
        entityId: "technology:probe",
        field: "description",
        chapter: "1.2",
        pointer: "/updates/0/description",
        earlierChapter: "1.1",
        sentenceIndex: 1,
        sentenceCount: 3,
        sentence: "It carries two drills.",
      },
    ]);
    expect(formatSentencePreservationViolation(violations[0]!)).toBe(
      'Chapter 1.2 /updates/0/description: technology:probe.description drops sentence 2 of 3 of the earlier value from chapter 1.1 ("It carries two drills."). Keep that sentence verbatim, or add a reviewed exception with a reason to data/narrative/sentence-preservation-exceptions.json.',
    );
  });

  it("reports a reworded sentence", () => {
    const violations = findSentencePreservationViolations([
      chapter(
        "1.1",
        "2100",
        [],
        [{ id: "technology:probe", description: earlier }],
      ),
      chapter("1.2", "2101", [
        {
          entity_id: "technology:probe",
          description:
            "A test probe. It carries a pair of drills. Dr. Vance built it.",
        },
      ]),
    ]);
    expect(violations.map((violation) => violation.sentence)).toEqual([
      "It carries two drills.",
    ]);
  });

  it("does not split an abbreviation into a false failure", () => {
    expect(
      findSentencePreservationViolations([
        chapter("1.1", "2100", [
          {
            entity_id: "location:base",
            description: "Built by Dr. Vance at St. Clair.",
          },
        ]),
        chapter("1.2", "2101", [
          {
            entity_id: "location:base",
            description: "Built by Dr. Vance at St. Clair. It is 2.5 km wide.",
          },
        ]),
      ]),
    ).toEqual([]);
  });

  it("compares with the latest-read earlier chapter, whatever its date", () => {
    // 1.2 is dated later than 1.3, but chapter view before 1.3 shows 1.2's write.
    const violations = findSentencePreservationViolations([
      chapter("1.3", "2105", [
        { entity_id: "technology:probe", description: "A probe. Third." },
      ]),
      chapter("1.1", "2100", [
        { entity_id: "technology:probe", description: "A probe." },
      ]),
      chapter("1.2", "2110", [
        { entity_id: "technology:probe", description: "A probe. Second." },
      ]),
    ]);
    expect(violations).toMatchObject([
      { chapter: "1.3", earlierChapter: "1.2", sentence: "Second." },
    ]);
  });

  it("checks state only for a write not dated later than the earlier one", () => {
    const chapters = [
      chapter("1.1", "2170", [
        { entity_id: "location:moon", state: "Seeded. Promised transport." },
      ]),
      // Read later but dated earlier: it must keep 1.1's sentences.
      chapter("1.2", "2165", [
        { entity_id: "location:moon", state: "Surveyed." },
      ]),
      // Dated later: a new latest condition may replace the old one.
      chapter("1.3", "2180", [
        { entity_id: "location:moon", current_state: "x." },
        { entity_id: "location:moon", state: "Abandoned." },
      ]),
    ];
    expect(
      findSentencePreservationViolations(chapters).map(
        (violation) =>
          `${violation.chapter} ${violation.field} ${violation.sentence}`,
      ),
    ).toEqual(["1.2 state Seeded.", "1.2 state Promised transport."]);
  });

  it("ignores fields outside the checked prose fields", () => {
    expect(
      findSentencePreservationViolations([
        chapter("1.1", "2100", [
          { entity_id: "character:a", role: "Pilot. Engineer." },
        ]),
        chapter("1.2", "2101", [
          { entity_id: "character:a", role: "Captain." },
        ]),
      ]),
    ).toEqual([]);
  });
});

describe("sentence-preservation exceptions", () => {
  const violations = findSentencePreservationViolations([
    chapter("1.1", "2100", [
      { entity_id: "character:a", description: "Alive. Brave." },
    ]),
    chapter("1.2", "2101", [
      { entity_id: "character:a", description: "Dead." },
    ]),
  ]);

  it("excuses an opted-out write and reports unused entries", () => {
    expect(violations).toHaveLength(2);
    const exceptions = parseSentencePreservationExceptions({
      about: "synthetic",
      exceptions: [
        {
          chapter: "1.2",
          entity_id: "character:a",
          field: "description",
          reason: "Dies.",
        },
        {
          chapter: "1.9",
          entity_id: "character:a",
          field: "description",
          reason: "Stale.",
        },
      ],
    });
    const result = applySentencePreservationExceptions(violations, exceptions);
    expect(result.unexcused).toEqual([]);
    expect(result.unused).toEqual([exceptions[1]]);
  });

  it("leaves a write without an exception unexcused", () => {
    expect(
      applySentencePreservationExceptions(violations, []).unexcused,
    ).toHaveLength(2);
  });

  it.each([
    [{ exceptions: {} }, "exceptions must be an array"],
    [{ exceptions: [], extra: 1 }, "unknown key(s) extra"],
    [
      {
        exceptions: [
          { chapter: "1.2", entity_id: "character:a", field: "description" },
        ],
      },
      "must have exactly",
    ],
    [
      {
        exceptions: [
          {
            chapter: "1.2",
            entity_id: "character:a",
            field: "description",
            reason: " ",
          },
        ],
      },
      "reason must be a non-empty string",
    ],
    [
      {
        exceptions: [
          {
            chapter: "1.2",
            entity_id: "character:a",
            field: "role",
            reason: "r",
          },
        ],
      },
      "field must be one of",
    ],
    [
      {
        exceptions: [
          {
            chapter: "2",
            entity_id: "character:a",
            field: "state",
            reason: "r",
          },
        ],
      },
      "book.chapter form",
    ],
    [
      {
        exceptions: [
          {
            chapter: "1.2",
            entity_id: "character:a",
            field: "state",
            reason: "r",
          },
          {
            chapter: "1.2",
            entity_id: "character:a",
            field: "state",
            reason: "s",
          },
        ],
      },
      "duplicates an earlier entry",
    ],
  ])("rejects a malformed exceptions document %#", (document, message) => {
    expect(() => parseSentencePreservationExceptions(document)).toThrow(
      message,
    );
  });

  it("shortens a long sentence to its first eight words", () => {
    expect(
      sentenceOpening("one two three four five six seven eight nine ten."),
    ).toBe("one two three four five six seven eight …");
    expect(sentenceOpening("Short one.")).toBe("Short one.");
  });
});

describe("narrative:validate sentence preservation", () => {
  const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
  const exceptionsFile = "data/narrative/sentence-preservation-exceptions.json";

  it("fails a write without an exception and an exception that excuses nothing", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "bobiverse-sentences-"));
    try {
      const root = path.join(parent, "narrative");
      await cp(path.join(repositoryRoot, "data/narrative"), root, {
        recursive: true,
      });
      await cp(
        path.join(repositoryRoot, "data/presentation"),
        path.join(parent, "presentation"),
        { recursive: true },
      );
      const document = JSON.parse(
        await readFile(path.join(repositoryRoot, exceptionsFile), "utf8"),
      ) as { exceptions: Array<Record<string, string>> };
      const [removed] = document.exceptions.splice(0, 1);
      document.exceptions.push({
        chapter: "1.1",
        entity_id: "character:nobody",
        field: "description",
        reason: "synthetic stale entry",
      });
      await writeFile(
        path.join(root, "sentence-preservation-exceptions.json"),
        `${JSON.stringify(document, null, 2)}\n`,
      );
      const result = spawnSync(
        "./node_modules/.bin/tsx",
        ["scripts/narrative-cli.ts", "validate", "--root", root],
        { cwd: repositoryRoot, encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      const [book, number] = removed!.chapter!.split(".");
      expect(result.stderr).toMatch(
        new RegExp(
          `chapters/${book}/${number}\\.json:\\d+:\\d+: error: Chapter ${removed!.chapter!.replace(".", "\\.")} /\\w+/\\d+/${removed!.field}: ${removed!.entity_id}\\.${removed!.field} drops sentence \\d+ of \\d+ of the earlier value from chapter \\d+\\.\\d+ \\(".+"\\)`,
        ),
      );
      expect(result.stderr).toContain(
        "Sentence-preservation exception for chapter 1.1 character:nobody.description excuses nothing; remove it.",
      );
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  }, 60_000);
});

import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { NarrativeRecord } from "../../src/narrative/model";
import {
  applySentencePreservationExceptions,
  findSentencePreservationViolations,
  findUnusedSupersedesMarkers,
  formatSentencePreservationViolation,
  formatUnusedSupersedesMarker,
  parseSentencePreservationExceptions,
  sentenceOpening,
  splitSentences,
} from "../../src/narrative/sentence-preservation";
import { inlineLinksToPlainText } from "../../src/narrative/inline-links";

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

  it("splits after a possessive full stop, for both apostrophe forms", () => {
    expect(
      splitSentences(
        "The moon is probably related to Romulus's. Its local ecosystem is distinct.",
      ),
    ).toEqual([
      "The moon is probably related to Romulus's.",
      "Its local ecosystem is distinct.",
    ]);
    expect(
      splitSentences(
        "The moon is probably related to Romulus\u2019s. Its local ecosystem is distinct.",
      ),
    ).toEqual([
      "The moon is probably related to Romulus\u2019s.",
      "Its local ecosystem is distinct.",
    ]);
    expect(splitSentences("That is the Bobs'. They left.")).toEqual([
      "That is the Bobs'.",
      "They left.",
    ]);
    expect(splitSentences("That is the Bobs\u2019. They left.")).toEqual([
      "That is the Bobs\u2019.",
      "They left.",
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

  it("skips a state write dated earlier than the earlier-read one (non-linear chapter)", () => {
    // Like Bill: read at 2.6 but dated 2171-04, after a 2185-04 state from 1.60.
    // It is a snapshot of an earlier moment and must not carry the later facts.
    expect(
      findSentencePreservationViolations([
        chapter("1.60", "2185-04", [
          {
            entity_id: "character:pilot",
            current_state: "Commanding the fleet. Grieving a friend.",
          },
        ]),
        chapter("2.6", "2171-04", [
          { entity_id: "character:pilot", current_state: "Newly launched." },
        ]),
      ]),
    ).toEqual([]);
  });

  it("dates a write by its effective_date, as today", () => {
    const chapters = (effective: string) => [
      chapter("1.1", "2185-04", [
        { entity_id: "character:pilot", current_state: "Docked. Refitting." },
      ]),
      chapter("1.2", "2190", [
        {
          entity_id: "character:pilot",
          effective_date: effective,
          current_state: "Docked.",
        },
      ]),
    ];
    expect(findSentencePreservationViolations(chapters("2171-04"))).toEqual([]);
    expect(
      findSentencePreservationViolations(chapters("2185-04")),
    ).toMatchObject([
      { chapter: "1.2", earlierChapter: "1.1", sentence: "Refitting." },
    ]);
  });

  it("skips a state write dated later than the earlier-read one", () => {
    expect(
      findSentencePreservationViolations([
        chapter("1.1", "2170", [
          { entity_id: "location:moon", state: "Seeded. Promised transport." },
        ]),
        chapter("1.2", "2180", [
          { entity_id: "location:moon", current_state: "x." },
          { entity_id: "location:moon", state: "Abandoned." },
        ]),
      ]),
    ).toEqual([]);
  });

  it("lets a later-read write dated at its chapter replace a same-date state", () => {
    // Two chapters of the same month: the later-read write is the newer state,
    // as when the soft-ceiling projection breaks a date tie by reading order.
    expect(
      findSentencePreservationViolations([
        chapter("1.1", "2170", [
          { entity_id: "location:moon", state: "Seeded. Promised transport." },
        ]),
        chapter("1.2", "2170", [
          { entity_id: "location:moon", state: "Surveyed." },
        ]),
        chapter("1.3", "2170-05", [
          { entity_id: "location:moon", state: "Abandoned." },
        ]),
      ]),
    ).toEqual([]);
  });

  const backDated = (extra: NarrativeRecord = {}) => [
    chapter("1.1", "2016", [
      {
        entity_id: "character:pilot",
        current_state: "Missing after a crash. Search ongoing.",
      },
    ]),
    chapter("1.2", "2133", [
      {
        entity_id: "character:pilot",
        effective_date: "2016",
        current_state: "Dead.",
        ...extra,
      },
    ]),
  ];

  it("fails a back-dated write that drops a sentence of the same moment", () => {
    const violations = findSentencePreservationViolations(backDated());
    expect(
      violations.map(
        (violation) =>
          `${violation.chapter}<${violation.earlierChapter} ${violation.sentence}`,
      ),
    ).toEqual(["1.2<1.1 Missing after a crash.", "1.2<1.1 Search ongoing."]);
    expect(formatSentencePreservationViolation(violations[0]!)).toBe(
      'Chapter 1.2 /updates/0/current_state: character:pilot.current_state drops sentence 1 of 2 of the earlier value from chapter 1.1 ("Missing after a crash."). Keep that sentence verbatim, or, if this back-dated update replaces that state, add "supersedes": true to it.',
    );
  });

  it("passes a back-dated write marked supersedes, and uses its marker", () => {
    const chapters = backDated({ supersedes: true });
    expect(findSentencePreservationViolations(chapters)).toEqual([]);
    expect(findUnusedSupersedesMarkers(chapters)).toEqual([]);
  });

  it.each([
    [
      "the update is dated at its chapter",
      [
        chapter("1.1", "2016", [
          { entity_id: "character:pilot", current_state: "Missing. Hunted." },
        ]),
        chapter("1.2", "2016", [
          {
            entity_id: "character:pilot",
            current_state: "Dead.",
            supersedes: true,
          },
        ]),
      ],
    ],
    [
      "the back-dated update keeps every sentence",
      [
        chapter("1.1", "2016", [
          { entity_id: "character:pilot", current_state: "Missing." },
        ]),
        chapter("1.2", "2133", [
          {
            entity_id: "character:pilot",
            effective_date: "2016",
            current_state: "Missing. Later found dead.",
            supersedes: true,
          },
        ]),
      ],
    ],
    [
      "the update writes no state",
      [
        chapter("1.1", "2016", [
          { entity_id: "character:pilot", current_state: "Missing." },
        ]),
        chapter("1.2", "2133", [
          {
            entity_id: "character:pilot",
            effective_date: "2016",
            name: "Pilot",
            supersedes: true,
          },
        ]),
      ],
    ],
  ])(
    "reports a supersedes marker that excuses nothing: %s",
    (_case, chapters) => {
      const unused = findUnusedSupersedesMarkers(chapters);
      expect(unused).toEqual([
        {
          entityId: "character:pilot",
          chapter: "1.2",
          pointer: "/updates/0/supersedes",
        },
      ]);
      expect(formatUnusedSupersedesMarker(unused[0]!)).toMatch(
        /^Chapter 1\.2 \/updates\/0\/supersedes: character:pilot is marked "supersedes": true but replaces no earlier sentence\..*remove it\.$/,
      );
    },
  );

  it("never lets supersedes excuse a dropped description sentence", () => {
    const chapters = [
      chapter("1.1", "2016", [
        {
          entity_id: "character:pilot",
          description: "A pilot. Born on Earth.",
          current_state: "Missing.",
        },
      ]),
      chapter("1.2", "2133", [
        {
          entity_id: "character:pilot",
          effective_date: "2016",
          description: "A pilot.",
          current_state: "Dead.",
          supersedes: true,
        },
      ]),
    ];
    expect(findSentencePreservationViolations(chapters)).toMatchObject([
      { field: "description", sentence: "Born on Earth." },
    ]);
    expect(findUnusedSupersedesMarkers(chapters)).toEqual([]);
  });

  it.each([
    ["a year, then a month in it", "2185", "2185-04"],
    ["a month, then its year", "2185-04", "2185"],
  ])(
    "checks a back-dated write for overlapping dates of different precision: %s",
    (_case, first, second) => {
      expect(
        findSentencePreservationViolations([
          chapter("1.1", first, [
            { entity_id: "character:pilot", current_state: "Docked. Idle." },
          ]),
          chapter("1.2", "2190", [
            {
              entity_id: "character:pilot",
              effective_date: second,
              current_state: "Docked.",
            },
          ]),
        ]),
      ).toMatchObject([
        { chapter: "1.2", earlierChapter: "1.1", sentence: "Idle." },
      ]);
    },
  );

  it("compares a back-dated write with the latest-read write of an equal or overlapping date", () => {
    // 1.2 is read in between but dated later, so 1.3 is compared with 1.1, the
    // same moment. 1.4 (2185) overlaps both 1.1 and 1.3 and is compared with 1.3,
    // the latest-read one, which it preserves.
    const violations = findSentencePreservationViolations([
      chapter("1.1", "2185-04", [
        { entity_id: "character:pilot", current_state: "Docked. Idle." },
      ]),
      chapter("1.2", "2190", [
        { entity_id: "character:pilot", current_state: "Retired." },
      ]),
      chapter("1.3", "2191", [
        {
          entity_id: "character:pilot",
          effective_date: "2185-04",
          current_state: "Docked.",
        },
      ]),
      chapter("1.4", "2192", [
        {
          entity_id: "character:pilot",
          effective_date: "2185",
          current_state: "Docked. Quiet.",
        },
      ]),
    ]);
    expect(
      violations.map(
        (violation) =>
          `${violation.chapter}<${violation.earlierChapter} ${violation.sentence}`,
      ),
    ).toEqual(["1.3<1.1 Idle."]);
  });

  it("checks description and visual_description whatever the story dates", () => {
    const violations = findSentencePreservationViolations([
      chapter("1.1", "2185-04", [
        {
          entity_id: "location:base",
          description: "A base. Built early.",
          visual_description: "A red dome. Two hangars.",
        },
      ]),
      // Dated earlier, then later: both fields are fused from all reading.
      chapter("1.2", "2171-04", [
        {
          entity_id: "location:base",
          description: "A base.",
          visual_description: "A red dome. Two hangars.",
        },
      ]),
      chapter("1.3", "2190", [
        {
          entity_id: "location:base",
          description: "A base.",
          visual_description: "A red dome.",
        },
      ]),
    ]);
    expect(
      violations.map(
        (violation) =>
          `${violation.chapter}<${violation.earlierChapter} ${violation.field} ${violation.sentence}`,
      ),
    ).toEqual([
      "1.2<1.1 description Built early.",
      "1.3<1.2 visual_description Two hangars.",
    ]);
  });

  it("reports a dropped visual_description sentence", () => {
    const violations = findSentencePreservationViolations([
      chapter("1.1", "2100", [
        {
          entity_id: "location:base",
          visual_description: "A red dome. Two hangars.",
        },
      ]),
      chapter("1.2", "2101", [
        { entity_id: "location:base", visual_description: "A red dome." },
      ]),
    ]);
    expect(violations).toEqual([
      {
        entityId: "location:base",
        field: "visual_description",
        chapter: "1.2",
        pointer: "/updates/0/visual_description",
        earlierChapter: "1.1",
        sentenceIndex: 1,
        sentenceCount: 2,
        sentence: "Two hangars.",
      },
    ]);
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
            chapter: "1.2",
            entity_id: "character:a",
            field: "current_state",
            reason: "r",
          },
        ],
      },
      "field must be one of description, visual_description",
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
            field: "description",
            reason: "r",
          },
          {
            chapter: "1.2",
            entity_id: "character:a",
            field: "description",
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

describe("sentence preservation with inline entity links (ADR-0029)", () => {
  const plain = "A test probe. It flies to Testworld. Dr. Vance built it.";
  const write = (value: string) =>
    findSentencePreservationViolations(
      [
        chapter(
          "1.1",
          "2200",
          [],
          [{ id: "vessel:probe", description: plain }],
        ),
        chapter("1.2", "2201", [
          { entity_id: "vessel:probe", description: value },
        ]),
      ],
      {
        displayText: (text, reference) =>
          inlineLinksToPlainText(text, (target) =>
            target === "location:testworld" && reference === "1.2"
              ? "Testworld"
              : target,
          ),
      },
    );

  it("treats adding link markup around unchanged words as no change", () => {
    expect(
      write(
        "A test probe. It flies to [[location:testworld|Testworld]]. [[character:vance|Dr. Vance]] built it.",
      ),
    ).toEqual([]);
    expect(
      write(
        "A test probe. It flies to [[location:testworld]]. Dr. Vance built it.",
      ),
    ).toEqual([]);
  });

  it("still reports changed visible words, quoting the display text", () => {
    expect(
      write(
        "A test probe. It flies to [[location:testworld|the planet]]. Dr. Vance built it.",
      ),
    ).toMatchObject([
      { chapter: "1.2", sentenceIndex: 1, sentence: "It flies to Testworld." },
    ]);
  });

  it("compares display text on both sides by default", () => {
    expect(
      findSentencePreservationViolations([
        chapter(
          "1.1",
          "2200",
          [],
          [
            {
              id: "vessel:probe",
              description:
                "Built by [[character:vance|Vance]]. Tagged \\[[x\\]].",
            },
          ],
        ),
        chapter("1.2", "2201", [
          {
            entity_id: "vessel:probe",
            description: "Built by Vance. Tagged \\[[x\\]]. It flies.",
          },
        ]),
      ]),
    ).toEqual([]);
  });

  it("rejects link markup in an exception reason", () => {
    expect(() =>
      parseSentencePreservationExceptions({
        exceptions: [
          {
            chapter: "1.2",
            entity_id: "vessel:probe",
            field: "description",
            reason: "Condensed near [[location:testworld]].",
          },
        ],
      }),
    ).toThrow(
      "exceptions[0].reason must not contain inline entity link markup or escapes (ADR-0029).",
    );
  });
});

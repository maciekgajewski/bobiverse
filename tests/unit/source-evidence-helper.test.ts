import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const helper = path.join(
  repositoryRoot,
  ".codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py",
);
const skill = path.join(
  repositoryRoot,
  ".codex/skills/extract-bobiverse-chapter/SKILL.md",
);
const claimLedgerReference = path.join(
  repositoryRoot,
  ".codex/skills/extract-bobiverse-chapter/references/claim-ledger.md",
);
const blindBrief = path.join(
  repositoryRoot,
  ".codex/skills/extract-bobiverse-chapter/references/pass1-blind-brief.md",
);
const extractionContract = path.join(
  repositoryRoot,
  "docs/chapter-extraction.md",
);
const reconciliationExceptions = path.join(
  repositoryRoot,
  ".codex/skills/extract-bobiverse-chapter/references/reconciliation-exceptions.md",
);
const sourceText = "A short exact evidence phrase.\n";

let temporaryRoot: string;
let sourcePath: string;
let draftPath: string;
let outputPath: string;

beforeEach(async () => {
  temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "bobiverse-source-evidence-"),
  );
  sourcePath = path.join(temporaryRoot, "1.1.txt");
  draftPath = path.join(temporaryRoot, "draft.json");
  outputPath = path.join(temporaryRoot, "sealed.json");
  await writeFile(sourcePath, sourceText);
});

afterEach(async () => {
  await rm(temporaryRoot, { recursive: true, force: true });
});

function draftLedger(additionalFields: Record<string, unknown> = {}) {
  return {
    chapter: "1.1",
    source_sha256: createHash("sha256").update(sourceText).digest("hex"),
    ...additionalFields,
    claims: [
      {
        claim_id: "claim:001",
        claim_type: "event",
        statement: "The evidence phrase appears.",
        confidence: "high",
        evidence: [{ quote: "short exact evidence phrase" }],
      },
    ],
  };
}

function seal() {
  return spawnSync(
    "python3",
    [
      helper,
      "seal",
      "--chapter",
      "1.1",
      "--source",
      sourcePath,
      "--draft",
      draftPath,
      "--output",
      outputPath,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
}

describe("source evidence sealing", () => {
  it("keeps trusted sealed metadata authoritative", async () => {
    await writeFile(draftPath, JSON.stringify(draftLedger()));

    const result = seal();

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toMatchObject({
      format_version: 1,
      sealed: true,
      source: {
        chapter: "1.1",
        source_file: "1.1.txt",
      },
    });
  });

  it("rejects model-supplied sealed envelope fields", async () => {
    await writeFile(
      draftPath,
      JSON.stringify(
        draftLedger({
          format_version: 99,
          sealed: false,
          source: { source_sha256: "forged" },
        }),
      ),
    );

    const result = seal();

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(
      "reserved sealed fields: format_version, sealed, source",
    );
  });
});

describe("blind Pass 1 boundary", () => {
  it("keeps the pinned Codex orchestration contract in the adapter", async () => {
    const adapter = await readFile(skill, "utf8");
    const compactAdapter = adapter.replace(/\s+/g, " ");

    expect(compactAdapter).toContain(
      "Pass 1 must therefore run in a fresh isolated Codex context.",
    );
    expect(compactAdapter).toContain(
      "For both passes, explicitly set `model: gpt-5.6-terra`, `reasoning_effort: high`, and `fork_turns: none`.",
    );
    expect(compactAdapter).toContain(
      "Never inherit the model, reasoning level, or conversation turns from the orchestrator.",
    );
    expect(compactAdapter).toContain(
      "Stage Pass 2 only with the sealed Pass 1 ledger and the canonical material permitted under `Pass 2: reconcile with prior state`.",
    );
    expect(adapter).toContain("## Pass 2: reconcile with prior state");
    expect(compactAdapter).toContain(
      "If GPT-5.6 Terra, high reasoning, or explicit non-forked spawning is unavailable for either pass, stop and ask the Captain before substituting another configuration.",
    );
    expect(compactAdapter).toContain(
      "- requested model, reasoning, and fork configuration for Pass 1 and Pass 2;",
    );
    expect(compactAdapter).toContain(
      "Stage Pass 1 with exactly `references/pass1-blind-brief.md`, `references/claim-ledger.md`, the source file, and `scripts/source_evidence.py` as a tool.",
    );
    expect(compactAdapter).toContain(
      "read `references/reconciliation-exceptions.md`",
    );
    expect(adapter).not.toContain("GPT-5.6 Sol");
    expect(adapter).not.toContain("Bob uses it to");
    for (const pilotFact of ["Robert", "Las Vegas", "Bob Version"]) {
      expect(adapter).not.toContain(pilotFact);
    }
  });

  it("states the reconciliation rules once in the authoritative contract", async () => {
    const compactContract = (
      await readFile(extractionContract, "utf8")
    ).replace(/\s+/g, " ");

    for (const rule of [
      "Do not stage the narrative schema, canonical corpus",
      "Reserve `megastructure` for an engineered structure exceptional in physical scale",
      "Do not introduce an incidental, unnamed, short-lived, or otherwise disposable place",
      "use the nearest supported reader-visible parent",
      "author every `current_state` as one or two concise sentences",
      "state capabilities in general language",
      "`vessel`: what named ship, reusable design, or ship family it represents",
      "omit every disclosure-gap statement from descriptions",
      "Missing knowledge belongs in reconciliation and human-review artifacts",
      "querying an interface for documentation",
      "Do not apply an importance or curation threshold.",
      "Each qualifying canonical `mentions` entry is mandatory",
      "every resolved source mention, its stable ID when resolved, structural-redundancy decision, classification, and sealed evidence ID",
      "Author every surveyed planet or dwarf planet as a location",
      "`surface_gravity_g = surface_gravity_m_s2 / 9.80665`",
      "Count-only children are `Moon 1` through `Moon 4`",
      "Treat numbering and child order as decorative inventory, not physical orbital order or distance.",
      "character `species_id`, `death_event_id`, and `parent_id`, species `homeworld_id`",
      "the character state or backup from which the child was copied",
      "Description updates replace the complete field. Preserve useful prior reviewed knowledge and integrate the newly revealed information rather than emitting only the latest chapter fact.",
      "If the conforming profile, or any part of it, is unavailable for either pass, stop and ask the Captain before substituting another configuration.",
    ]) {
      expect(compactContract).toContain(rule);
    }
    expect(compactContract).not.toContain(
      "State the gap naturally in reader-facing prose",
    );
    expect(compactContract).not.toContain(
      "Pass 2 may then author a partial description that says so",
    );
  });

  it("stages only facts-free blind materials", async () => {
    const blindMaterials = [
      await readFile(blindBrief, "utf8"),
      await readFile(claimLedgerReference, "utf8"),
    ].join("\n");
    const compactBlindMaterials = blindMaterials.replace(/\s+/g, " ");

    expect(blindMaterials).toContain("source_mentions");
    expect(blindMaterials).not.toContain('"mentions": [');
    expect(compactBlindMaterials).toContain(
      "You run in a fresh context that has not seen canonical narrative state.",
    );
    expect(compactBlindMaterials).toContain(
      "a complete body inventory plus separate aggregate, class, colour, visible/surface, gravity, moon-occurrence, and other descriptive claims",
    );
    expect(compactBlindMaterials).toContain(
      "Record the source value and unit for numeric gravity rather than converting it in the sealed ledger.",
    );
    expect(blindMaterials).not.toContain("personal-time adjustment");
    expect(blindMaterials).not.toContain("Bob uses it to");
    expect(blindMaterials).not.toContain(
      "State the gap naturally in reader-facing prose",
    );
    for (const pilotFact of ["Robert", "Las Vegas", "Bob Version"]) {
      expect(blindMaterials).not.toContain(pilotFact);
    }

    // The alias "Will" makes a sentence-initial modal a leak; keep the brief free of it.
    expect(blindMaterials).not.toMatch(/(?:^|[.!?:]\s+)Will\b/m);

    const forbidden = await chapterSpecificTokens();
    const leaked = [...forbidden].filter((token) =>
      wholeToken(token).test(blindMaterials),
    );
    expect(leaked).toEqual([]);
  });

  it("matches leak tokens as whole, case-sensitive words", () => {
    expect(wholeToken("Will").test("Will this recur?")).toBe(true);
    expect(wholeToken("Will").test("it will be recorded")).toBe(false);
    expect(wholeToken("Will").test("Willing")).toBe(false);
    expect(wholeToken("natives").test("alternatives")).toBe(false);
    expect(wholeToken("nanites").test("the nanites.")).toBe(true);
    expect(wholeToken("asteroid belt").test("asteroid belts")).toBe(false);
    expect(wholeToken("1.1").test("chapter 1.12")).toBe(false);
    expect(wholeToken("1.1").test("chapter 1.1.")).toBe(true);
  });

  it("documents direct Earth-gravity retention and bounded SI conversion", async () => {
    const extractionGuide = await readFile(
      path.join(repositoryRoot, "docs/chapter-extraction.md"),
      "utf8",
    );

    expect(extractionGuide).toContain(
      "direct `1.20 g` becomes `surface_gravity_g: 1.20`",
    );
    expect(extractionGuide).toContain(
      "`19.6 m/s² / 9.80665` becomes `surface_gravity_g: 2.00`",
    );
  });
});

describe("reviewed Pass 2 corrections", () => {
  it("pins immutable-ledger corrections to complete fingerprints", async () => {
    const exceptions = await readFile(reconciliationExceptions, "utf8");

    expect(exceptions).toContain("Chapter: `1.12`");
    expect(exceptions).toContain(
      "db175c854075f6d104ea3c89e755e43d810d1f0bee6cf75402ab81c59b10b3ee",
    );
    expect(exceptions).toContain(
      "5dc73600f60241dc4f149fddbdc4506291ef084b92b6ed466b4856c4ec2d019c",
    );
    expect(exceptions).toContain("Claim ID: `claim:019`");
    expect(exceptions).toContain(
      "do not update `technology:guppi-interface` from this claim",
    );
  });
});

async function readJsonFile(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

function collectIds(value: unknown, into: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, into);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "id" && typeof item === "string") into.add(item);
      collectIds(item, into);
    }
  }
}

function addNames(records: unknown, into: Set<string>) {
  if (!Array.isArray(records)) return;
  for (const record of records as Record<string, unknown>[]) {
    if (typeof record.name === "string") into.add(record.name);
    if (Array.isArray(record.aliases)) {
      for (const alias of record.aliases) {
        if (typeof alias === "string") into.add(alias);
      }
    }
  }
}

// Chapter-specific facts for the blind boundary: canonical chapter references,
// canonical entity IDs, and names or aliases introduced or set by any chapter.
// Zero-state names (for example Earth, Moon, and AMI) are deliberately not caught:
// they are the pre-book baseline, not chapter facts. Matching is whole-token and
// case-sensitive, so ordinary lowercase prose such as "will" or "alternatives"
// does not collide with chapter names such as "Will" or "natives".
async function chapterSpecificTokens(): Promise<Set<string>> {
  const narrativeRoot = path.join(repositoryRoot, "data/narrative");
  const tokens = new Set<string>();
  collectIds(
    await readJsonFile(path.join(narrativeRoot, "baseline/zero-state.json")),
    tokens,
  );
  const chaptersRoot = path.join(narrativeRoot, "chapters");
  for (const book of await readdir(chaptersRoot)) {
    for (const file of await readdir(path.join(chaptersRoot, book))) {
      if (!file.endsWith(".json")) continue;
      tokens.add(`${book}.${path.basename(file, ".json")}`);
      const chapter = (await readJsonFile(
        path.join(chaptersRoot, book, file),
      )) as Record<string, unknown>;
      collectIds(chapter, tokens);
      addNames(chapter.introducing, tokens);
      addNames(chapter.updates, tokens);
    }
  }
  return tokens;
}

function wholeToken(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w.:-])${escaped}(?![\\w:-]|\\.\\w)`);
}

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function git(cwd: string, ...args: string[]) {
  const result = spawnSync(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", ...args],
    { cwd, encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

describe("temporary corpus preparation", () => {
  let fixtureRepository: string;
  let candidatePath: string;

  beforeEach(async () => {
    fixtureRepository = path.join(temporaryRoot, "repository");
    const narrative = path.join(fixtureRepository, "data/narrative");
    await writeJson(path.join(narrative, "baseline/zero-state.json"), {
      zero: true,
    });
    await writeJson(path.join(narrative, "assets.json"), { assets: [] });
    await writeJson(path.join(narrative, "books.json"), { books: [] });
    await writeJson(path.join(narrative, "chapters/1/1.json"), {
      chapter: "1.1",
    });
    await writeJson(path.join(narrative, "chapters/1/3.json"), {
      chapter: "1.3",
    });
    await writeJson(
      path.join(fixtureRepository, "data/presentation/species.json"),
      { species: [] },
    );
    git(fixtureRepository, "init", "-q");
    git(fixtureRepository, "add", ".");
    git(fixtureRepository, "commit", "-q", "-m", "fixture");
    candidatePath = path.join(temporaryRoot, "candidate.json");
    await writeJson(candidatePath, { chapter: "1.2" });
  });

  function prepare(outputRoot: string) {
    return spawnSync(
      "python3",
      [
        helper,
        "prepare-corpus",
        "--repository-root",
        fixtureRepository,
        "--chapter",
        "1.2",
        "--candidate",
        candidatePath,
        "--output-root",
        outputRoot,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
  }

  it("stages the species presentation registry and reports provenance", async () => {
    const outputRoot = path.join(temporaryRoot, "corpus");

    const result = prepare(outputRoot);

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.prior_chapters).toEqual(["1.1"]);
    const presentation = await readFile(
      path.join(outputRoot, "presentation/species.json"),
      "utf8",
    );
    expect(JSON.parse(presentation)).toEqual({ species: [] });
    expect(report.provenance.base_commit).toBe(
      git(fixtureRepository, "rev-parse", "HEAD"),
    );
    expect(report.provenance.inputs_clean).toBe(true);
    expect(report.provenance.dirty_paths).toEqual([]);
    const files = Object.fromEntries(
      report.provenance.files.map(
        (file: { path: string; source: string; sha256: string }) => [
          file.path,
          file,
        ],
      ),
    );
    expect(Object.keys(files).sort()).toEqual([
      "assets.json",
      "baseline/zero-state.json",
      "books.json",
      "chapters/1/1.json",
      "presentation/species.json",
    ]);
    expect(files["presentation/species.json"]).toEqual({
      path: "presentation/species.json",
      source: "data/presentation/species.json",
      sha256: sha256(presentation),
    });
    expect(report.provenance.candidate).toEqual({
      path: "chapters/1/2.json",
      source: candidatePath,
      sha256: sha256(await readFile(candidatePath, "utf8")),
    });
  });

  it("reports unclean canonical inputs instead of hiding them", async () => {
    await writeJson(
      path.join(fixtureRepository, "data/narrative/chapters/1/1.json"),
      { chapter: "1.1", edited: true },
    );

    const result = prepare(path.join(temporaryRoot, "corpus"));

    expect(result.status, result.stderr).toBe(0);
    const { provenance } = JSON.parse(result.stdout);
    expect(provenance.inputs_clean).toBe(false);
    expect(provenance.dirty_paths).toEqual([
      "data/narrative/chapters/1/1.json",
    ]);
  });

  it("reports renamed and unusually named inputs verbatim", async () => {
    git(
      fixtureRepository,
      "mv",
      "data/narrative/chapters/1/3.json",
      "data/narrative/chapters/1/3 later.json",
    );
    await writeFile(
      path.join(fixtureRepository, "data/narrative/naïve note.txt"),
      "",
    );
    // Linux permits a newline in a file name; only NUL-separated output keeps it.
    await writeFile(
      path.join(fixtureRepository, "data/narrative/line\nbreak.txt"),
      "",
    );

    const result = prepare(path.join(temporaryRoot, "corpus"));

    expect(result.status, result.stderr).toBe(0);
    const { provenance } = JSON.parse(result.stdout);
    expect(provenance.inputs_clean).toBe(false);
    expect(provenance.dirty_paths).toEqual([
      "data/narrative/chapters/1/3 later.json",
      "data/narrative/chapters/1/3.json",
      "data/narrative/line\nbreak.txt",
      "data/narrative/naïve note.txt",
    ]);
  });

  it("refuses a root named narrative", () => {
    const result = prepare(path.join(temporaryRoot, "narrative"));

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('must not be named "narrative"');
  });
});

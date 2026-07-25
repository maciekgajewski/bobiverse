import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  it("requires fresh isolation without preloading pilot facts", async () => {
    const blindMaterials = [
      await readFile(skill, "utf8"),
      await readFile(claimLedgerReference, "utf8"),
    ].join("\n");

    expect(blindMaterials).toContain(
      "Always run Pass 1 in a fresh isolated Codex context.",
    );
    expect(blindMaterials).toContain(
      "Do not stage the narrative schema, canonical corpus",
    );
    for (const pilotFact of ["Robert", "Las Vegas", "Bob Version"]) {
      expect(blindMaterials).not.toContain(pilotFact);
    }
  });
});

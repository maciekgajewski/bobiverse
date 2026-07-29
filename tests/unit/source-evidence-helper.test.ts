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
  it("requires fresh isolation without preloading pilot facts", async () => {
    const blindMaterials = [
      await readFile(skill, "utf8"),
      await readFile(claimLedgerReference, "utf8"),
    ].join("\n");
    const compactBlindMaterials = blindMaterials.replace(/\s+/g, " ");

    expect(compactBlindMaterials).toContain(
      "Pass 1 must therefore run in a fresh isolated Codex context.",
    );
    expect(compactBlindMaterials).toContain(
      "For both passes, explicitly set `model: gpt-5.6-terra`, `reasoning_effort: high`, and `fork_turns: none`.",
    );
    expect(compactBlindMaterials).toContain(
      "Never inherit the model, reasoning level, or conversation turns from the orchestrator.",
    );
    expect(compactBlindMaterials).toContain(
      "Stage Pass 2 only with the sealed Pass 1 ledger and the canonical material permitted under `Pass 2: reconcile with prior state`.",
    );
    expect(compactBlindMaterials).toContain(
      "If GPT-5.6 Terra, high reasoning, or explicit non-forked spawning is unavailable for either pass, stop and ask the Captain before substituting another configuration.",
    );
    expect(compactBlindMaterials).toContain(
      "- requested model, reasoning, and fork configuration for Pass 1 and Pass 2;",
    );
    expect(blindMaterials).not.toContain("GPT-5.6 Sol");
    expect(blindMaterials).toContain("source_mentions");
    expect(blindMaterials).not.toContain('"mentions": [');
    expect(blindMaterials).toContain(
      "Do not stage the narrative schema, canonical corpus",
    );
    expect(compactBlindMaterials).toContain(
      "Reserve `megastructure` for an engineered structure exceptional in physical scale",
    );
    expect(compactBlindMaterials).toContain(
      "Do not introduce an incidental, unnamed, short-lived, or otherwise disposable place",
    );
    expect(compactBlindMaterials).toContain(
      "use the nearest supported reader-visible parent",
    );
    expect(compactBlindMaterials).toContain(
      "author every `current_state` as one or two concise sentences",
    );
    expect(compactBlindMaterials).toContain(
      "state capabilities in general language",
    );
    expect(compactBlindMaterials).toContain(
      "`vessel`: what named ship, reusable design, or ship family it represents",
    );
    expect(compactBlindMaterials).toContain(
      "omit every disclosure-gap statement from descriptions",
    );
    expect(compactBlindMaterials).toContain(
      "Missing knowledge belongs in reconciliation and human-review artifacts",
    );
    expect(compactBlindMaterials).toContain(
      "querying an interface for documentation",
    );
    expect(compactBlindMaterials).toContain(
      "Do not apply an importance or curation threshold.",
    );
    expect(compactBlindMaterials).toContain(
      "Each qualifying canonical `mentions` entry is mandatory",
    );
    expect(compactBlindMaterials).toContain(
      "every resolved source mention, its stable ID when resolved, structural-redundancy decision, classification, and sealed evidence ID",
    );
    expect(compactBlindMaterials).toContain(
      "character `species_id` and `death_event_id`, species `homeworld_id`",
    );
    expect(compactBlindMaterials).toContain(
      "read `references/reconciliation-exceptions.md`",
    );
    expect(blindMaterials).not.toContain("personal-time adjustment");
    expect(blindMaterials).not.toContain(
      "State the gap naturally in reader-facing prose",
    );
    expect(blindMaterials).not.toContain(
      "Pass 2 may then author a partial description that says so",
    );
    for (const pilotFact of ["Robert", "Las Vegas", "Bob Version"]) {
      expect(blindMaterials).not.toContain(pilotFact);
    }
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

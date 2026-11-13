import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Every fixture here is synthetic. The preflight never reads book text in tests.
const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const preflight = path.join(repositoryRoot, "scripts/extraction_preflight.py");
const skillDirectory = path.join(
  repositoryRoot,
  ".codex/skills/extract-bobiverse-chapter",
);
const profileRecordPath = path.join(skillDirectory, "profile.json");
const syntheticMarker = "SYNTHETIC-FIXTURE-BYTES-never-in-output";
const uncoveredAnchor =
  "Narrative anchors require a GCNS acquisition plan not covered by the pinned sources";
const python = spawnSync(
  "python3",
  ["-c", "import sys; print(sys.executable)"],
  { encoding: "utf8" },
).stdout.trim();

interface Item {
  item: number;
  name: string;
  result: string;
  evidence: Record<string, unknown>;
  governing: string[];
  limits: string[];
}

interface Report {
  target_chapter: string;
  base_revision: string | null;
  verdict: string;
  items: Item[];
  manual_items: { item: number }[];
  limits: string[];
  profile_record: { path: string; sha256: string; schema_version: number };
}

let fixture: string;
let repository: string;
let fakeBin: string;
let approved: string;
let workspace: string;
let home: string;
let validatorLog: string;

function write(file: string, content: string, mode?: number) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  if (mode !== undefined) chmodSync(file, mode);
}

function writeJson(file: string, value: unknown) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
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

function buildRepository(chapters: string[]) {
  const narrative = path.join(repository, "data/narrative");
  writeJson(path.join(narrative, "baseline/zero-state.json"), { zero: true });
  writeJson(path.join(narrative, "assets.json"), { assets: [] });
  writeJson(path.join(narrative, "books.json"), { books: {} });
  for (const chapter of chapters) {
    const [book, number] = chapter.split(".");
    writeJson(path.join(narrative, `chapters/${book}/${number}.json`), {
      chapter,
    });
  }
  writeJson(path.join(repository, "data/presentation/species.json"), {
    species: [],
  });
  write(path.join(repository, ".gitignore"), "node_modules/\n.venv/\n");
  // The preflight refuses any checkout but its own, so the fixture carries a copy.
  for (const file of [
    "scripts/extraction_preflight.py",
    ".codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py",
    ".codex/skills/extract-bobiverse-chapter/profile.json",
  ]) {
    write(
      path.join(repository, file),
      readFileSync(path.join(repositoryRoot, file), "utf8"),
    );
  }
  write(
    path.join(repository, "node_modules/.bin/tsx"),
    [
      "#!/bin/sh",
      'echo "tsx $*" >> "$PREFLIGHT_FAKE_LOG"',
      'if [ -n "$FAKE_NARRATIVE_FAIL" ]; then echo "fixture narrative error" >&2; exit 1; fi',
      'echo "Validated fixture narrative"',
      "",
    ].join("\n"),
    0o755,
  );
  write(
    path.join(repository, ".venv/bin/python"),
    [
      "#!/bin/sh",
      'echo "python $*" >> "$PREFLIGHT_FAKE_LOG"',
      'case "$FAKE_DATA" in',
      `  uncovered) echo "ValueError: ${uncoveredAnchor}" >&2; exit 1;;`,
      '  baseline) echo "ValueError: fixture baseline failure" >&2; exit 1;;',
      "esac",
      'echo "Validated fixture astronomy"',
      "",
    ].join("\n"),
    0o755,
  );
  git(repository, "init", "-q");
  git(repository, "add", ".");
  git(repository, "commit", "-q", "-m", "fixture");
}

function writeSource(name: string): string {
  const source = path.join(fixture, "sources", name);
  write(source, `${syntheticMarker}\nSynthetic fixture line.\n`);
  return source;
}

function approvalFile(overrides: Record<string, unknown> = {}): string {
  const file = path.join(fixture, "approval.json");
  writeJson(file, {
    chapter: "1.3",
    date: "2026-11-13",
    label: "NON-CONFORMING",
    provider: "Fixture provider",
    model: "fixture-model",
    workflow: "Fixture workflow wording",
    captain_approval_quote: "Fixture approval quote",
    relaying_role: "Manager bot",
    ...overrides,
  });
  return file;
}

function runPreflight(
  options: {
    chapter?: string;
    source?: string;
    workspace?: string;
    approved?: string | null;
    extra?: string[];
    env?: Record<string, string>;
    cwd?: string;
    script?: string;
  } = {},
) {
  const chapter = options.chapter ?? "1.3";
  const args = [
    options.script ?? path.join(repository, "scripts/extraction_preflight.py"),
    "--chapter",
    chapter,
    "--source",
    options.source ?? writeSource(`${chapter} - Synthetic Title.txt`),
    "--workspace",
    options.workspace ?? workspace,
  ];
  if (options.approved !== null) {
    args.push("--approved-chapters", options.approved ?? approved);
  }
  args.push(...(options.extra ?? []));
  const result = spawnSync(python, args, {
    cwd: options.cwd ?? repository,
    encoding: "utf8",
    env: {
      PATH: [fakeBin, path.dirname(python), "/usr/bin", "/bin"].join(":"),
      HOME: home,
      LANG: "C.UTF-8",
      PREFLIGHT_FAKE_LOG: validatorLog,
      ...options.env,
    },
  });
  const report = result.stdout.trim().startsWith("{")
    ? (JSON.parse(result.stdout) as Report)
    : undefined;
  return { ...result, report };
}

function itemOf(report: Report | undefined, number: number): Item {
  const found = report?.items.find((entry) => entry.item === number);
  expect(found, `item ${number}`).toBeDefined();
  return found as Item;
}

function failedItems(report: Report | undefined): number[] {
  return (report?.items ?? [])
    .filter((entry) => entry.result !== "pass")
    .map((entry) => entry.item);
}

beforeEach(() => {
  // Workspaces must resolve under /tmp (Checklist A item 3), so fixtures live there.
  fixture = mkdtempSync("/tmp/bobiverse-preflight-");
  repository = path.join(fixture, "repository");
  fakeBin = path.join(fixture, "bin");
  approved = path.join(fixture, "approved");
  home = path.join(fixture, "home");
  validatorLog = path.join(fixture, "validators.log");
  workspace = mkdtempSync("/tmp/bobiverse-preflight-workspace-");
  write(validatorLog, "");
  write(
    path.join(fakeBin, "node"),
    '#!/bin/sh\necho "${FAKE_NODE_VERSION:-v22.23.1}"\n',
    0o755,
  );
  write(
    path.join(fakeBin, "codex"),
    '#!/bin/sh\necho "codex-cli 0.0.0-fixture"\n',
    0o755,
  );
  mkdirSync(approved, { recursive: true });
  git(approved, "init", "-q");
  mkdirSync(home, { recursive: true });
  buildRepository(["1.1", "1.2"]);
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
  rmSync(workspace, { recursive: true, force: true });
});

describe("execution profile record", () => {
  const record = JSON.parse(readFileSync(profileRecordPath, "utf8")) as {
    schema_version: number;
    decision: string;
    launcher: string;
    passes: string[];
    separate_spawns: boolean;
    inherit_from_orchestrator: boolean;
    spawn: Record<string, string>;
  };

  it("lists exactly the BOB-028 fields and no alternative profile", () => {
    expect(Object.keys(record).sort()).toEqual(
      [
        "decision",
        "inherit_from_orchestrator",
        "launcher",
        "passes",
        "profile",
        "schema_version",
        "separate_spawns",
        "source_of_truth",
        "spawn",
      ].sort(),
    );
    expect(record.schema_version).toBe(1);
    expect(record.decision).toBe("BOB-028");
    expect(record.launcher).toBe("codex");
    expect(record.passes).toEqual(["pass1", "pass2"]);
    expect(record.separate_spawns).toBe(true);
    expect(record.inherit_from_orchestrator).toBe(false);
    expect(Object.keys(record.spawn).sort()).toEqual([
      "fork_turns",
      "model",
      "reasoning_effort",
    ]);
    expect(JSON.stringify(record)).not.toMatch(/alternative|NON-CONFORMING/i);
  });

  it("is derived from the adapter's verbatim sentences and §Conforming profile", () => {
    const adapter = readFileSync(
      path.join(skillDirectory, "SKILL.md"),
      "utf8",
    ).replace(/\s+/g, " ");
    const contract = readFileSync(
      path.join(repositoryRoot, "docs/chapter-extraction.md"),
      "utf8",
    ).replace(/\s+/g, " ");
    const { model, reasoning_effort, fork_turns } = record.spawn;
    const settings = `\`model: ${model}\`, \`reasoning_effort: ${reasoning_effort}\`, and \`fork_turns: ${fork_turns}\``;

    expect(adapter).toContain(
      "Run Pass 1 and Pass 2 in separately spawned Codex agents.",
    );
    expect(adapter).toContain(`For both passes, explicitly set ${settings}.`);
    expect(adapter).toContain(
      "Never inherit the model, reasoning level, or conversation turns from the orchestrator.",
    );
    expect(contract).toContain(
      `Pass 1 and Pass 2 run in separately spawned Codex agents with ${settings}, never inherited from the orchestrator.`,
    );
    expect(contract).toContain("pinned by BOB-028");
  });

  it("pins the same Node version as package.json", () => {
    const engines = (
      JSON.parse(
        readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
      ) as { engines: { node: string } }
    ).engines.node;
    expect(readFileSync(preflight, "utf8")).toContain(
      `REQUIRED_NODE_VERSION = "${engines}"`,
    );
  });
});

describe("extraction preflight", () => {
  it("passes items 1-8 on a conforming fixture and stays inside its write boundary", () => {
    const statusBefore = git(repository, "status", "--porcelain");
    // An unrelated staged file under /tmp is not a reason to refuse (K7).
    writeJson(path.join(fixture, "staged/chapters/1/3.json"), {
      chapter: "1.3",
    });

    const result = runPreflight();

    expect(result.status, result.stderr).toBe(0);
    expect(result.report?.verdict).toBe("pass");
    expect(result.report?.items.map((entry) => entry.item)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(failedItems(result.report)).toEqual([]);
    expect(result.report?.manual_items.map((entry) => entry.item)).toEqual([9]);
    expect(result.report?.base_revision).toBe(
      git(repository, "rev-parse", "HEAD"),
    );
    expect(result.report?.profile_record.path).toBe(
      ".codex/skills/extract-bobiverse-chapter/profile.json",
    );
    expect(itemOf(result.report, 1).evidence).toMatchObject({
      mode: "conforming",
      version: "codex-cli 0.0.0-fixture",
    });
    expect(itemOf(result.report, 1).limits.join(" ")).toContain("(K1)");
    expect(itemOf(result.report, 7).evidence).toMatchObject({
      predecessor: "1.2",
      candidate: "data/narrative/chapters/1/2.json",
      chapters: ["1.1", "1.2"],
      inputs_clean: true,
    });
    const priorRoot = path.join(workspace, "prior-root");
    const log = readFileSync(validatorLog, "utf8").trim().split("\n");
    expect(log).toEqual([
      "tsx scripts/narrative-cli.ts validate",
      `tsx scripts/narrative-cli.ts validate --root ${priorRoot}`,
      `python scripts/validate_data.py --narrative-root ${priorRoot}`,
    ]);
    expect(readdirSync(workspace)).toEqual(["prior-root"]);
    expect(readdirSync(path.join(priorRoot, "chapters/1")).sort()).toEqual([
      "1.json",
      "2.json",
    ]);
    expect(git(repository, "status", "--porcelain")).toBe(statusBefore);
    expect(result.stderr).toContain("Extraction preflight for 1.3: PASS");
    expect(result.stderr).toContain("9. Isolation plan: manual");
  });

  it("defaults the approved-chapters repository to the contract path", () => {
    const defaultPath = path.join(home, "bobiverse-approved-chapters");
    mkdirSync(defaultPath);
    git(defaultPath, "init", "-q");

    const result = runPreflight({ approved: null });

    expect(result.status, result.stderr).toBe(0);
    expect(itemOf(result.report, 4).evidence.path).toBe(defaultPath);
  });

  it("has no skip flag", () => {
    const result = runPreflight({ extra: ["--force"] });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unrecognized arguments: --force");
  });

  describe("item 1: profile", () => {
    it("fails when the launcher is missing and no approval is recorded", () => {
      rmSync(path.join(fakeBin, "codex"));

      const result = runPreflight();

      expect(result.status).toBe(1);
      expect(failedItems(result.report)).toEqual([1]);
      expect(itemOf(result.report, 1).evidence.problem).toContain(
        "NON-CONFORMING approval",
      );
    });

    it("accepts a well-formed NON-CONFORMING approval for item 1 only", () => {
      rmSync(path.join(fakeBin, "codex"));
      const approval = approvalFile();

      const result = runPreflight({ extra: ["--approval-file", approval] });

      expect(result.status, result.stderr).toBe(0);
      const evidence = itemOf(result.report, 1).evidence;
      expect(evidence).toMatchObject({
        mode: "NON-CONFORMING",
        approval_file: approval,
        provider: "Fixture provider",
        relaying_role: "Manager bot",
      });
      expect(evidence.approval_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(itemOf(result.report, 1).limits.join(" ")).toContain(
        "not its authenticity",
      );
    });

    it("never waives a failing item 2-8", () => {
      rmSync(path.join(fakeBin, "codex"));
      writeFileSync(path.join(workspace, "leftover"), "");

      const result = runPreflight({
        extra: ["--approval-file", approvalFile()],
      });

      expect(result.status).toBe(1);
      expect(result.report?.verdict).toBe("fail");
      expect(itemOf(result.report, 1).result).toBe("pass");
      expect(failedItems(result.report)).toEqual([3, 7, 8]);
    });

    it.each([
      [{ relaying_role: "" }, "missing or empty field: relaying_role"],
      [{ label: "CONFORMING" }, 'label must be "NON-CONFORMING"'],
      [{ chapter: "1.4" }, "approval is for chapter 1.4, not 1.3"],
      [{ date: "13 November" }, "date must be YYYY-MM-DD"],
    ])("rejects a malformed approval %j", (overrides, problem) => {
      const result = runPreflight({
        extra: ["--approval-file", approvalFile(overrides)],
      });

      expect(result.status).toBe(1);
      expect(failedItems(result.report)).toEqual([1]);
      expect(itemOf(result.report, 1).evidence.problems).toContain(problem);
    });
  });

  describe("item 2: source", () => {
    it("records only fingerprint fields", () => {
      const result = runPreflight();

      expect(itemOf(result.report, 2).evidence).toEqual({
        chapter: "1.3",
        source_file: "1.3 - Synthetic Title.txt",
        source_title: "Synthetic Title",
        source_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        byte_length: expect.any(Number),
      });
    });

    it("fails when the filename does not match the chapter", () => {
      const result = runPreflight({ source: writeSource("1.4.txt") });

      expect(result.status).toBe(1);
      expect(failedItems(result.report)).toEqual([2]);
      expect(itemOf(result.report, 2).evidence.problem).toContain(
        "does not match source filename",
      );
    });

    it("fails for a source inside the repository", () => {
      const inside = path.join(repository, "1.3.txt");
      write(inside, "Synthetic.\n");
      git(repository, "add", "1.3.txt");
      git(repository, "commit", "-q", "-m", "fixture source");

      const result = runPreflight({ source: inside });

      expect(failedItems(result.report)).toEqual([2]);
      expect(itemOf(result.report, 2).evidence.problem).toBe(
        "source file must be outside the repository",
      );
    });

    it("fails for a non-UTF-8 source", () => {
      const source = path.join(fixture, "sources", "1.3.txt");
      mkdirSync(path.dirname(source), { recursive: true });
      writeFileSync(source, Buffer.from([0xff, 0xfe, 0x00]));

      const result = runPreflight({ source });

      expect(failedItems(result.report)).toEqual([2]);
      expect(itemOf(result.report, 2).evidence.problem).toContain("UTF-8");
    });
  });

  describe("item 3: workspace", () => {
    it("fails for a missing workspace", () => {
      const result = runPreflight({ workspace: `${workspace}-missing` });

      expect(failedItems(result.report)).toEqual([3, 7, 8]);
      expect(itemOf(result.report, 3).evidence.problems).toContain(
        "does not exist",
      );
    });

    it("fails for a workspace outside /tmp", () => {
      const result = runPreflight({ workspace: "/" });

      expect(failedItems(result.report)).toEqual([3, 7, 8]);
      expect(itemOf(result.report, 3).evidence.problems).toContain(
        "does not resolve under /tmp",
      );
      expect(itemOf(result.report, 7).evidence.problem).toContain(
        "prior root was not built",
      );
    });
  });

  describe("item 4: approved-chapters repository", () => {
    it("fails when the repository has a remote", () => {
      git(approved, "remote", "add", "origin", "https://example.invalid/r.git");

      const result = runPreflight();

      expect(failedItems(result.report)).toEqual([4]);
      expect(itemOf(result.report, 4).evidence.problems).toContain(
        "has a remote; it must have none",
      );
    });

    it("fails when the path is not a git repository", () => {
      const plain = path.join(fixture, "plain");
      mkdirSync(plain);

      const result = runPreflight({ approved: plain });

      expect(failedItems(result.report)).toEqual([4]);
    });
  });

  describe("item 5: repository", () => {
    it("fails on a dirty worktree", () => {
      write(path.join(repository, "notes.txt"), "untracked\n");

      const result = runPreflight();

      expect(failedItems(result.report)).toEqual([5]);
      expect(itemOf(result.report, 5).evidence.dirty_entries).toBe(1);
    });
  });

  describe("item 6: tooling", () => {
    it("fails on the wrong Node version", () => {
      const result = runPreflight({ env: { FAKE_NODE_VERSION: "v20.0.0" } });

      expect(failedItems(result.report)).toEqual([6]);
      expect(itemOf(result.report, 6).evidence.node_version).toBe("v20.0.0");
    });

    it("fails when .venv is missing", () => {
      rmSync(path.join(repository, ".venv"), { recursive: true });

      const result = runPreflight();

      expect(failedItems(result.report)).toContain(6);
      expect(itemOf(result.report, 6).evidence.problems).toContain(
        ".venv is missing",
      );
    });

    it("fails when narrative validation fails", () => {
      const result = runPreflight({ env: { FAKE_NARRATIVE_FAIL: "1" } });

      expect(failedItems(result.report)).toEqual([6, 8]);
    });
  });

  describe("item 7: prior chain", () => {
    it("fails closed for a zero-state target", () => {
      const result = runPreflight({ chapter: "1.1" });

      expect(result.status).toBe(1);
      expect(failedItems(result.report)).toEqual([7, 8]);
      expect(itemOf(result.report, 7).evidence.problem).toBe(
        "cannot certify a zero-state prior chain",
      );
      expect(result.stderr).toContain(
        "cannot certify a zero-state prior chain",
      );
      expect(readFileSync(validatorLog, "utf8")).not.toContain("--root");
    });

    it("fails closed when the immediate predecessor is not canonical", () => {
      rmSync(path.join(repository, "data/narrative/chapters/1/2.json"));
      git(repository, "commit", "-q", "-am", "only 1.1 is canonical");

      const result = runPreflight();

      expect(result.status).toBe(1);
      expect(failedItems(result.report)).toEqual([7, 8]);
      expect(itemOf(result.report, 7).evidence.problem).toContain(
        "immediate predecessor 1.2 is not canonical",
      );
    });

    it("fails closed at a book boundary", () => {
      const result = runPreflight({ chapter: "2.1" });

      expect(failedItems(result.report)).toEqual([7, 8]);
      expect(itemOf(result.report, 7).evidence.problem).toContain(
        "book boundary",
      );
    });

    it("fails when canonical inputs are unclean", () => {
      writeJson(path.join(repository, "data/narrative/chapters/1/1.json"), {
        chapter: "1.1",
        edited: true,
      });

      const result = runPreflight();

      expect(failedItems(result.report)).toEqual([5, 7, 8]);
      expect(itemOf(result.report, 7).evidence).toMatchObject({
        inputs_clean: false,
        dirty_paths: ["data/narrative/chapters/1/1.json"],
      });
    });
  });

  describe("item 8: validators on the prior root", () => {
    it("reports an uncovered anchor as its own failure class", () => {
      const result = runPreflight({ env: { FAKE_DATA: "uncovered" } });

      expect(failedItems(result.report)).toEqual([8]);
      expect(itemOf(result.report, 8).evidence).toMatchObject({
        failure_classes: ["uncovered-anchor"],
        see: "§Astronomy preflight and isolated acquisition",
      });
      expect(result.stderr).toContain("8. Validators: fail (uncovered-anchor)");
    });

    it("reports any other astronomy failure as a baseline failure", () => {
      const result = runPreflight({ env: { FAKE_DATA: "baseline" } });

      expect(failedItems(result.report)).toEqual([8]);
      expect(itemOf(result.report, 8).evidence.failure_classes).toEqual([
        "astronomy-baseline",
      ]);
    });
  });

  describe("report", () => {
    it("never contains source bytes, in stdout, stderr or the report file", () => {
      const report = path.join(fixture, "report.json");
      const secondWorkspace = path.join(fixture, "second-workspace");
      mkdirSync(secondWorkspace);
      const runs = [
        runPreflight({ extra: ["--report", report] }),
        runPreflight({ chapter: "1.1", workspace: secondWorkspace }),
      ];

      expect(runs[0].status, runs[0].stderr).toBe(0);
      expect(runs[0].stdout).toBe("");
      const written = readFileSync(report, "utf8");
      expect((JSON.parse(written) as Report).verdict).toBe("pass");
      for (const output of [
        written,
        ...runs.flatMap((run) => [run.stdout, run.stderr]),
      ]) {
        expect(output).not.toContain(syntheticMarker);
        expect(output).not.toContain("Synthetic fixture line");
        expect(output).not.toMatch(/not applicable/i);
      }
      for (const entry of [
        ...(JSON.parse(written) as Report).items,
        ...(runs[1].report?.items ?? []),
      ]) {
        expect(["pass", "fail"]).toContain(entry.result);
      }
    });

    it("refuses a report path inside the repository", () => {
      const result = runPreflight({
        extra: ["--report", path.join(repository, "report.json")],
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(
        "--report must be outside the repository",
      );
      expect(existsSync(path.join(repository, "report.json"))).toBe(false);
      expect(readFileSync(validatorLog, "utf8")).toBe("");
    });
  });

  describe("checkout and arguments", () => {
    it("refuses a working directory in another checkout", () => {
      const result = runPreflight({ script: preflight });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("is not this script's checkout");
      expect(readFileSync(validatorLog, "utf8")).toBe("");
    });

    it("refuses a working directory outside any git checkout", () => {
      const plain = path.join(fixture, "plain-cwd");
      mkdirSync(plain);

      const result = runPreflight({ cwd: plain });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(
        "the working directory is not inside a git checkout",
      );
    });

    it("refuses an existing report path before any check runs", () => {
      const report = path.join(fixture, "existing-report.json");
      write(report, "{}\n");

      const result = runPreflight({ extra: ["--report", report] });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--report already exists");
      expect(readFileSync(report, "utf8")).toBe("{}\n");
      expect(readFileSync(validatorLog, "utf8")).toBe("");
    });

    it("refuses a report path whose parent directory is missing", () => {
      const result = runPreflight({
        extra: ["--report", path.join(fixture, "missing-dir", "report.json")],
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(
        "--report parent directory does not exist",
      );
      expect(readFileSync(validatorLog, "utf8")).toBe("");
      expect(readdirSync(workspace)).toEqual([]);
    });

    it("documents that item 1 runs codex --version", () => {
      const result = spawnSync(
        python,
        [path.join(repository, "scripts/extraction_preflight.py"), "--help"],
        { cwd: repository, encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Item 1 runs "codex --version".');
      expect(result.stdout).toContain("(K1)");
    });
  });

  describe("follow-up item checks", () => {
    it("fails item 3 for a workspace inside the repository", () => {
      const inside = path.join(repository, "workspace");
      mkdirSync(inside);

      const result = runPreflight({ workspace: inside });

      expect(failedItems(result.report)).toEqual([3, 7, 8]);
      expect(itemOf(result.report, 3).evidence.problems).toEqual([
        "is inside the repository",
      ]);
    });

    it.skipIf(process.getuid?.() === 0)(
      "fails item 3 for a non-writable workspace",
      () => {
        chmodSync(workspace, 0o555);

        const result = runPreflight();

        chmodSync(workspace, 0o755);
        expect(failedItems(result.report)).toEqual([3, 7, 8]);
        expect(itemOf(result.report, 3).evidence.problems).toEqual([
          "is not writable",
        ]);
      },
    );

    it("fails item 6 when node_modules is missing", () => {
      rmSync(path.join(repository, "node_modules"), { recursive: true });

      const result = runPreflight();

      expect(failedItems(result.report)).toContain(6);
      expect(itemOf(result.report, 6).evidence.problems).toContain(
        "node_modules is missing",
      );
    });

    it("relays only the bounded last line of helper error output", () => {
      write(
        path.join(
          repository,
          ".codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py",
        ),
        [
          "import sys",
          `sys.stderr.write("${syntheticMarker} early line\\n" + "x" * 50 + "\\n")`,
          `sys.stderr.write("error: final " + "y" * 400 + "\\n")`,
          "sys.exit(2)",
          "",
        ].join("\n"),
      );
      git(repository, "commit", "-q", "-am", "fixture helper stand-in");

      const result = runPreflight();

      const problem = String(itemOf(result.report, 2).evidence.problem);
      expect(problem.startsWith("final yyy")).toBe(true);
      expect(problem).toHaveLength(300);
      expect(result.stdout + result.stderr).not.toContain(syntheticMarker);
    });

    it("never leaks source bytes on item 2's failure paths", () => {
      const nonUtf8 = path.join(fixture, "sources", "1.3.txt");
      mkdirSync(path.dirname(nonUtf8), { recursive: true });
      writeFileSync(
        nonUtf8,
        Buffer.concat([
          Buffer.from(syntheticMarker),
          Buffer.from([0xff, 0xfe]),
        ]),
      );
      const inside = path.join(repository, "1.3.txt");
      write(inside, `${syntheticMarker}\n`);
      git(repository, "add", "1.3.txt");
      git(repository, "commit", "-q", "-m", "fixture source");

      for (const source of [writeSource("1.4.txt"), nonUtf8, inside]) {
        const result = runPreflight({ source });

        expect(itemOf(result.report, 2).result).toBe("fail");
        expect(result.stdout + result.stderr).not.toContain(syntheticMarker);
        expect(result.stdout + result.stderr).not.toContain(
          "Synthetic fixture line",
        );
      }
    });

    it("shows the K5 caveat only when an approval file is passed", () => {
      const conforming = runPreflight();
      rmSync(workspace, { recursive: true, force: true });
      mkdirSync(workspace);
      const withApproval = runPreflight({
        extra: ["--approval-file", approvalFile()],
      });

      expect(conforming.report?.limits.join(" ")).not.toContain("(K5)");
      expect(conforming.stderr).not.toContain("(K5)");
      expect(itemOf(conforming.report, 1).limits.join(" ")).not.toContain(
        "(K5)",
      );
      expect(withApproval.report?.limits.join(" ")).toContain("(K5)");
      expect(withApproval.stderr).toContain("(K5)");
    });
  });
});

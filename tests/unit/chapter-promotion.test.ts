import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Every fixture here is synthetic: temporary git repositories, a stand-in npm and
// placeholder JSON. No book text is read or written.
const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const helper =
  ".codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py";
const logHeader = [
  "# Chapter promotion log",
  "",
  "| Applied date | Chapter | Canonical SHA-256 | Validation | Decisions |",
  "| --- | --- | --- | --- | --- |",
  "| 2026-11-01 | `1.1` | `abc` | Passed | Synthetic earlier row. |",
  "",
  "## Notes",
  "",
  "Synthetic trailing section.",
  "",
].join("\n");

let fixture: string;
let bobiverse: string;
let approved: string;
let workspace: string;
let npmLog: string;

function write(file: string, content: string, mode?: number) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  if (mode !== undefined) chmodSync(file, mode);
}

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(
    "python3",
    [path.join(bobiverse, "scripts/chapter_promotion.py"), ...args],
    {
      cwd: bobiverse,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${path.join(fixture, "bin")}:${process.env.PATH ?? ""}`,
        FAKE_NPM_LOG: npmLog,
        FAKE_NPM_FAIL: "",
        ...env,
      },
    },
  );
}

function fillWorkspace(dir: string, extra: string[] = []) {
  write(
    path.join(dir, "candidate.json"),
    '{ "chapter": "1.2", "events": [] }\n',
  );
  for (const name of ["narrative", "astronomy"]) {
    write(path.join(dir, `${name}-validation.log`), "synthetic ok\n");
    write(path.join(dir, `${name}-validation.exit`), "0\n");
  }
  for (const name of extra) write(path.join(dir, name), "synthetic\n");
}

function record(
  extra: string[] = [],
  tamper?: () => void,
  dir: string = workspace,
) {
  fillWorkspace(workspace, extra);
  tamper?.();
  const approval = path.join(fixture, "approval.json");
  write(
    approval,
    JSON.stringify({
      chapter: "1.2",
      date: "2026-11-13",
      captain_approval_quote: "Synthetic approval.",
      relaying_role: "manager",
    }),
  );
  return run([
    "record",
    "--chapter",
    "1.2",
    "--workspace",
    dir,
    "--approval",
    approval,
    "--repo",
    approved,
  ]);
}

function promote(env: Record<string, string> = {}) {
  const promoteWorkspace = mkdtempSync(path.join(fixture, "promote-"));
  return run(
    [
      "promote",
      "--chapter",
      "1.2",
      "--workspace",
      promoteWorkspace,
      "--decisions",
      "Synthetic decision.",
      "--repo",
      approved,
    ],
    env,
  );
}

function expectApprovedUntouched(start: string) {
  expect(git(approved, "rev-parse", "HEAD")).toBe(start);
  expect(git(approved, "tag", "--list")).toBe("");
  expect(git(approved, "status", "--porcelain")).toBe("");
  expect(existsSync(path.join(approved, "chapters/1.2"))).toBe(false);
}

beforeEach(() => {
  fixture = mkdtempSync("/tmp/chapter-promotion-test-");
  bobiverse = path.join(fixture, "bobiverse");
  approved = path.join(fixture, "approved");
  workspace = mkdtempSync(path.join(fixture, "workspace-"));
  npmLog = path.join(fixture, "npm.log");
  process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = "Fixture";
  process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL =
    "f@example.invalid";
  write(
    path.join(fixture, "bin/npm"),
    [
      "#!/bin/sh",
      'echo "npm $*" >> "$FAKE_NPM_LOG"',
      'if [ -n "$FAKE_NPM_FAIL" ]; then case "npm $*" in *"$FAKE_NPM_FAIL"*) [ -n "$FAKE_NPM_ON_FAIL" ] && sh -c "$FAKE_NPM_ON_FAIL"; exit 1;; esac; fi',
      "",
    ].join("\n"),
    0o755,
  );
  const narrative = path.join(bobiverse, "data/narrative");
  write(path.join(narrative, "baseline/zero-state.json"), "{}\n");
  write(path.join(narrative, "assets.json"), "{}\n");
  write(path.join(narrative, "books.json"), "{}\n");
  write(path.join(narrative, "chapters/1/1.json"), '{ "chapter": "1.1" }\n');
  write(path.join(bobiverse, "data/presentation/species.json"), "{}\n");
  write(path.join(bobiverse, "docs/chapter-promotion-log.md"), logHeader);
  for (const file of ["scripts/chapter_promotion.py", helper]) {
    write(
      path.join(bobiverse, file),
      readFileSync(path.join(repositoryRoot, file), "utf8"),
    );
  }
  git(bobiverse, "init", "-q");
  git(bobiverse, "add", ".");
  git(bobiverse, "commit", "-q", "-m", "fixture");
  write(
    path.join(approved, "README.md"),
    "Synthetic approved-chapters repo.\n",
  );
  git(approved, "init", "-q");
  git(approved, "add", ".");
  git(approved, "commit", "-q", "-m", "init");
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
});

describe("chapter_promotion.py record", () => {
  it("commits the allowlisted files and creates an annotated tag", () => {
    const result = record(["provenance.json"]);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(git(approved, "cat-file", "-t", "chapter-1.2-approved")).toBe("tag");
    expect(
      git(approved, "ls-tree", "--name-only", "HEAD", "chapters/1.2/").split(
        "\n",
      ),
    ).toEqual(
      expect.arrayContaining([
        "chapters/1.2/APPROVAL.json",
        "chapters/1.2/candidate.json",
        "chapters/1.2/provenance.json",
      ]),
    );
    expect(git(approved, "status", "--porcelain")).toBe("");
  });

  it.each(["human-review.md", "report.md", "change-note.txt", "APPROVAL.json"])(
    "refuses a workspace containing %s",
    (name) => {
      const start = git(approved, "rev-parse", "HEAD");
      const result = record([name]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("not on the allowlist");
      expectApprovedUntouched(start);
    },
  );

  it("refuses a workspace outside /tmp or inside a repository", () => {
    const inside = path.join(approved, "ws");
    mkdirSync(inside);
    const approval = path.join(fixture, "approval.json");
    write(approval, "{}");
    for (const dir of [repositoryRoot, inside]) {
      const result = run([
        "record",
        "--chapter",
        "1.2",
        "--workspace",
        dir,
        "--approval",
        approval,
        "--repo",
        approved,
      ]);
      expect(result.status).toBe(1);
    }
  });

  it.each([
    ["commit", "pre-commit", "#!/bin/sh\nexit 1\n"],
    [
      "tag",
      "reference-transaction",
      '#!/bin/sh\n[ "$1" = prepared ] && grep -q refs/tags/ && exit 1\nexit 0\n',
    ],
  ])("rolls back when the %s fails", (step, hook, body) => {
    write(path.join(approved, ".git/hooks", hook), body, 0o755);
    const start = git(approved, "rev-parse", "HEAD");
    const result = record();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("rolled back");
    expect(result.stderr).toContain(`git ${step}`);
    expectApprovedUntouched(start);
  });
});

describe("chapter_promotion.py record refuses links and special files", () => {
  // A stand-in for a file that must never enter the record (synthetic bytes).
  const outside = () => {
    const file = path.join(fixture, "outside.json");
    write(file, '{ "chapter": "1.2", "synthetic": "outside" }\n');
    return file;
  };
  const replaceWithSymlink = (name: string) => () => {
    rmSync(path.join(workspace, name));
    symlinkSync(outside(), path.join(workspace, name));
  };

  it.each([
    ["a symlinked candidate.json", replaceWithSymlink("candidate.json")],
    ["a symlinked .log", replaceWithSymlink("narrative-validation.log")],
    [
      "a hard-linked candidate.json",
      () => {
        rmSync(path.join(workspace, "candidate.json"));
        linkSync(outside(), path.join(workspace, "candidate.json"));
      },
    ],
    [
      "a FIFO under an allowed name",
      () => {
        const made = spawnSync("mkfifo", [
          path.join(workspace, "projection.log"),
        ]);
        expect(made.status).toBe(0);
      },
    ],
    [
      "a directory under an allowed name",
      () => mkdirSync(path.join(workspace, "canonical.diff")),
    ],
  ])("refuses %s", (_case, tamper) => {
    const start = git(approved, "rev-parse", "HEAD");
    const result = record([], tamper);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("regular");
    expectApprovedUntouched(start);
  });

  it.each(["", "/", "/."])(
    "refuses a symlinked workspace directory (suffix %j)",
    (suffix) => {
      const start = git(approved, "rev-parse", "HEAD");
      const link = path.join(fixture, "workspace-link");
      symlinkSync(workspace, link);
      const result = record([], undefined, `${link}${suffix}`);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("must not be a symlink");
      expectApprovedUntouched(start);
    },
  );

  it.each([
    ["symlinked", symlinkSync],
    ["hard-linked", linkSync],
  ])("refuses a %s approval file", (_case, makeLink) => {
    fillWorkspace(workspace);
    const real = path.join(fixture, "approval-real.json");
    write(
      real,
      JSON.stringify({
        chapter: "1.2",
        date: "2026-11-13",
        captain_approval_quote: "Synthetic approval.",
        relaying_role: "manager",
      }),
    );
    const approval = path.join(fixture, "approval-link.json");
    makeLink(real, approval);
    const start = git(approved, "rev-parse", "HEAD");
    const result = run([
      "record",
      "--chapter",
      "1.2",
      "--workspace",
      workspace,
      "--approval",
      approval,
      "--repo",
      approved,
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("approval-link.json is not a regular");
    expectApprovedUntouched(start);
  });
});

describe("chapter_promotion.py promote and verify", () => {
  const chapter = () =>
    path.join(bobiverse, "data/narrative/chapters/1/2.json");
  const log = () => path.join(bobiverse, "docs/chapter-promotion-log.md");

  beforeEach(() => {
    expect(record().status).toBe(0);
  });

  it("writes the chapter, inserts the log row and runs the validators", () => {
    const result = promote();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(readFileSync(chapter(), "utf8"))).toEqual({
      chapter: "1.2",
      events: [],
    });
    const lines = readFileSync(log(), "utf8").split("\n");
    expect(lines[5]).toMatch(
      /^\| \d{4}-\d\d-\d\d \| `1\.2` \| `[0-9a-f]{64}` \| Passed \|/,
    );
    expect(lines[5]).toContain("Synthetic decision. Approved-chapters commit");
    expect(lines[6]).toBe("");
    const calls = readFileSync(npmLog, "utf8");
    expect(calls).toContain("narrative:validate -- --root");
    expect(calls).toContain("data:validate -- --narrative-root");
    expect(calls).toContain("npm run -s typecheck");
  });

  it("writes nothing when the offline astronomy validation fails", () => {
    const result = promote({ FAKE_NPM_FAIL: "--narrative-root" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("isolated acquisition");
    expect(existsSync(chapter())).toBe(false);
    expect(readFileSync(log(), "utf8")).toBe(logHeader);
  });

  it("restores the chapter and log when a post-write command fails", () => {
    const result = promote({ FAKE_NPM_FAIL: "npm run -s lint" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("restored");
    expect(existsSync(chapter())).toBe(false);
    expect(readFileSync(log(), "utf8")).toBe(logHeader);
    expect(git(bobiverse, "status", "--porcelain")).toBe("");
  });

  it.skipIf(process.getuid?.() === 0)(
    "restores the chapter when the log write fails",
    () => {
      chmodSync(log(), 0o444);
      try {
        const result = promote();
        expect(result.status).toBe(1);
        expect(existsSync(chapter())).toBe(false);
        expect(readFileSync(log(), "utf8")).toBe(logHeader);
      } finally {
        chmodSync(log(), 0o644);
      }
    },
  );

  it.each([
    ["missing", () => rmSync(log())],
    [
      "without a table",
      () => write(log(), "# Chapter promotion log\n\nNo table.\n"),
    ],
    [
      "that is not valid UTF-8",
      () => writeFileSync(log(), Buffer.from([0xff, 0xfe, 0x7c, 0x0a])),
    ],
  ])(
    "refuses a promotion log %s before writing the chapter",
    (_case, damage) => {
      damage();
      git(bobiverse, "add", "-A");
      git(bobiverse, "commit", "-q", "-m", "damage the log");
      const result = promote();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("chapter-promotion-log.md");
      expect(existsSync(chapter())).toBe(false);
      expect(readFileSync(npmLog, "utf8")).not.toContain("prettier");
    },
  );

  it.skipIf(process.getuid?.() === 0)(
    "exits 3 and names the saved copies when the restore cannot be confirmed",
    () => {
      const directory = path.dirname(chapter());
      try {
        const result = promote({
          FAKE_NPM_FAIL: "npm run -s lint",
          FAKE_NPM_ON_FAIL: `chmod 555 '${directory}'`,
        });
        expect(result.status).toBe(3);
        expect(result.stderr).toContain("restore unconfirmed");
        expect(result.stderr).toMatch(/previous bytes are in \S+saved/);
      } finally {
        chmodSync(directory, 0o755);
      }
    },
  );

  it("verifies tagged chapters and reports untagged log rows", () => {
    expect(promote().status).toBe(0);
    const passing = run(["verify", "--repo", approved]);
    expect(passing.status).toBe(0);
    expect(passing.stdout).toContain("1.2: matches chapter-1.2-approved");
    expect(passing.stdout).toContain(
      "1 chapter(s) whose latest promotion-log row cites no tag",
    );
    write(chapter(), '{ "chapter": "1.2", "events": ["changed"] }\n');
    const failing = run(["verify", "--repo", approved]);
    expect(failing.status).toBe(1);
    expect(failing.stderr).toContain("differs");
  });
});

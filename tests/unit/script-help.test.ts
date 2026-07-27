import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");

const userCommands = [
  {
    command: "./bin/chapter-extract",
    argumentsList: ["--help"],
  },
  {
    command: "./bin/convert-galactic-starfield",
    argumentsList: ["--help"],
  },
  {
    command: "./bin/narrative-generate.sh",
    argumentsList: ["--help"],
  },
  {
    command: "./bin/narrative-validate.sh",
    argumentsList: ["--help"],
  },
];

const agentTools = [
  {
    command: "./node_modules/.bin/tsx",
    argumentsList: ["scripts/narrative-cli.ts", "--help"],
  },
  {
    command: "./.venv/bin/python",
    argumentsList: ["scripts/refresh_gaia_snapshot.py", "--help"],
  },
  {
    command: "./.venv/bin/python",
    argumentsList: ["scripts/generate_nearby_systems.py", "--help"],
  },
  {
    command: "./.venv/bin/python",
    argumentsList: ["scripts/validate_data.py", "--help"],
  },
  {
    command: "bash",
    argumentsList: ["scripts/convert_galactic_starfield.sh", "--help"],
  },
];

function expectSuccessfulHelp(script: {
  command: string;
  argumentsList: string[];
}) {
  const result = spawnSync(script.command, script.argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/usage:/i);
  expect(result.stderr).toBe("");
}

describe("user-facing command help", () => {
  it.each(userCommands)(
    "prints help without normal side effects: $command",
    (script) => {
      expectSuccessfulHelp(script);
    },
  );
});

describe("agent-facing tool help", () => {
  it.each(agentTools)(
    "prints help and exits successfully: $command",
    (script) => {
      expectSuccessfulHelp(script);
    },
  );
});

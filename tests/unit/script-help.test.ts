import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");

const scripts = [
  {
    command: "./node_modules/.bin/tsx",
    argumentsList: ["scripts/narrative-cli.ts", "--help"],
  },
  {
    command: "./.venv/bin/python",
    argumentsList: ["scripts/refresh_cns5_snapshot.py", "--help"],
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

describe("user-facing script help", () => {
  it.each(scripts)("prints help and exits successfully: $command", (script) => {
    const result = spawnSync(script.command, script.argumentsList, {
      cwd: repositoryRoot,
      encoding: "utf8",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/usage:/i);
    expect(result.stderr).toBe("");
  });
});

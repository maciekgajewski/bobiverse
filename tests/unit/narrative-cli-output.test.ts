import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
let corpusRoot: string;

async function createZeroStateCorpus(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "bobiverse-narrative-cli-"));
  await mkdir(path.join(root, "baseline"));
  await cp(
    path.join(repositoryRoot, "data/narrative/baseline/zero-state.json"),
    path.join(root, "baseline/zero-state.json"),
  );
  await cp(
    path.join(repositoryRoot, "data/narrative/assets.json"),
    path.join(root, "assets.json"),
  );
  await writeFile(path.join(root, "books.json"), '{"books": {}}\n');
  return root;
}

function runGenerator(...argumentsList: string[]) {
  return spawnSync(
    "./node_modules/.bin/tsx",
    [
      "scripts/narrative-cli.ts",
      "generate",
      "--root",
      corpusRoot,
      ...argumentsList,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
}

describe("narrative generator output", () => {
  beforeAll(async () => {
    corpusRoot = await createZeroStateCorpus();
  });

  afterAll(async () => {
    await rm(corpusRoot, { recursive: true, force: true });
  });

  it("writes a complete projection to standard output by default", () => {
    const result = runGenerator();

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      view: { chapter: null, display_date: null },
    });
  });

  it("writes to an explicitly requested file instead of standard output", async () => {
    const outputPath = path.join(corpusRoot, "world.json");
    const result = runGenerator("--output", outputPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Generated pre-book world state at ${outputPath}.`,
    );
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toMatchObject({
      view: { chapter: null, display_date: null },
    });
  });

  it("keeps wrapper standard output as parseable JSON", () => {
    const result = spawnSync(
      "bash",
      ["bin/narrative-generate.sh", "--root", corpusRoot],
      { cwd: repositoryRoot, encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      view: { chapter: null, display_date: null },
    });
  });
});

import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nearbySystems } from "../src/domain/data";
import {
  generateNarrativeWorld,
  type NarrativeCorpus,
  validateNarrativeCorpus,
} from "../src/narrative/model";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function usage(): never {
  throw new Error(
    "Usage: narrative-cli.ts <validate|generate> [--root data/narrative] [--chapter 1.1] [--output /tmp/world.json]",
  );
}

function option(argumentsList: string[], name: string): string | undefined {
  const index = argumentsList.indexOf(name);
  if (index === -1) return undefined;
  const value = argumentsList[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a value.`);
  return value;
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    throw new Error(`Could not read JSON file ${filePath}: ${message}`, {
      cause: error,
    });
  }
}

async function readChapters(root: string): Promise<Record<string, unknown>[]> {
  const chaptersRoot = path.join(root, "chapters");
  try {
    await access(chaptersRoot);
  } catch {
    return [];
  }
  const chapters: Record<string, unknown>[] = [];
  for (const bookEntry of await readdir(chaptersRoot, {
    withFileTypes: true,
  })) {
    if (!bookEntry.isDirectory()) continue;
    const bookPath = path.join(chaptersRoot, bookEntry.name);
    for (const chapterEntry of await readdir(bookPath, {
      withFileTypes: true,
    })) {
      if (!chapterEntry.isFile() || !chapterEntry.name.endsWith(".json"))
        continue;
      const chapter = await readJson(path.join(bookPath, chapterEntry.name));
      const expectedChapter = `${bookEntry.name}.${chapterEntry.name.slice(0, -".json".length)}`;
      if (chapter.chapter !== expectedChapter) {
        throw new Error(
          `Chapter path ${path.relative(repositoryRoot, path.join(bookPath, chapterEntry.name))} must contain chapter ${expectedChapter}.`,
        );
      }
      chapters.push(chapter);
    }
  }
  return chapters;
}

async function assertAssetFiles(
  root: string,
  assetsSource: Record<string, unknown>,
): Promise<void> {
  const assets = assetsSource.assets;
  if (!Array.isArray(assets)) return;
  for (const candidate of assets) {
    if (!candidate || typeof candidate !== "object") continue;
    const asset = candidate as Record<string, unknown>;
    if (typeof asset.path !== "string") continue;
    const assetPath = path.join(repositoryRoot, "public", asset.path);
    const assetRoot = path.join(repositoryRoot, "public", "assets") + path.sep;
    if (!assetPath.startsWith(assetRoot)) {
      throw new Error(`Asset path is outside public/assets: ${asset.path}.`);
    }
    try {
      if (!(await stat(assetPath)).isFile())
        throw new Error("not a regular file");
    } catch {
      throw new Error(
        `Registered asset does not exist as a regular file: ${asset.path}.`,
      );
    }
  }
}

async function loadCorpus(rootArgument: string): Promise<NarrativeCorpus> {
  const root = path.resolve(repositoryRoot, rootArgument);
  if (!nearbySystems) throw new Error("Nearby astronomy data is invalid.");
  const [baseline, assets, books, chapters] = await Promise.all([
    readJson(path.join(root, "baseline", "solar-system.json")),
    readJson(path.join(root, "assets.json")),
    readJson(path.join(root, "books.json")),
    readChapters(root),
  ]);
  await assertAssetFiles(root, assets);
  return {
    baseline,
    assets,
    books,
    chapters,
    knownAstronomyObjectIds: nearbySystems.systems.map((system) => system.id),
  };
}

async function main(): Promise<void> {
  const [command, ...argumentsList] = process.argv.slice(2);
  if (command !== "validate" && command !== "generate") usage();
  const root = option(argumentsList, "--root") ?? "data/narrative";
  const corpus = await loadCorpus(root);
  validateNarrativeCorpus(corpus);
  if (command === "validate") {
    console.log(
      `Narrative corpus is valid: zero state and ${corpus.chapters.length} chapter source file(s).`,
    );
    return;
  }
  const output = option(argumentsList, "--output");
  if (!output)
    throw new Error(
      "generate requires --output <path> so generated state is never implicit source data.",
    );
  const world = generateNarrativeWorld(
    corpus,
    option(argumentsList, "--chapter") ?? null,
  );
  const outputPath = path.resolve(repositoryRoot, output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(world, null, 2)}\n`);
  console.log(
    `Generated ${world.view.chapter ?? "pre-book"} world state at ${outputPath}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

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
  narrativeSchemaErrors,
  type NarrativeCorpus,
  validateNarrativeCorpus,
} from "../src/narrative/model";
import {
  JsonSourceParseError,
  locationForPointer,
  parseJsonDocument,
  type JsonSourceLocation,
} from "../src/narrative/json-source-map";
import { formatSchemaDiagnostics } from "../src/narrative/schema-diagnostics";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

interface LoadedJson {
  filePath: string;
  value: Record<string, unknown>;
  locations: ReadonlyMap<string, JsonSourceLocation>;
}

interface LoadedCorpus {
  corpus: NarrativeCorpus;
  sources: Array<LoadedJson & { definition: string }>;
}

const usageText =
  "Usage: narrative-cli.ts <validate|generate> [--root data/narrative] [--chapter 1.1] [--output /tmp/world.json]\n\nGenerate writes JSON to standard output by default. --output writes to a file instead.";

function usage(): never {
  throw new Error(usageText);
}

function printUsage(): void {
  console.log(usageText);
}

function option(argumentsList: string[], name: string): string | undefined {
  const index = argumentsList.indexOf(name);
  if (index === -1) return undefined;
  const value = argumentsList[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a value.`);
  return value;
}

function displayPath(filePath: string): string {
  return path.relative(repositoryRoot, filePath) || filePath;
}

function errorAt(source: LoadedJson, pointer: string, message: string): Error {
  const location = locationForPointer(source.locations, pointer);
  return new Error(
    `${displayPath(source.filePath)}:${location.line}:${location.column}: error: ${message}`,
  );
}

async function readJson(filePath: string): Promise<LoadedJson> {
  let source: string;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    throw new Error(
      `${displayPath(filePath)}:1:1: error: Could not read JSON: ${message}`,
      { cause: error },
    );
  }
  try {
    const parsed = parseJsonDocument(source);
    return { filePath, ...parsed };
  } catch (error) {
    if (error instanceof JsonSourceParseError) {
      throw new Error(
        `${displayPath(filePath)}:${error.location.line}:${error.location.column}: error: Invalid JSON: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

async function readChapters(root: string): Promise<LoadedJson[]> {
  const chaptersRoot = path.join(root, "chapters");
  try {
    await access(chaptersRoot);
  } catch {
    return [];
  }
  const chapters: LoadedJson[] = [];
  const bookEntries = await readdir(chaptersRoot, { withFileTypes: true });
  for (const bookEntry of bookEntries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (!bookEntry.isDirectory()) continue;
    const bookPath = path.join(chaptersRoot, bookEntry.name);
    const chapterEntries = await readdir(bookPath, { withFileTypes: true });
    for (const chapterEntry of chapterEntries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (!chapterEntry.isFile() || !chapterEntry.name.endsWith(".json"))
        continue;
      const chapter = await readJson(path.join(bookPath, chapterEntry.name));
      const expectedChapter = `${bookEntry.name}.${chapterEntry.name.slice(0, -".json".length)}`;
      if (chapter.value.chapter !== expectedChapter) {
        throw errorAt(
          chapter,
          "/chapter",
          `Chapter path must contain chapter ${expectedChapter}.`,
        );
      }
      chapters.push(chapter);
    }
  }
  return chapters;
}

async function assertAssetFiles(assetsSource: LoadedJson): Promise<void> {
  const assets = assetsSource.value.assets;
  if (!Array.isArray(assets)) return;
  for (const [index, candidate] of assets.entries()) {
    if (!candidate || typeof candidate !== "object") continue;
    const asset = candidate as Record<string, unknown>;
    if (typeof asset.path !== "string") continue;
    const assetPath = path.join(repositoryRoot, "public", asset.path);
    const assetRoot = path.join(repositoryRoot, "public", "assets") + path.sep;
    if (!assetPath.startsWith(assetRoot)) {
      throw errorAt(
        assetsSource,
        `/assets/${index}/path`,
        `Asset path is outside public/assets: ${asset.path}.`,
      );
    }
    try {
      if (!(await stat(assetPath)).isFile())
        throw new Error("not a regular file");
    } catch {
      throw errorAt(
        assetsSource,
        `/assets/${index}/path`,
        `Registered asset does not exist as a regular file: ${asset.path}.`,
      );
    }
  }
}

async function loadCorpus(rootArgument: string): Promise<LoadedCorpus> {
  const root = path.resolve(repositoryRoot, rootArgument);
  if (!nearbySystems) throw new Error("Nearby astronomy data is invalid.");
  const [zeroState, assets, books, chapters] = await Promise.all([
    readJson(path.join(root, "baseline", "zero-state.json")),
    readJson(path.join(root, "assets.json")),
    readJson(path.join(root, "books.json")),
    readChapters(root),
  ]);
  await assertAssetFiles(assets);
  return {
    corpus: {
      zeroState: zeroState.value,
      assets: assets.value,
      books: books.value,
      chapters: chapters.map((chapter) => chapter.value),
      knownAstronomyObjectIds: nearbySystems.systems.map((system) => system.id),
    },
    sources: [
      { ...zeroState, definition: "zero_state_source" },
      { ...assets, definition: "assets_source" },
      { ...books, definition: "books_source" },
      ...chapters.map((chapter) => ({
        ...chapter,
        definition: "chapter_source",
      })),
    ],
  };
}

function schemaErrorLines(loaded: LoadedCorpus): string[] {
  return loaded.sources.flatMap((source) =>
    formatSchemaDiagnostics(
      narrativeSchemaErrors(source.definition, source.value),
      source.value,
      source.locations,
    ).map(
      (diagnostic) =>
        `${displayPath(source.filePath)}:${diagnostic.location.line}:${diagnostic.location.column}: error: ${diagnostic.message}`,
    ),
  );
}

function sourceForSemanticError(
  error: Error,
  loaded: LoadedCorpus,
): LoadedJson {
  const chapter = /Chapter (\d+\.\d+)/.exec(error.message)?.[1];
  if (chapter) {
    const source = loaded.sources.find(
      (candidate) => candidate.value.chapter === chapter,
    );
    if (source) return source;
  }
  if (error.message.includes("Asset")) return loaded.sources[1]!;
  if (error.message.includes("Book")) return loaded.sources[2]!;
  return loaded.sources[0]!;
}

async function main(): Promise<void> {
  const [command, ...argumentsList] = process.argv.slice(2);
  if (command === "--help" || argumentsList.includes("--help")) {
    printUsage();
    return;
  }
  if (command !== "validate" && command !== "generate") usage();
  const root = option(argumentsList, "--root") ?? "data/narrative";
  const loaded = await loadCorpus(root);
  const schemaErrors = schemaErrorLines(loaded);
  if (schemaErrors.length > 0) {
    console.error(schemaErrors.join("\n"));
    process.exitCode = 1;
    return;
  }
  try {
    validateNarrativeCorpus(loaded.corpus);
  } catch (error) {
    const cause = error instanceof Error ? error : new Error("Unknown failure");
    throw errorAt(sourceForSemanticError(cause, loaded), "", cause.message);
  }
  if (command === "validate") {
    console.log(
      `Narrative corpus is valid: zero state and ${loaded.corpus.chapters.length} chapter source file(s).`,
    );
    return;
  }
  const output = option(argumentsList, "--output");
  const world = generateNarrativeWorld(
    loaded.corpus,
    option(argumentsList, "--chapter") ?? null,
  );
  const serializedWorld = `${JSON.stringify(world, null, 2)}\n`;
  if (!output) {
    process.stdout.write(serializedWorld);
    return;
  }
  const outputPath = path.resolve(repositoryRoot, output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serializedWorld);
  console.log(
    `Generated ${world.view.chapter ?? "pre-book"} world state at ${outputPath}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

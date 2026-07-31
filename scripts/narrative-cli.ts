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
  NarrativeStructureValidationError,
  prepareNarrativeCorpus,
  type FormatNarrativeStructureErrors,
  type NarrativeCorpus,
  type PreparedNarrativeCorpus,
  type NarrativeRecord,
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
  "Usage: narrative-cli.ts <validate|generate|manifest> [--root data/narrative] [--chapter 1.1] [--output /tmp/world.json]\n\nGenerate writes JSON to standard output by default. manifest writes generated/narrative/chapter-manifest.json unless --output is supplied.";

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
    if (asset.role === "body_surface") {
      const contents = await readFile(assetPath, "utf8");
      const startEdge = contents.match(
        /<rect\b[^>]*data-seam-edge="start"[^>]*\bx="0"[^>]*\bwidth="4"[^>]*\bheight="256"[^>]*\bfill="([^"]+)"/,
      );
      const endEdge = contents.match(
        /<rect\b[^>]*data-seam-edge="end"[^>]*\bx="508"[^>]*\bwidth="4"[^>]*\bheight="256"[^>]*\bfill="([^"]+)"/,
      );
      if (
        !asset.path.endsWith(".svg") ||
        !/<svg\b[^>]*\bwidth="512"[^>]*\bheight="256"[^>]*\bviewBox="0 0 512 256"/.test(
          contents,
        ) ||
        !/<svg\b[^>]*\bdata-seam-mode="matched-edge-strips"/.test(contents) ||
        !startEdge ||
        !endEdge ||
        startEdge[1] !== endEdge[1]
      ) {
        throw errorAt(
          assetsSource,
          `/assets/${index}/path`,
          `Body surface must be a 512 by 256 equirectangular SVG with matched horizontal edge strips: ${asset.path}.`,
        );
      }
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

function chapterManifest(loaded: LoadedCorpus): NarrativeRecord {
  const chapters = loaded.sources
    .filter((source) => source.definition === "chapter_source")
    .map((source) => {
      const chapter = source.value.chapter;
      if (typeof chapter !== "string")
        throw new Error(
          `Invalid chapter source: ${displayPath(source.filePath)}.`,
        );
      const [book, number] = chapter.split(".");
      return { chapter, path: `chapters/${book}/${number}.json` };
    })
    .sort((left, right) => {
      const [leftBook, leftChapter] = left.chapter.split(".").map(Number);
      const [rightBook, rightChapter] = right.chapter.split(".").map(Number);
      return leftBook! - rightBook! || leftChapter! - rightChapter!;
    });
  return { chapters };
}

async function assertCanonicalManifest(
  rootArgument: string,
  loaded: LoadedCorpus,
): Promise<void> {
  if (
    path.resolve(repositoryRoot, rootArgument) !==
    path.join(repositoryRoot, "data/narrative")
  )
    return;
  const manifestPath = path.join(
    repositoryRoot,
    "generated/narrative/chapter-manifest.json",
  );
  let candidate: unknown;
  try {
    candidate = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new Error(
      "generated/narrative/chapter-manifest.json is missing or invalid. Run npm run narrative:manifest.",
    );
  }
  const expected = `${JSON.stringify(chapterManifest(loaded))}\n`;
  const actual = `${JSON.stringify(candidate)}\n`;
  if (actual !== expected) {
    throw new Error(
      "generated/narrative/chapter-manifest.json is stale, out of order, or path-inconsistent. Run npm run narrative:manifest.",
    );
  }
}

function sourceSchemaErrorFormatter(
  loaded: LoadedCorpus,
): FormatNarrativeStructureErrors {
  return (definition, candidate, errors, label) => {
    const source = loaded.sources.find(
      (entry) => entry.definition === definition && entry.value === candidate,
    );
    if (!source) return [`${label} fails JSON Schema validation.`];
    return formatSchemaDiagnostics(errors, source.value, source.locations).map(
      (diagnostic) =>
        `${displayPath(source.filePath)}:${diagnostic.location.line}:${diagnostic.location.column}: error: ${diagnostic.message}`,
    );
  };
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

function pointerForSemanticError(error: Error): string {
  return /Chapter \d+\.\d+ (\/[^:]+):/.exec(error.message)?.[1] ?? "";
}

async function main(): Promise<void> {
  const [command, ...argumentsList] = process.argv.slice(2);
  if (command === "--help" || argumentsList.includes("--help")) {
    printUsage();
    return;
  }
  if (
    command !== "validate" &&
    command !== "generate" &&
    command !== "manifest"
  )
    usage();
  const root = option(argumentsList, "--root") ?? "data/narrative";
  const loaded = await loadCorpus(root);
  let prepared: PreparedNarrativeCorpus;
  try {
    prepared = prepareNarrativeCorpus(loaded.corpus, {
      formatStructureErrors: sourceSchemaErrorFormatter(loaded),
    });
  } catch (error) {
    if (error instanceof NarrativeStructureValidationError) {
      console.error(error.diagnostics.join("\n"));
      process.exitCode = 1;
      return;
    }
    const cause = error instanceof Error ? error : new Error("Unknown failure");
    throw errorAt(
      sourceForSemanticError(cause, loaded),
      pointerForSemanticError(cause),
      cause.message,
    );
  }
  if (command === "manifest") {
    const outputPath = path.resolve(
      repositoryRoot,
      option(argumentsList, "--output") ??
        "generated/narrative/chapter-manifest.json",
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(chapterManifest(loaded), null, 2)}\n`,
    );
    console.log(`Generated chapter manifest at ${outputPath}.`);
    return;
  }
  await assertCanonicalManifest(root, loaded);
  if (command === "validate") {
    console.log(
      `Narrative corpus is valid: zero state and ${loaded.corpus.chapters.length} chapter source file(s).`,
    );
    return;
  }
  const output = option(argumentsList, "--output");
  const world = generateNarrativeWorld(
    prepared,
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

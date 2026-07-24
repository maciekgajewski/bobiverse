import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import narrativeSchema from "../../data/schema/narrative-data-model.schema.json";

export type NarrativeRecord = Record<string, unknown>;

export interface NarrativeCorpus {
  assets: NarrativeRecord;
  baseline: NarrativeRecord;
  books: NarrativeRecord;
  chapters: NarrativeRecord[];
  knownAstronomyObjectIds: readonly string[];
}

export interface NarrativeEntity extends NarrativeRecord {
  id: string;
  entity_type: "character" | "event" | "location" | "species";
}

export interface NarrativeWorld {
  entities: NarrativeEntity[];
  view: {
    chapter: string | null;
    display_date: string | null;
  };
}

const schemaId = "https://bobiverse.local/schema/narrative-data-model.json";
const solarOrbitalIds = [
  "location:mercury",
  "location:venus",
  "location:earth",
  "location:mars",
  "location:asteroid-belt",
  "location:jupiter",
  "location:saturn",
  "location:uranus",
  "location:neptune",
  "location:kuiper-belt",
  "location:oort-cloud",
] as const;

function createAjv(): Ajv2020 {
  // The documented schema intentionally uses `required` inside conditional `not`
  // branches. That is valid Draft 2020-12, but Ajv's optional strictRequired lint
  // cannot infer the enclosing branch properties.
  return new Ajv2020({ allErrors: true, strict: false, verbose: true });
}

function errorMessage(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    )
    .join("; ");
}

function validatorFor(definition: string): ValidateFunction {
  const ajv = createAjv();
  ajv.addSchema(narrativeSchema);
  const validator = ajv.getSchema(`${schemaId}#/$defs/${definition}`);
  if (!validator)
    throw new Error(`Missing narrative schema definition: ${definition}.`);
  return validator;
}

function assertSchema(
  definition: string,
  candidate: unknown,
  label: string,
): void {
  const validator = validatorFor(definition);
  if (!validator(candidate)) {
    throw new Error(
      `${label} fails JSON Schema validation: ${errorMessage(validator.errors)}`,
    );
  }
}

/** Evaluates one authored source against its named JSON Schema definition. */
export function narrativeSchemaErrors(
  definition: string,
  candidate: unknown,
): ErrorObject[] {
  const validator = validatorFor(definition);
  if (validator(candidate)) return [];
  return [...(validator.errors ?? [])];
}

function asRecord(value: unknown, label: string): NarrativeRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as NarrativeRecord;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  return value;
}

function entityType(id: string): NarrativeEntity["entity_type"] {
  const prefix = id.split(":", 1)[0];
  if (
    prefix !== "character" &&
    prefix !== "event" &&
    prefix !== "location" &&
    prefix !== "species"
  ) {
    throw new Error(`Unsupported narrative entity ID: ${id}.`);
  }
  return prefix;
}

function compareChapter(left: string, right: string): number {
  const [leftBook, leftChapter] = left.split(".").map(Number);
  const [rightBook, rightChapter] = right.split(".").map(Number);
  return leftBook - rightBook || leftChapter - rightChapter;
}

/** Returns null when the date values cannot be ordered without inventing chronology. */
export function compareNarrativeDates(
  left: string,
  right: string,
): number | null {
  const [leftYearText, leftIndexText] = left.split(".");
  const [rightYearText, rightIndexText] = right.split(".");
  const yearDifference = Number(leftYearText) - Number(rightYearText);
  if (yearDifference !== 0) return yearDifference;
  if (leftIndexText === undefined && rightIndexText === undefined) return 0;
  if (leftIndexText === undefined || rightIndexText === undefined) return null;
  return Number(leftIndexText) - Number(rightIndexText);
}

function flattenBaseline(
  location: NarrativeRecord,
  parentLocationId: string | null,
  result: NarrativeEntity[],
): void {
  const id = asString(location.id, "Baseline location ID");
  const flattened: NarrativeEntity = {
    ...structuredClone(location),
    id,
    entity_type: "location",
  };
  delete flattened.children;
  if (parentLocationId) flattened.parent_location_id = parentLocationId;
  result.push(flattened);
  const children = location.children;
  if (!children) return;
  if (!Array.isArray(children))
    throw new Error(`Baseline children for ${id} must be an array.`);
  for (const child of children) {
    flattenBaseline(asRecord(child, `Baseline child of ${id}`), id, result);
  }
}

function assertBaselineSemantics(
  baseline: NarrativeRecord,
  knownAstronomyObjectIds: readonly string[],
): NarrativeEntity[] {
  const flattened: NarrativeEntity[] = [];
  flattenBaseline(baseline, null, flattened);
  const byId = new Map<string, NarrativeEntity>();
  for (const location of flattened) {
    if (byId.has(location.id))
      throw new Error(`Duplicate baseline entity ID: ${location.id}.`);
    byId.set(location.id, location);
  }
  const sol = byId.get("location:sol");
  if (!sol) throw new Error("Zero-state baseline must contain location:sol.");
  if (!knownAstronomyObjectIds.includes("sol")) {
    throw new Error(
      "Known astronomy data must contain sol for the zero-state baseline.",
    );
  }
  const rootChildren = flattened.filter(
    (location) => location.parent_location_id === "location:sol",
  );
  if (rootChildren.length !== solarOrbitalIds.length) {
    throw new Error(
      "Sol must have the required Solar-System orbital inventory.",
    );
  }
  const actualIds = rootChildren.map((location) => location.id);
  if (actualIds.some((id, index) => id !== solarOrbitalIds[index])) {
    throw new Error(
      "Sol's orbital children must use the documented inner-to-outer order.",
    );
  }
  for (const location of flattened) {
    const astronomyObjectId = location.astronomy_object_id;
    if (
      typeof astronomyObjectId === "string" &&
      !knownAstronomyObjectIds.includes(astronomyObjectId)
    ) {
      throw new Error(`Unknown astronomy object ID: ${astronomyObjectId}.`);
    }
  }
  return flattened;
}

function collectReferences(record: NarrativeRecord): string[] {
  const references: string[] = [];
  for (const field of [
    "character_id",
    "species_id",
    "picture_id",
    "death_event_id",
    "homeworld_id",
    "location_id",
    "parent_location_id",
    "origin_location_id",
    "destination_location_id",
  ]) {
    if (typeof record[field] === "string") references.push(record[field]);
  }
  if (Array.isArray(record.participant_ids)) {
    for (const id of record.participant_ids)
      if (typeof id === "string") references.push(id);
  }
  return references;
}

function assertReferencesResolve(
  record: NarrativeRecord,
  availableIds: ReadonlySet<string>,
  assetIds: ReadonlySet<string>,
  label: string,
): void {
  for (const reference of collectReferences(record)) {
    const resolves = reference.startsWith("asset:")
      ? assetIds.has(reference)
      : availableIds.has(reference);
    if (!resolves) {
      throw new Error(`${label} references unavailable entity ${reference}.`);
    }
  }
}

function chapterId(chapter: NarrativeRecord): string {
  return asString(chapter.chapter, "Chapter reference");
}

function chapterDate(chapter: NarrativeRecord): string {
  return asString(chapter.date, `Chapter ${chapterId(chapter)} date`);
}

function sourceProperties(
  record: NarrativeRecord,
  excludes: readonly string[],
): string[] {
  return Object.keys(record).filter((key) => !excludes.includes(key));
}

function assertTemporalWrites(chapters: NarrativeRecord[]): void {
  const writes = new Map<string, string[]>();
  const addWrites = (
    record: NarrativeRecord,
    date: string,
    excludes: readonly string[],
  ) => {
    const id = asString(
      record.id ?? record.entity_id,
      "Narrative write entity ID",
    );
    for (const property of sourceProperties(record, excludes)) {
      const key = `${id}\u0000${property}`;
      const previousDates = writes.get(key) ?? [];
      for (const previousDate of previousDates) {
        const ordering = compareNarrativeDates(previousDate, date);
        if (ordering === null || ordering === 0) {
          throw new Error(
            `State writes for ${id}.${property} have equal or incomparable dates (${previousDate}, ${date}).`,
          );
        }
      }
      previousDates.push(date);
      writes.set(key, previousDates);
    }
  };
  for (const chapter of chapters) {
    const date = chapterDate(chapter);
    for (const introduced of (chapter.introducing as unknown[] | undefined) ??
      []) {
      addWrites(
        asRecord(introduced, `Introduction in ${chapterId(chapter)}`),
        date,
        ["id"],
      );
    }
    for (const update of (chapter.updates as unknown[] | undefined) ?? []) {
      addWrites(asRecord(update, `Update in ${chapterId(chapter)}`), date, [
        "entity_id",
      ]);
    }
  }
}

/** Validates the complete authored corpus, including rules that require cross-record knowledge. */
export function validateNarrativeCorpus(corpus: NarrativeCorpus): void {
  assertSchema(
    "zero_state_solar_system",
    corpus.baseline,
    "Zero-state baseline",
  );
  assertSchema("assets_source", corpus.assets, "Asset registry");
  assertSchema("books_source", corpus.books, "Book catalogue");
  const baselineEntities = assertBaselineSemantics(
    corpus.baseline,
    corpus.knownAstronomyObjectIds,
  );
  const assets = corpus.assets.assets;
  const assetIds = new Set<string>();
  const assetPaths = new Set<string>();
  for (const candidate of Array.isArray(assets) ? assets : []) {
    const asset = asRecord(candidate, "Asset entry");
    const id = asString(asset.id, "Asset ID");
    const assetPath = asString(asset.path, `Asset path for ${id}`);
    if (assetIds.has(id) || assetPaths.has(assetPath)) {
      throw new Error(`Asset registry has a duplicate ID or path: ${id}.`);
    }
    assetIds.add(id);
    assetPaths.add(assetPath);
  }
  const availableIds = new Set(baselineEntities.map((entity) => entity.id));
  const books = asRecord(corpus.books.books, "Book catalogue books");
  const chapters = [...corpus.chapters].sort((left, right) =>
    compareChapter(chapterId(left), chapterId(right)),
  );
  const chapterIds = new Set<string>();
  for (const chapter of chapters) {
    assertSchema("chapter_source", chapter, `Chapter ${chapterId(chapter)}`);
    const id = chapterId(chapter);
    if (chapterIds.has(id))
      throw new Error(`Duplicate chapter reference: ${id}.`);
    chapterIds.add(id);
    const [book] = id.split(".");
    if (!(book in books))
      throw new Error(`Chapter ${id} belongs to an unknown book.`);
    const introductions = (chapter.introducing as unknown[] | undefined) ?? [];
    const introducedThisChapter = new Set<string>();
    for (const candidate of introductions) {
      const introduced = asRecord(candidate, `Introduction in ${id}`);
      const entityId = asString(introduced.id, `Introduction ID in ${id}`);
      if (availableIds.has(entityId) || introducedThisChapter.has(entityId)) {
        throw new Error(
          `Chapter ${id} introduces an existing entity: ${entityId}.`,
        );
      }
      assertReferencesResolve(
        introduced,
        new Set([...availableIds, ...introducedThisChapter]),
        assetIds,
        `Introduction ${entityId}`,
      );
      if (
        typeof introduced.astronomy_object_id === "string" &&
        !corpus.knownAstronomyObjectIds.includes(introduced.astronomy_object_id)
      ) {
        throw new Error(
          `Introduction ${entityId} has an unknown astronomy object ID.`,
        );
      }
      introducedThisChapter.add(entityId);
    }
    const availableAfterIntroductions = new Set([
      ...availableIds,
      ...introducedThisChapter,
    ]);
    const defaultLocationId = asString(
      chapter.location_id,
      `Chapter ${id} default location`,
    );
    if (!availableAfterIntroductions.has(defaultLocationId)) {
      throw new Error(
        `Chapter ${id} default location is unavailable: ${defaultLocationId}.`,
      );
    }
    if (!defaultLocationId.startsWith("location:")) {
      throw new Error(
        `Chapter ${id} default location must be a location entity.`,
      );
    }
    const updates = (chapter.updates as unknown[] | undefined) ?? [];
    const updatedIds = new Set<string>();
    for (const candidate of updates) {
      const update = asRecord(candidate, `Update in ${id}`);
      const targetId = asString(update.entity_id, `Update target in ${id}`);
      if (introducedThisChapter.has(targetId)) {
        throw new Error(
          `Chapter ${id} cannot update its own introduction: ${targetId}.`,
        );
      }
      if (!availableIds.has(targetId))
        throw new Error(
          `Chapter ${id} updates unavailable entity: ${targetId}.`,
        );
      if (updatedIds.has(targetId))
        throw new Error(`Chapter ${id} has multiple updates for ${targetId}.`);
      updatedIds.add(targetId);
      assertReferencesResolve(
        update,
        availableIds,
        assetIds,
        `Update ${targetId}`,
      );
      if (
        typeof update.astronomy_object_id === "string" &&
        !corpus.knownAstronomyObjectIds.includes(update.astronomy_object_id)
      ) {
        throw new Error(
          `Update ${targetId} has an unknown astronomy object ID.`,
        );
      }
    }
    for (const candidate of (chapter.appearances as unknown[] | undefined) ??
      []) {
      const appearance = asRecord(candidate, `Appearance in ${id}`);
      assertReferencesResolve(
        appearance,
        availableAfterIntroductions,
        assetIds,
        `Appearance in ${id}`,
      );
    }
    for (const entityId of introducedThisChapter) availableIds.add(entityId);
  }
  assertTemporalWrites(chapters);
}

function applyProperties(
  entity: NarrativeEntity,
  write: NarrativeRecord,
  date: string,
  latestDates: Map<string, string>,
  excludes: readonly string[],
): void {
  for (const property of sourceProperties(write, excludes)) {
    const key = `${entity.id}\u0000${property}`;
    const priorDate = latestDates.get(key);
    if (!priorDate || (compareNarrativeDates(priorDate, date) ?? -1) < 0) {
      entity[property] = structuredClone(write[property]);
      latestDates.set(key, date);
    }
  }
}

function deriveLocationChildren(entities: NarrativeEntity[]): void {
  const locations = new Map(
    entities
      .filter((entity) => entity.entity_type === "location")
      .map((entity) => [entity.id, entity]),
  );
  for (const location of locations.values()) location.child_ids = [];
  for (const location of locations.values()) {
    const parentId = location.parent_location_id;
    if (typeof parentId !== "string") continue;
    const parent = locations.get(parentId);
    if (parent) (parent.child_ids as string[]).push(location.id);
  }
}

/** Builds the reader-safe world state for a selected chapter, or the pre-book zero state. */
export function generateNarrativeWorld(
  corpus: NarrativeCorpus,
  selectedChapterId: string | null = null,
): NarrativeWorld {
  validateNarrativeCorpus(corpus);
  const chapters = [...corpus.chapters].sort((left, right) =>
    compareChapter(chapterId(left), chapterId(right)),
  );
  const selectedChapter = selectedChapterId
    ? chapters.find((chapter) => chapterId(chapter) === selectedChapterId)
    : undefined;
  if (selectedChapterId && !selectedChapter) {
    throw new Error(`Requested chapter does not exist: ${selectedChapterId}.`);
  }
  const displayDate = selectedChapter ? chapterDate(selectedChapter) : null;
  const entities = assertBaselineSemantics(
    corpus.baseline,
    corpus.knownAstronomyObjectIds,
  ).map((entity) => structuredClone(entity));
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const latestDates = new Map<string, string>();
  const readerVisible = selectedChapter
    ? chapters.filter(
        (chapter) =>
          compareChapter(chapterId(chapter), selectedChapterId!) <= 0,
      )
    : [];
  for (const chapter of readerVisible) {
    const date = chapterDate(chapter);
    if (displayDate && (compareNarrativeDates(date, displayDate) ?? 1) > 0)
      continue;
    for (const candidate of (chapter.introducing as unknown[] | undefined) ??
      []) {
      const introduced = asRecord(
        candidate,
        `Introduction in ${chapterId(chapter)}`,
      );
      const id = asString(
        introduced.id,
        `Introduction ID in ${chapterId(chapter)}`,
      );
      const entity: NarrativeEntity = { id, entity_type: entityType(id) };
      applyProperties(entity, introduced, date, latestDates, ["id"]);
      byId.set(id, entity);
      entities.push(entity);
    }
    for (const candidate of (chapter.updates as unknown[] | undefined) ?? []) {
      const update = asRecord(candidate, `Update in ${chapterId(chapter)}`);
      const targetId = asString(
        update.entity_id,
        `Update target in ${chapterId(chapter)}`,
      );
      const target = byId.get(targetId);
      if (target)
        applyProperties(target, update, date, latestDates, ["entity_id"]);
    }
  }
  deriveLocationChildren(entities);
  return {
    entities,
    view: {
      chapter: selectedChapterId,
      display_date: displayDate,
    },
  };
}

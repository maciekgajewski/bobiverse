import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import narrativeSchema from "../../data/schema/narrative-data-model.schema.json";

export type NarrativeRecord = Record<string, unknown>;

export interface NarrativeCorpus {
  assets: NarrativeRecord;
  zeroState: NarrativeRecord;
  books: NarrativeRecord;
  chapters: NarrativeRecord[];
  knownAstronomyObjectIds: readonly string[];
}

declare const preparedNarrativeCorpusBrand: unique symbol;

export interface PreparedNarrativeCorpus extends NarrativeCorpus {
  readonly [preparedNarrativeCorpusBrand]: true;
}

export interface NarrativeEntity extends NarrativeRecord {
  id: string;
  entity_type:
    | "character"
    | "event"
    | "location"
    | "organization"
    | "species"
    | "technology"
    | "vessel";
  last_known_location?: {
    location_id: string;
    source_chapter: string;
    effective_date: string;
  };
}

export const narrativeActivityReasons = [
  "introduction",
  "update",
  "appearance",
  "appearance_location",
  "chapter_location",
  "event",
  "event_participant",
  "event_location",
  "mention",
  "mapped_system_ancestry",
] as const;

export type NarrativeActivityReason = (typeof narrativeActivityReasons)[number];

export interface NarrativeActivity {
  entity_id: string;
  source_chapter: string;
  effective_date: string | null;
  reasons: NarrativeActivityReason[];
}

export interface MeaningfulNarrativeDate {
  date: string;
  source_chapters: readonly string[];
}

export interface NarrativeWorld {
  entities: NarrativeEntity[];
  activity: NarrativeActivity[];
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

const narrativeAjv = createAjv();
narrativeAjv.addSchema(narrativeSchema);
const narrativeValidators = new Map<string, ValidateFunction>();
const validatorCompilationCounts = new Map<string, number>();

function errorMessage(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    )
    .join("; ");
}

function validatorFor(definition: string): ValidateFunction {
  const cached = narrativeValidators.get(definition);
  if (cached) return cached;
  const validator = narrativeAjv.getSchema(`${schemaId}#/$defs/${definition}`);
  if (!validator)
    throw new Error(`Missing narrative schema definition: ${definition}.`);
  narrativeValidators.set(definition, validator);
  validatorCompilationCounts.set(
    definition,
    (validatorCompilationCounts.get(definition) ?? 0) + 1,
  );
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

/** Exposes module-lifetime validator compilation counts for deterministic tests. */
export function narrativeValidatorCompilationCounts(): ReadonlyMap<
  string,
  number
> {
  return new Map(validatorCompilationCounts);
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
    prefix !== "organization" &&
    prefix !== "species" &&
    prefix !== "technology" &&
    prefix !== "vessel"
  ) {
    throw new Error(`Unsupported narrative entity ID: ${id}.`);
  }
  return prefix;
}

export function compareNarrativeChapters(left: string, right: string): number {
  const [leftBook, leftChapter] = left.split(".").map(Number);
  const [rightBook, rightChapter] = right.split(".").map(Number);
  return leftBook - rightBook || leftChapter - rightChapter;
}

function compareChapter(left: string, right: string): number {
  return compareNarrativeChapters(left, right);
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

export interface NarrativeMoment {
  date: string;
  sourceChapter: string;
}

export function compareNarrativeMoments(
  left: NarrativeMoment,
  right: NarrativeMoment,
): number | null {
  const dateOrdering = compareNarrativeDates(left.date, right.date);
  if (dateOrdering === null || dateOrdering !== 0) return dateOrdering;
  const bothYearOnly = !left.date.includes(".") && !right.date.includes(".");
  if (bothYearOnly) {
    return compareChapter(left.sourceChapter, right.sourceChapter);
  }
  return 0;
}

function flattenZeroStateLocation(
  location: NarrativeRecord,
  parentLocationId: string | null,
  result: NarrativeEntity[],
): void {
  const id = asString(location.id, "Zero-state location ID");
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
    throw new Error(`Zero-state children for ${id} must be an array.`);
  for (const child of children) {
    flattenZeroStateLocation(
      asRecord(child, `Zero-state child of ${id}`),
      id,
      result,
    );
  }
}

function assertZeroStateSemantics(
  zeroState: NarrativeRecord,
  knownAstronomyObjectIds: readonly string[],
): NarrativeEntity[] {
  const flattened: NarrativeEntity[] = [];
  flattenZeroStateLocation(
    asRecord(zeroState.locations, "Zero-state locations"),
    null,
    flattened,
  );
  const seededEntities = zeroState.entities;
  if (!Array.isArray(seededEntities))
    throw new Error("Zero-state entities must be an array.");
  for (const candidate of seededEntities) {
    const entity = asRecord(candidate, "Zero-state entity");
    const id = asString(entity.id, "Zero-state entity ID");
    flattened.push({
      ...structuredClone(entity),
      id,
      entity_type: entityType(id),
    });
  }
  const byId = new Map<string, NarrativeEntity>();
  for (const entity of flattened) {
    if (byId.has(entity.id))
      throw new Error(`Duplicate zero-state entity ID: ${entity.id}.`);
    byId.set(entity.id, entity);
  }
  const sol = byId.get("location:sol");
  if (!sol) throw new Error("Zero-state source must contain location:sol.");
  if (!knownAstronomyObjectIds.includes("sol")) {
    throw new Error(
      "Known astronomy data must contain sol for the zero-state source.",
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

function chapterSemanticError(
  chapter: string,
  pointer: string,
  message: string,
): Error {
  return new Error(`Chapter ${chapter} ${pointer}: ${message}`);
}

function sourceProperties(
  record: NarrativeRecord,
  excludes: readonly string[],
): string[] {
  return Object.keys(record).filter((key) => !excludes.includes(key));
}

function assertTemporalWrites(chapters: NarrativeRecord[]): void {
  const writes = new Map<string, NarrativeMoment[]>();
  const addWrites = (
    record: NarrativeRecord,
    moment: NarrativeMoment,
    excludes: readonly string[],
  ) => {
    const id = asString(
      record.id ?? record.entity_id,
      "Narrative write entity ID",
    );
    for (const property of sourceProperties(record, excludes)) {
      const key = `${id}\u0000${property}`;
      const previousMoments = writes.get(key) ?? [];
      for (const previousMoment of previousMoments) {
        const ordering = compareNarrativeMoments(previousMoment, moment);
        if (ordering === null || ordering === 0) {
          throw new Error(
            `State writes for ${id}.${property} have equal or incomparable moments (${previousMoment.date} @ ${previousMoment.sourceChapter}, ${moment.date} @ ${moment.sourceChapter}).`,
          );
        }
      }
      previousMoments.push(moment);
      writes.set(key, previousMoments);
    }
  };
  for (const chapter of chapters) {
    const date = chapterDate(chapter);
    const sourceChapter = chapterId(chapter);
    const moment = { date, sourceChapter };
    for (const introduced of (chapter.introducing as unknown[] | undefined) ??
      []) {
      addWrites(
        asRecord(introduced, `Introduction in ${sourceChapter}`),
        moment,
        ["id"],
      );
    }
    for (const update of (chapter.updates as unknown[] | undefined) ?? []) {
      addWrites(asRecord(update, `Update in ${sourceChapter}`), moment, [
        "entity_id",
      ]);
    }
  }
}

export class NarrativeStructureValidationError extends Error {
  constructor(public readonly diagnostics: readonly string[]) {
    super(diagnostics.join("\n"));
    this.name = "NarrativeStructureValidationError";
  }
}

export type FormatNarrativeStructureErrors = (
  definition: string,
  candidate: unknown,
  errors: readonly ErrorObject[],
  label: string,
) => readonly string[];

function validateNarrativeCorpusStructure(
  corpus: NarrativeCorpus,
  formatErrors?: FormatNarrativeStructureErrors,
): void {
  const candidates: Array<{
    definition: string;
    candidate: unknown;
    label: string;
  }> = [
    {
      definition: "zero_state_source",
      candidate: corpus.zeroState,
      label: "Zero-state source",
    },
    {
      definition: "assets_source",
      candidate: corpus.assets,
      label: "Asset registry",
    },
    {
      definition: "books_source",
      candidate: corpus.books,
      label: "Book catalogue",
    },
    ...corpus.chapters.map((chapter) => ({
      definition: "chapter_source",
      candidate: chapter,
      label: `Chapter ${String(chapter.chapter ?? "unknown")}`,
    })),
  ];
  const diagnostics: string[] = [];
  for (const { definition, candidate, label } of candidates) {
    const errors = narrativeSchemaErrors(definition, candidate);
    if (errors.length === 0) continue;
    const formatted = formatErrors?.(definition, candidate, errors, label);
    diagnostics.push(
      ...(formatted && formatted.length > 0
        ? formatted
        : [`${label} fails JSON Schema validation: ${errorMessage(errors)}`]),
    );
  }
  if (diagnostics.length > 0)
    throw new NarrativeStructureValidationError(diagnostics);
}

function validateNarrativeCorpusSemantics(corpus: NarrativeCorpus): void {
  const zeroStateEntities = assertZeroStateSemantics(
    corpus.zeroState,
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
  const availableIds = new Set(zeroStateEntities.map((entity) => entity.id));
  for (const entity of zeroStateEntities) {
    assertReferencesResolve(
      entity,
      availableIds,
      assetIds,
      `Zero-state entity ${entity.id}`,
    );
  }
  const books = asRecord(corpus.books.books, "Book catalogue books");
  const chapters = [...corpus.chapters].sort((left, right) =>
    compareChapter(chapterId(left), chapterId(right)),
  );
  const introductionChapters = new Map<string, string>();
  for (const chapter of chapters) {
    for (const candidate of (chapter.introducing as unknown[] | undefined) ??
      []) {
      const introduced = asRecord(
        candidate,
        `Introduction in ${chapterId(chapter)}`,
      );
      introductionChapters.set(
        asString(introduced.id, `Introduction ID in ${chapterId(chapter)}`),
        chapterId(chapter),
      );
    }
  }
  const chapterIds = new Set<string>();
  for (const chapter of chapters) {
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
    const structuralMentionTargets = new Set<string>([
      ...introducedThisChapter,
      ...updatedIds,
      defaultLocationId,
    ]);
    for (const appearance of (chapter.appearances as unknown[] | undefined) ??
      []) {
      const record = asRecord(appearance, `Appearance in ${id}`);
      const characterId = record.character_id;
      if (typeof characterId === "string")
        structuralMentionTargets.add(characterId);
    }
    for (const candidate of [...introductions, ...updates]) {
      const record = asRecord(candidate, `Event source in ${id}`);
      const eventId = record.id ?? record.entity_id;
      if (typeof eventId !== "string" || !eventId.startsWith("event:"))
        continue;
      structuralMentionTargets.add(eventId);
      if (typeof record.location_id === "string")
        structuralMentionTargets.add(record.location_id);
      if (Array.isArray(record.participant_ids)) {
        for (const participantId of record.participant_ids) {
          if (typeof participantId === "string")
            structuralMentionTargets.add(participantId);
        }
      }
    }
    for (const [index, target] of (
      (chapter.mentions as unknown[] | undefined) ?? []
    ).entries()) {
      const pointer = `/mentions/${index}`;
      if (typeof target !== "string") continue;
      if (!availableAfterIntroductions.has(target)) {
        const introducedIn = introductionChapters.get(target);
        if (introducedIn && compareChapter(introducedIn, id) > 0) {
          throw chapterSemanticError(
            id,
            pointer,
            `important mention target is introduced later in chapter ${introducedIn}: ${target}.`,
          );
        }
        throw chapterSemanticError(
          id,
          pointer,
          `important mention target is unknown: ${target}.`,
        );
      }
      if (structuralMentionTargets.has(target)) {
        throw chapterSemanticError(
          id,
          pointer,
          `important mention target is already represented structurally in this chapter: ${target}.`,
        );
      }
    }
    for (const entityId of introducedThisChapter) availableIds.add(entityId);
  }
  assertTemporalWrites(chapters);
}

/** Validates the complete authored corpus, including cross-record semantic rules. */
export function validateNarrativeCorpus(corpus: NarrativeCorpus): void {
  validateNarrativeCorpusStructure(corpus);
  validateNarrativeCorpusSemantics(corpus);
}

interface PreparedNarrativeIndexes {
  chapters: readonly NarrativeRecord[];
  chapterById: ReadonlyMap<string, NarrativeRecord>;
  meaningfulDateOptions: Map<string, readonly MeaningfulNarrativeDate[]>;
}

const preparedNarrativeIndexes = new WeakMap<
  PreparedNarrativeCorpus,
  PreparedNarrativeIndexes
>();
const narrativePreparationCounts = new WeakMap<NarrativeCorpus, number>();

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export interface PrepareNarrativeCorpusOptions {
  /** Formats structural failures without replacing their mandatory evaluation. */
  formatStructureErrors?: FormatNarrativeStructureErrors;
}

/**
 * Validates and isolates authored input once, then returns the immutable corpus
 * accepted by reader-safe projection APIs.
 */
export function prepareNarrativeCorpus(
  rawCorpus: NarrativeCorpus,
  options: PrepareNarrativeCorpusOptions = {},
): PreparedNarrativeCorpus {
  validateNarrativeCorpusStructure(rawCorpus, options.formatStructureErrors);
  validateNarrativeCorpusSemantics(rawCorpus);
  const prepared = deepFreeze(
    structuredClone(rawCorpus),
  ) as PreparedNarrativeCorpus;
  const chapters = [...prepared.chapters].sort((left, right) =>
    compareChapter(chapterId(left), chapterId(right)),
  );
  preparedNarrativeIndexes.set(prepared, {
    chapters,
    chapterById: new Map(
      chapters.map((chapter) => [chapterId(chapter), chapter]),
    ),
    meaningfulDateOptions: new Map(),
  });
  narrativePreparationCounts.set(
    rawCorpus,
    (narrativePreparationCounts.get(rawCorpus) ?? 0) + 1,
  );
  return prepared;
}

/** Reports successful preparation count for one raw corpus for deterministic tests. */
export function narrativeCorpusPreparationCount(
  rawCorpus: NarrativeCorpus,
): number {
  return narrativePreparationCounts.get(rawCorpus) ?? 0;
}

function indexesFor(corpus: PreparedNarrativeCorpus): PreparedNarrativeIndexes {
  const indexes = preparedNarrativeIndexes.get(corpus);
  if (!indexes) {
    throw new Error(
      "Narrative corpus must cross prepareNarrativeCorpus before projection.",
    );
  }
  return indexes;
}

function applyProperties(
  entity: NarrativeEntity,
  write: NarrativeRecord,
  moment: NarrativeMoment,
  latestMoments: Map<string, NarrativeMoment>,
  excludes: readonly string[],
): void {
  for (const property of sourceProperties(write, excludes)) {
    const key = `${entity.id}\u0000${property}`;
    const priorMoment = latestMoments.get(key);
    if (
      !priorMoment ||
      (compareNarrativeMoments(priorMoment, moment) ?? -1) < 0
    ) {
      entity[property] = structuredClone(write[property]);
      latestMoments.set(key, moment);
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

interface EligibleAppearance {
  location_id: string;
  source_chapter: string;
  effective_date: string;
}

function deriveLastKnownLocations(
  entities: NarrativeEntity[],
  chapters: readonly NarrativeRecord[],
  displayDate: string | null,
): void {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const appearances = new Map<string, EligibleAppearance[]>();
  for (const chapter of chapters) {
    const effectiveDate = chapterDate(chapter);
    if (!isDateAtOrBefore(effectiveDate, displayDate)) continue;
    const sourceChapter = chapterId(chapter);
    for (const candidate of (chapter.appearances as unknown[] | undefined) ??
      []) {
      const appearance = asRecord(candidate, `Appearance in ${sourceChapter}`);
      const characterId = asString(
        appearance.character_id,
        `Appearance character in ${sourceChapter}`,
      );
      const locationId = asString(
        appearance.location_id ?? chapter.location_id,
        `Appearance location in ${sourceChapter}`,
      );
      if (!byId.has(characterId) || !byId.has(locationId)) continue;
      const eligible = appearances.get(characterId) ?? [];
      eligible.push({
        location_id: locationId,
        source_chapter: sourceChapter,
        effective_date: effectiveDate,
      });
      appearances.set(characterId, eligible);
    }
  }
  for (const [characterId, candidates] of appearances) {
    const uniquelyLatest = candidates.filter((candidate, candidateIndex) =>
      candidates.every((other, otherIndex) => {
        if (candidateIndex === otherIndex) return true;
        const ordering = compareNarrativeMoments(
          {
            date: other.effective_date,
            sourceChapter: other.source_chapter,
          },
          {
            date: candidate.effective_date,
            sourceChapter: candidate.source_chapter,
          },
        );
        return ordering !== null && ordering < 0;
      }),
    );
    if (uniquelyLatest.length !== 1) continue;
    const character = byId.get(characterId);
    if (character?.entity_type === "character") {
      character.last_known_location = uniquelyLatest[0];
    }
  }
}

function applySourceRecord(
  entity: NarrativeEntity,
  source: NarrativeRecord,
  excludes: readonly string[],
): void {
  for (const property of sourceProperties(source, excludes)) {
    entity[property] = structuredClone(source[property]);
  }
}

function isDateAtOrBefore(date: string, displayDate: string | null): boolean {
  if (!displayDate) return true;
  const ordering = compareNarrativeDates(date, displayDate);
  return ordering !== null && ordering <= 0;
}

function activityStableTieOrder(
  left: NarrativeActivity,
  right: NarrativeActivity,
): number {
  return (
    compareChapter(left.source_chapter, right.source_chapter) ||
    (left.effective_date ?? "").localeCompare(right.effective_date ?? "") ||
    left.entity_id.localeCompare(right.entity_id)
  );
}

function activityDefinitivelyPrecedes(
  left: NarrativeActivity,
  right: NarrativeActivity,
): boolean {
  if (!left.effective_date || !right.effective_date) return false;
  const ordering = compareNarrativeMoments(
    {
      date: left.effective_date,
      sourceChapter: left.source_chapter,
    },
    {
      date: right.effective_date,
      sourceChapter: right.source_chapter,
    },
  );
  return ordering !== null && ordering < 0;
}

function orderNarrativeActivity(
  records: NarrativeActivity[],
): NarrativeActivity[] {
  const remaining = [...records];
  const ordered: NarrativeActivity[] = [];
  while (remaining.length > 0) {
    const available = remaining
      .filter(
        (candidate) =>
          !remaining.some(
            (other) =>
              other !== candidate &&
              activityDefinitivelyPrecedes(other, candidate),
          ),
      )
      .sort(activityStableTieOrder);
    const next = available[0];
    if (!next) {
      throw new Error("Narrative activity ordering contains a cycle.");
    }
    ordered.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }
  return ordered;
}

function mappedSystemForLocation(
  locations: ReadonlyMap<string, NarrativeEntity>,
  locationId: string,
): string | null {
  const visited = new Set<string>();
  let current = locations.get(locationId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.kind === "star_system" &&
      typeof current.astronomy_object_id === "string"
    ) {
      return current.id;
    }
    const parentId = current.parent_location_id;
    current =
      typeof parentId === "string" ? locations.get(parentId) : undefined;
  }
  return null;
}

function generateNarrativeActivity(
  zeroState: NarrativeRecord,
  chapters: readonly NarrativeRecord[],
  knownAstronomyObjectIds: readonly string[],
): NarrativeActivity[] {
  const entities = assertZeroStateSemantics(
    zeroState,
    knownAstronomyObjectIds,
  ).map((entity) => structuredClone(entity));
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const activityByKey = new Map<string, NarrativeActivity>();
  const reasonOrder = new Map(
    narrativeActivityReasons.map((reason, index) => [reason, index]),
  );
  const add = (
    entityId: string,
    sourceChapter: string,
    effectiveDate: string | null,
    reason: NarrativeActivityReason,
  ) => {
    const key = `${entityId}\u0000${sourceChapter}\u0000${effectiveDate ?? ""}`;
    const existing = activityByKey.get(key);
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      return;
    }
    activityByKey.set(key, {
      entity_id: entityId,
      source_chapter: sourceChapter,
      effective_date: effectiveDate,
      reasons: [reason],
    });
  };
  const addLocationActivity = (
    locationId: string,
    sourceChapter: string,
    effectiveDate: string | null,
    reason: NarrativeActivityReason,
  ) => {
    add(locationId, sourceChapter, effectiveDate, reason);
    const locations = new Map(
      [...byId.values()]
        .filter((entity) => entity.entity_type === "location")
        .map((entity) => [entity.id, entity]),
    );
    const mappedSystem = mappedSystemForLocation(locations, locationId);
    if (mappedSystem)
      add(mappedSystem, sourceChapter, effectiveDate, "mapped_system_ancestry");
  };
  const addEventActivity = (event: NarrativeEntity, sourceChapter: string) => {
    const effectiveDate = typeof event.date === "string" ? event.date : null;
    add(event.id, sourceChapter, effectiveDate, "event");
    if (typeof event.location_id === "string") {
      addLocationActivity(
        event.location_id,
        sourceChapter,
        effectiveDate,
        "event_location",
      );
    }
    if (Array.isArray(event.participant_ids)) {
      for (const participantId of event.participant_ids) {
        if (typeof participantId === "string")
          add(participantId, sourceChapter, effectiveDate, "event_participant");
      }
    }
  };

  for (const chapter of chapters) {
    const sourceChapter = chapterId(chapter);
    const date = chapterDate(chapter);
    const eventIds = new Set<string>();
    for (const candidate of (chapter.introducing as unknown[] | undefined) ??
      []) {
      const introduced = asRecord(
        candidate,
        `Introduction in ${sourceChapter}`,
      );
      const id = asString(introduced.id, `Introduction ID in ${sourceChapter}`);
      const entity: NarrativeEntity = {
        ...structuredClone(introduced),
        id,
        entity_type: entityType(id),
      };
      byId.set(id, entity);
      if (entity.entity_type === "event") {
        eventIds.add(id);
      } else {
        add(id, sourceChapter, date, "introduction");
      }
    }
    for (const candidate of (chapter.updates as unknown[] | undefined) ?? []) {
      const update = asRecord(candidate, `Update in ${sourceChapter}`);
      const id = asString(
        update.entity_id,
        `Update target in ${sourceChapter}`,
      );
      const entity = byId.get(id);
      if (!entity) continue;
      applySourceRecord(entity, update, ["entity_id"]);
      if (entity.entity_type === "event") {
        eventIds.add(id);
        add(
          id,
          sourceChapter,
          typeof entity.date === "string" ? entity.date : null,
          "update",
        );
      } else {
        add(id, sourceChapter, date, "update");
      }
    }
    for (const candidate of (chapter.appearances as unknown[] | undefined) ??
      []) {
      const appearance = asRecord(candidate, `Appearance in ${sourceChapter}`);
      const characterId = asString(
        appearance.character_id,
        `Appearance character in ${sourceChapter}`,
      );
      add(characterId, sourceChapter, date, "appearance");
      const locationId = appearance.location_id ?? chapter.location_id;
      if (typeof locationId === "string")
        addLocationActivity(
          locationId,
          sourceChapter,
          date,
          "appearance_location",
        );
    }
    const chapterLocation = asString(
      chapter.location_id,
      `Chapter ${sourceChapter} default location`,
    );
    addLocationActivity(
      chapterLocation,
      sourceChapter,
      date,
      "chapter_location",
    );
    for (const target of (chapter.mentions as unknown[] | undefined) ?? []) {
      if (typeof target === "string")
        add(target, sourceChapter, date, "mention");
    }
    for (const eventId of eventIds) {
      const event = byId.get(eventId);
      if (event?.entity_type === "event")
        addEventActivity(event, sourceChapter);
    }
  }
  return orderNarrativeActivity(
    [...activityByKey.values()].map((activity) => ({
      ...activity,
      reasons: [...activity.reasons].sort(
        (left, right) => reasonOrder.get(left)! - reasonOrder.get(right)!,
      ),
    })),
  );
}

/** Builds the reader-safe world state for a selected chapter, or the pre-book zero state. */
export function generateNarrativeWorld(
  corpus: PreparedNarrativeCorpus,
  selectedChapterId: string | null = null,
  requestedDisplayDate: string | null = null,
): NarrativeWorld {
  const indexes = indexesFor(corpus);
  const chapters = indexes.chapters;
  const selectedChapter = selectedChapterId
    ? indexes.chapterById.get(selectedChapterId)
    : undefined;
  if (selectedChapterId && !selectedChapter) {
    throw new Error(`Requested chapter does not exist: ${selectedChapterId}.`);
  }
  if (requestedDisplayDate && !selectedChapter) {
    throw new Error("A requested display date requires a knowledge chapter.");
  }
  if (
    requestedDisplayDate &&
    selectedChapterId &&
    !meaningfulNarrativeDates(corpus, selectedChapterId).includes(
      requestedDisplayDate,
    )
  ) {
    throw new Error(
      `Requested display date is not meaningful and projection-safe: ${requestedDisplayDate}.`,
    );
  }
  const displayDate = selectedChapter
    ? (requestedDisplayDate ?? chapterDate(selectedChapter))
    : null;
  const entities = assertZeroStateSemantics(
    corpus.zeroState,
    corpus.knownAstronomyObjectIds,
  ).map((entity) => structuredClone(entity));
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const latestMoments = new Map<string, NarrativeMoment>();
  const readerVisible = selectedChapter
    ? chapters.filter(
        (chapter) =>
          compareChapter(chapterId(chapter), selectedChapterId!) <= 0,
      )
    : [];
  for (const chapter of readerVisible) {
    const date = chapterDate(chapter);
    const sourceChapter = chapterId(chapter);
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
      const type = entityType(id);
      if (
        type === "event" &&
        typeof introduced.date !== "string" &&
        requestedDisplayDate
      )
        continue;
      const effectiveDate =
        type === "event" && typeof introduced.date === "string"
          ? introduced.date
          : date;
      if (!isDateAtOrBefore(effectiveDate, displayDate)) continue;
      const entity: NarrativeEntity = { id, entity_type: type };
      applyProperties(
        entity,
        introduced,
        { date: effectiveDate, sourceChapter },
        latestMoments,
        ["id"],
      );
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
      if (!target) continue;
      if (
        target.entity_type === "event" &&
        typeof update.date !== "string" &&
        typeof target.date !== "string" &&
        requestedDisplayDate
      )
        continue;
      const effectiveDate =
        target.entity_type === "event"
          ? typeof update.date === "string"
            ? update.date
            : typeof target.date === "string"
              ? target.date
              : date
          : date;
      if (!isDateAtOrBefore(effectiveDate, displayDate)) continue;
      applyProperties(
        target,
        update,
        { date: effectiveDate, sourceChapter },
        latestMoments,
        ["entity_id"],
      );
    }
  }
  deriveLocationChildren(entities);
  deriveLastKnownLocations(entities, readerVisible, displayDate);
  const world: NarrativeWorld = {
    entities,
    activity: generateNarrativeActivity(
      corpus.zeroState,
      readerVisible,
      corpus.knownAstronomyObjectIds,
    ),
    view: {
      chapter: selectedChapterId,
      display_date: displayDate,
    },
  };
  assertSchema("narrative_world", world, "Generated narrative world");
  return world;
}

/**
 * Returns only reader-visible dates for which the story-state projection has a
 * determinate answer. Date-mode callers must use this rather than inventing a
 * calendar position or comparing year-only and indexed values themselves.
 */
export function meaningfulNarrativeDateOptions(
  corpus: PreparedNarrativeCorpus,
  knowledgeChapterId: string,
): readonly MeaningfulNarrativeDate[] {
  const indexes = indexesFor(corpus);
  const cached = indexes.meaningfulDateOptions.get(knowledgeChapterId);
  if (cached) return cached;
  const chapters = indexes.chapters.filter(
    (chapter) => compareChapter(chapterId(chapter), knowledgeChapterId) <= 0,
  );
  if (!indexes.chapterById.has(knowledgeChapterId)) {
    throw new Error(`Requested chapter does not exist: ${knowledgeChapterId}.`);
  }
  const candidates = new Map<string, Set<string>>();
  const addCandidate = (date: string, sourceChapter: string) => {
    const sources = candidates.get(date) ?? new Set<string>();
    sources.add(sourceChapter);
    candidates.set(date, sources);
  };
  for (const chapter of chapters) {
    addCandidate(chapterDate(chapter), chapterId(chapter));
  }
  for (const activity of generateNarrativeActivity(
    corpus.zeroState,
    chapters,
    corpus.knownAstronomyObjectIds,
  )) {
    if (activity.effective_date) {
      addCandidate(activity.effective_date, activity.source_chapter);
    }
  }
  const stateDates = chapters.flatMap((chapter) => {
    const date = chapterDate(chapter);
    const writes = [
      ...((chapter.introducing as unknown[] | undefined) ?? []),
      ...((chapter.updates as unknown[] | undefined) ?? []),
    ].filter((candidate) => {
      const record = asRecord(candidate, "Narrative state write");
      const id = record.id ?? record.entity_id;
      return typeof id !== "string" || !id.startsWith("event:");
    });
    return writes.length === 0 ? [] : [date];
  });
  const options = deepFreeze(
    [...candidates.entries()]
      .filter(([candidate]) =>
        stateDates.every(
          (stateDate) => compareNarrativeDates(stateDate, candidate) !== null,
        ),
      )
      .sort(([left], [right]) => {
        const ordering = compareNarrativeDates(left, right);
        return ordering ?? left.localeCompare(right);
      })
      .map(([date, sourceChapters]) => ({
        date,
        source_chapters: [...sourceChapters].sort(compareChapter),
      })),
  );
  indexes.meaningfulDateOptions.set(knowledgeChapterId, options);
  return options;
}

export function meaningfulNarrativeDates(
  corpus: PreparedNarrativeCorpus,
  knowledgeChapterId: string,
): string[] {
  return meaningfulNarrativeDateOptions(corpus, knowledgeChapterId).map(
    ({ date }) => date,
  );
}

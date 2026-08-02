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

export interface NarrativeChapterRelationship {
  id: string;
  name: string;
}

export interface NarrativeChapterDetail {
  chapter: string;
  bookNumber: string;
  bookTitle: string;
  localNumber: string;
  title: string;
  summary: string;
  pictureId: string | null;
  location: NarrativeChapterRelationship;
  leadCharacters: readonly NarrativeChapterRelationship[];
  events: readonly NarrativeChapterRelationship[];
  vessels: readonly NarrativeChapterRelationship[];
  technologies: readonly NarrativeChapterRelationship[];
  appearingCharacters: readonly NarrativeChapterRelationship[];
}

export interface NarrativeWorld {
  entities: NarrativeEntity[];
  activity: NarrativeActivity[];
  view: {
    chapter: string | null;
    display_date: string | null;
  };
}

export interface CharacterTravelStop {
  location_id: string;
  source_chapter: string;
  effective_date: string;
  /** Stable source-array order for otherwise identical appearances. */
  appearance_index: number;
  astronomy_system_id: string | null;
}

export interface CharacterTravelLeg {
  from_astronomy_system_id: string;
  to_astronomy_system_id: string;
  arrival: CharacterTravelStop;
}

export function characterAncestors(
  world: NarrativeWorld,
  characterId: string,
): NarrativeEntity[] {
  const characters = new Map(
    world.entities
      .filter((entity) => entity.entity_type === "character")
      .map((entity) => [entity.id, entity]),
  );
  const ancestors: NarrativeEntity[] = [];
  const visited = new Set<string>([characterId]);
  let current = characters.get(characterId);
  while (current && typeof current.parent_id === "string") {
    if (visited.has(current.parent_id)) break;
    const parent = characters.get(current.parent_id);
    if (!parent) break;
    visited.add(parent.id);
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}

function travelPresentationOrdering(
  left: Pick<
    CharacterTravelStop,
    "effective_date" | "source_chapter" | "appearance_index"
  >,
  right: Pick<
    CharacterTravelStop,
    "effective_date" | "source_chapter" | "appearance_index"
  >,
): number {
  const narrativeOrdering = compareNarrativeMoments(
    { date: left.effective_date, sourceChapter: left.source_chapter },
    { date: right.effective_date, sourceChapter: right.source_chapter },
  );
  if (narrativeOrdering !== null && narrativeOrdering !== 0)
    return narrativeOrdering;
  return (
    compareNarrativeChapters(left.source_chapter, right.source_chapter) ||
    left.appearance_index - right.appearance_index
  );
}

function mappedSystemIdFromHistoricalLocations(
  entities: ReadonlyMap<string, NarrativeEntity>,
  indeterminateLocationIds: ReadonlySet<string>,
  locationId: string,
): string | null {
  const visited = new Set<string>();
  let current = entities.get(locationId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (indeterminateLocationIds.has(current.id)) return null;
    if (current.map_status === "unmapped") return null;
    if (
      current.entity_type === "location" &&
      current.kind === "star_system" &&
      typeof current.astronomy_object_id === "string"
    ) {
      return current.astronomy_object_id;
    }
    const parentId = current.parent_location_id;
    current = typeof parentId === "string" ? entities.get(parentId) : undefined;
  }
  return null;
}

interface HistoricalLocationProjection {
  locations: ReadonlyMap<string, NarrativeEntity>;
  indeterminateLocationIds: ReadonlySet<string>;
}

const ROUTE_ENDPOINT_PROPERTIES = new Set([
  "parent_location_id",
  "map_status",
  "astronomy_object_id",
]);

function projectHistoricalLocations(
  baseline: readonly NarrativeEntity[],
  chapters: readonly NarrativeRecord[],
  displayDate: string,
): HistoricalLocationProjection {
  const locations = new Map(
    baseline
      .filter((entity) => entity.entity_type === "location")
      .map((entity) => [entity.id, structuredClone(entity)]),
  );
  const latestMoments = new Map<string, NarrativeMoment>();
  const indeterminateLocationIds = new Set<string>();
  for (const chapter of chapters) {
    const date = chapterDate(chapter);
    const sourceChapter = chapterId(chapter);
    const dateOrdering = compareNarrativeDates(date, displayDate);
    if (dateOrdering === null) {
      for (const candidate of (chapter.introducing as unknown[] | undefined) ??
        []) {
        const introduced = asRecord(
          candidate,
          `Introduction in ${sourceChapter}`,
        );
        if (
          typeof introduced.id === "string" &&
          introduced.id.startsWith("location:")
        ) {
          indeterminateLocationIds.add(introduced.id);
        }
      }
      for (const candidate of (chapter.updates as unknown[] | undefined) ??
        []) {
        const update = asRecord(candidate, `Update in ${sourceChapter}`);
        if (
          typeof update.entity_id === "string" &&
          update.entity_id.startsWith("location:") &&
          Object.keys(update).some((key) => ROUTE_ENDPOINT_PROPERTIES.has(key))
        ) {
          indeterminateLocationIds.add(update.entity_id);
        }
      }
      continue;
    }
    if (dateOrdering > 0) continue;
    for (const candidate of (chapter.introducing as unknown[] | undefined) ??
      []) {
      const introduced = asRecord(
        candidate,
        `Introduction in ${sourceChapter}`,
      );
      const id = asString(introduced.id, `Introduction ID in ${sourceChapter}`);
      if (!id.startsWith("location:")) continue;
      const location: NarrativeEntity = { id, entity_type: "location" };
      applyProperties(
        location,
        introduced,
        { date, sourceChapter },
        latestMoments,
        ["id"],
      );
      locations.set(id, location);
    }
    for (const candidate of (chapter.updates as unknown[] | undefined) ?? []) {
      const update = asRecord(candidate, `Update in ${sourceChapter}`);
      const id = asString(
        update.entity_id,
        `Update target in ${sourceChapter}`,
      );
      const location = locations.get(id);
      if (!location) continue;
      applyProperties(
        location,
        update,
        { date, sourceChapter },
        latestMoments,
        ["entity_id"],
      );
    }
  }
  return { locations, indeterminateLocationIds };
}

export type CharacterTravelHistories = ReadonlyMap<
  string,
  readonly CharacterTravelStop[]
>;

/**
 * Builds every eligible character history once for a reader projection. Historical
 * location state is projected once per distinct appearance date, so changing the
 * selected character is only a map lookup.
 */
export function projectCharacterTravelHistories(
  corpus: PreparedNarrativeCorpus,
  world: NarrativeWorld,
): CharacterTravelHistories {
  if (!world.view.chapter) return new Map();
  const eligibleCharacterIds = new Set(
    world.entities
      .filter((entity) => entity.entity_type === "character")
      .map((entity) => entity.id),
  );
  const indexes = indexesFor(corpus);
  const chapters = indexes.chapters.filter(
    (chapter) =>
      compareNarrativeChapters(chapterId(chapter), world.view.chapter!) <= 0,
  );
  const stopsByCharacter = new Map<string, CharacterTravelStop[]>();
  const appearanceDates = new Set<string>();
  for (const chapter of chapters) {
    const effectiveDate = chapterDate(chapter);
    if (!isDateAtOrBefore(effectiveDate, world.view.display_date)) continue;
    const sourceChapter = chapterId(chapter);
    for (const [appearanceIndex, candidate] of (
      (chapter.appearances as unknown[] | undefined) ?? []
    ).entries()) {
      const appearance = asRecord(candidate, `Appearance in ${sourceChapter}`);
      const characterId = appearance.character_id;
      if (
        typeof characterId !== "string" ||
        !eligibleCharacterIds.has(characterId)
      ) {
        continue;
      }
      const locationId = appearance.location_id ?? chapter.location_id;
      if (typeof locationId !== "string") continue;
      const stops = stopsByCharacter.get(characterId) ?? [];
      stops.push({
        location_id: locationId,
        source_chapter: sourceChapter,
        effective_date: effectiveDate,
        appearance_index: appearanceIndex,
        astronomy_system_id: null,
      });
      stopsByCharacter.set(characterId, stops);
      appearanceDates.add(effectiveDate);
    }
  }
  const historicalLocationsByDate = new Map(
    [...appearanceDates].map((date) => [
      date,
      projectHistoricalLocations(indexes.zeroStateEntities, chapters, date),
    ]),
  );
  for (const stops of stopsByCharacter.values()) {
    for (const stop of stops) {
      const projection = historicalLocationsByDate.get(stop.effective_date);
      stop.astronomy_system_id = projection
        ? mappedSystemIdFromHistoricalLocations(
            projection.locations,
            projection.indeterminateLocationIds,
            stop.location_id,
          )
        : null;
    }
    stops.sort(travelPresentationOrdering);
  }
  return stopsByCharacter;
}

/**
 * Derives reader-visible travel evidence from canonical appearances.  The list keeps
 * every stop; only its optional map endpoint uses the historical location projection.
 */
export function characterTravelStops(
  corpus: PreparedNarrativeCorpus,
  world: NarrativeWorld,
  characterId: string,
): CharacterTravelStop[] {
  return [
    ...(projectCharacterTravelHistories(corpus, world).get(characterId) ?? []),
  ];
}

/** Builds only definite adjacent interstellar legs and collapses repeated endpoint pairs. */
export function characterTravelLegs(
  stops: readonly CharacterTravelStop[],
): CharacterTravelLeg[] {
  const candidates: CharacterTravelLeg[] = [];
  for (let index = 1; index < stops.length; index += 1) {
    const departure = stops[index - 1]!;
    const arrival = stops[index]!;
    const ordering = compareNarrativeMoments(
      {
        date: departure.effective_date,
        sourceChapter: departure.source_chapter,
      },
      { date: arrival.effective_date, sourceChapter: arrival.source_chapter },
    );
    if (
      ordering === null ||
      ordering >= 0 ||
      !departure.astronomy_system_id ||
      !arrival.astronomy_system_id ||
      departure.astronomy_system_id === arrival.astronomy_system_id
    ) {
      continue;
    }
    candidates.push({
      from_astronomy_system_id: departure.astronomy_system_id,
      to_astronomy_system_id: arrival.astronomy_system_id,
      arrival,
    });
  }
  const latestByPair = new Map<string, CharacterTravelLeg>();
  for (const candidate of candidates) {
    const key = [
      candidate.from_astronomy_system_id,
      candidate.to_astronomy_system_id,
    ]
      .sort()
      .join("\u0000");
    const existing = latestByPair.get(key);
    if (
      !existing ||
      travelPresentationOrdering(existing.arrival, candidate.arrival) < 0
    )
      latestByPair.set(key, candidate);
  }
  return [...latestByPair.values()].sort((left, right) =>
    travelPresentationOrdering(left.arrival, right.arrival),
  );
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
const surveyedBodyKinds = new Set(["planet", "dwarf_planet", "moon"]);
const surveyObservationProperties = [
  "body_class",
  "color",
  "visual_description",
  "surface_gravity_g",
] as const;
const orbitalOrderStep = 1024;

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
  siblingIndex = 0,
): void {
  const id = asString(location.id, "Zero-state location ID");
  const flattened: NarrativeEntity = {
    ...structuredClone(location),
    id,
    entity_type: "location",
  };
  delete flattened.children;
  if (parentLocationId) flattened.parent_location_id = parentLocationId;
  if (location.parent_relation === "orbits") {
    flattened.orbital_order = (siblingIndex + 1) * orbitalOrderStep;
  }
  result.push(flattened);
  const children = location.children;
  if (!children) return;
  if (!Array.isArray(children))
    throw new Error(`Zero-state children for ${id} must be an array.`);
  for (const [index, child] of children.entries()) {
    flattenZeroStateLocation(
      asRecord(child, `Zero-state child of ${id}`),
      id,
      result,
      index,
    );
  }
}

interface OrbitalLocationWrite {
  id: string;
  record: NarrativeRecord;
  pointer: string;
  orbitalOrderEffective?: boolean;
}

function normalizeOrbitalOrdersForMoment(
  locations: Map<string, NarrativeEntity>,
  before: ReadonlyMap<string, NarrativeEntity>,
  writes: readonly OrbitalLocationWrite[],
  chapter: string,
  displayDate: string,
): void {
  const allocate = new Map<
    string,
    Array<{ entity: NarrativeEntity; pointer: string }>
  >();
  const pointerById = new Map(writes.map((write) => [write.id, write.pointer]));
  for (const { id, record, pointer, orbitalOrderEffective } of writes) {
    const current = locations.get(id);
    if (!current) continue;
    const previous = before.get(id);
    const explicit =
      Object.hasOwn(record, "orbital_order") && orbitalOrderEffective !== false;
    const isOrbital =
      current.parent_relation === "orbits" &&
      typeof current.parent_location_id === "string";
    if (!isOrbital) {
      if (explicit && record.orbital_order !== null) {
        throw chapterSemanticError(
          chapter,
          `${pointer}/orbital_order`,
          `orbital_order is allowed only when the effective parent_relation is orbits at ${displayDate}.`,
        );
      }
      delete current.orbital_order;
      continue;
    }
    const retained =
      previous?.parent_relation === "orbits" &&
      previous.parent_location_id === current.parent_location_id &&
      Number.isSafeInteger(previous.orbital_order) &&
      (previous.orbital_order as number) > 0;
    if (!explicit && retained) {
      current.orbital_order = previous!.orbital_order;
      continue;
    }
    if (explicit) {
      if (record.orbital_order !== null) continue;
      throw chapterSemanticError(
        chapter,
        `${pointer}/orbital_order`,
        `orbital_order may be null only when the effective parent_relation no longer is orbits at ${displayDate}.`,
      );
    }
    delete current.orbital_order;
    const pending = allocate.get(current.parent_location_id as string) ?? [];
    pending.push({ entity: current, pointer });
    allocate.set(current.parent_location_id as string, pending);
  }

  for (const [parentId, pending] of allocate) {
    const occupied = [...locations.values()]
      .filter(
        (location) =>
          location.parent_location_id === parentId &&
          location.parent_relation === "orbits" &&
          Number.isSafeInteger(location.orbital_order) &&
          (location.orbital_order as number) > 0,
      )
      .map((location) => location.orbital_order as number);
    let next = occupied.length === 0 ? 0 : Math.max(...occupied);
    for (const { entity, pointer } of pending.sort((left, right) =>
      left.entity.id.localeCompare(right.entity.id),
    )) {
      next += orbitalOrderStep;
      if (!Number.isSafeInteger(next)) {
        throw chapterSemanticError(
          chapter,
          `${pointer}/orbital_order`,
          `appending an orbital ordering key for ${entity.id} overflows the safe-integer range.`,
        );
      }
      entity.orbital_order = next;
    }
  }

  const owners = new Map<string, Map<number, string>>();
  for (const location of locations.values()) {
    if (
      location.parent_relation !== "orbits" ||
      typeof location.parent_location_id !== "string"
    ) {
      if (Object.hasOwn(location, "orbital_order"))
        delete location.orbital_order;
      continue;
    }
    if (
      !Number.isSafeInteger(location.orbital_order) ||
      (location.orbital_order as number) <= 0
    ) {
      throw chapterSemanticError(
        chapter,
        pointerById.has(location.id)
          ? `${pointerById.get(location.id)}/orbital_order`
          : "/locations",
        `projection at ${displayDate} leaves orbital child ${location.id} without a positive safe-integer orbital_order.`,
      );
    }
    const siblings =
      owners.get(location.parent_location_id) ?? new Map<number, string>();
    const order = location.orbital_order as number;
    const owner = siblings.get(order);
    if (owner) {
      throw chapterSemanticError(
        chapter,
        pointerById.has(location.id)
          ? `${pointerById.get(location.id)}/orbital_order`
          : pointerById.has(owner)
            ? `${pointerById.get(owner)}/orbital_order`
            : "/locations",
        `projection at ${displayDate} gives siblings ${owner} and ${location.id} duplicate orbital_order ${order}.`,
      );
    }
    siblings.set(order, location.id);
    owners.set(location.parent_location_id, siblings);
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
  normalizeOrbitalOrdersForMoment(
    new Map(
      flattened
        .filter((entity) => entity.entity_type === "location")
        .map((entity) => [entity.id, entity]),
    ),
    new Map(),
    [],
    "zero-state",
    "zero state",
  );
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
    "parent_id",
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

function isMentionTargetId(value: string): boolean {
  return /^(character|event|location|organization|species|technology|vessel):/.test(
    value,
  );
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
  for (const entity of zeroStateEntities) {
    if (Object.hasOwn(entity, "birth_chapter")) {
      throw new Error(
        `Zero-state character ${entity.id} cannot define birth_chapter.`,
      );
    }
  }
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
        typeof introduced.birth_chapter === "string" &&
        !chapterIds.has(introduced.birth_chapter)
      ) {
        throw new Error(
          `Introduction ${entityId} references unavailable birth chapter ${introduced.birth_chapter}.`,
        );
      }
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
    if (
      typeof chapter.picture_id === "string" &&
      !assetIds.has(chapter.picture_id)
    ) {
      throw chapterSemanticError(
        id,
        "/picture_id",
        `chapter picture references unavailable asset ${chapter.picture_id}.`,
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
      if (
        typeof update.birth_chapter === "string" &&
        !chapterIds.has(update.birth_chapter)
      ) {
        throw new Error(
          `Update ${targetId} references unavailable birth chapter ${update.birth_chapter}.`,
        );
      }
      const { parent_id: parentId, ...updateWithoutParent } = update;
      assertReferencesResolve(
        updateWithoutParent,
        availableIds,
        assetIds,
        `Update ${targetId}`,
      );
      if (
        typeof parentId === "string" &&
        !availableAfterIntroductions.has(parentId)
      ) {
        throw new Error(
          `Update ${targetId} references unavailable entity ${parentId}.`,
        );
      }
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
    const appearances = (chapter.appearances as unknown[] | undefined) ?? [];
    for (const appearance of appearances) {
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
    if (compareChapter(id, "1.14") >= 0) {
      const structuralRecords = [...introductions, ...updates, ...appearances];
      for (const [index, candidate] of structuralRecords.entries()) {
        const record = asRecord(
          candidate,
          `Structural chapter record ${index} in ${id}`,
        );
        for (const reference of collectReferences(record)) {
          if (isMentionTargetId(reference))
            structuralMentionTargets.add(reference);
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
            `supplemental mention target is introduced later in chapter ${introducedIn}: ${target}.`,
          );
        }
        throw chapterSemanticError(
          id,
          pointer,
          `supplemental mention target is unknown: ${target}.`,
        );
      }
      if (structuralMentionTargets.has(target)) {
        throw chapterSemanticError(
          id,
          pointer,
          `supplemental mention target is already represented structurally in this chapter: ${target}.`,
        );
      }
    }
    for (const entityId of introducedThisChapter) availableIds.add(entityId);
  }
  assertTemporalWrites(chapters);
  assertProjectedLocationConstraints(zeroStateEntities, chapters);
}

/** Validates the complete authored corpus, including cross-record semantic rules. */
export function validateNarrativeCorpus(corpus: NarrativeCorpus): void {
  validateNarrativeCorpusStructure(corpus);
  validateNarrativeCorpusSemantics(corpus);
}

interface PreparedNarrativeIndexes {
  chapters: readonly NarrativeRecord[];
  zeroStateEntities: readonly NarrativeEntity[];
  chapterById: ReadonlyMap<string, NarrativeRecord>;
  chapterDetailSourceById: ReadonlyMap<string, PreparedChapterDetailSource>;
  meaningfulDateOptions: Map<string, readonly MeaningfulNarrativeDate[]>;
}

interface PreparedChapterDetailSource {
  chapter: string;
  bookNumber: string;
  bookTitle: string;
  localNumber: string;
  title: string;
  summary: string;
  pictureId: string | null;
  locationId: string;
  leadCharacterIds: readonly string[];
  eventIds: readonly string[];
  vesselIds: readonly string[];
  technologyIds: readonly string[];
  appearingCharacterIds: readonly string[];
}

const preparedNarrativeIndexes = new WeakMap<
  PreparedNarrativeCorpus,
  PreparedNarrativeIndexes
>();
const narrativePreparationCounts = new WeakMap<NarrativeCorpus, number>();
const narrativeWorldGenerationCounts = new WeakMap<
  PreparedNarrativeCorpus,
  number
>();

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function uniqueStringsInOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function prepareChapterDetailSource(
  chapter: NarrativeRecord,
  books: NarrativeRecord,
): PreparedChapterDetailSource {
  const reference = chapterId(chapter);
  const [bookNumber, localNumber] = reference.split(".");
  const book = asRecord(
    books[bookNumber!],
    `Book catalogue entry ${bookNumber}`,
  );
  const appearances = (
    (chapter.appearances as NarrativeRecord[] | undefined) ?? []
  ).map((appearance) => asRecord(appearance, `Appearance in ${reference}`));
  const introductions = (
    (chapter.introducing as NarrativeRecord[] | undefined) ?? []
  ).map((introduction) =>
    asRecord(introduction, `Introduction in ${reference}`),
  );
  const appearanceCharacterIds = appearances.map((appearance) =>
    asString(appearance.character_id, `Appearance character in ${reference}`),
  );
  const introducedIds = (prefix: string) =>
    introductions
      .map((introduction) =>
        asString(introduction.id, `Introduction ID in ${reference}`),
      )
      .filter((id) => id.startsWith(`${prefix}:`));
  return deepFreeze({
    chapter: reference,
    bookNumber: bookNumber!,
    bookTitle: asString(book.title, `Book ${bookNumber} title`),
    localNumber: localNumber!,
    title: asString(chapter.title, `Chapter ${reference} title`),
    summary: asString(chapter.summary, `Chapter ${reference} summary`),
    pictureId:
      typeof chapter.picture_id === "string" ? chapter.picture_id : null,
    locationId: asString(
      chapter.location_id,
      `Chapter ${reference} default location`,
    ),
    leadCharacterIds: uniqueStringsInOrder(
      appearances
        .filter((appearance) => appearance.role === "lead")
        .map((appearance) =>
          asString(
            appearance.character_id,
            `Lead appearance character in ${reference}`,
          ),
        ),
    ),
    eventIds: introducedIds("event"),
    vesselIds: introducedIds("vessel"),
    technologyIds: introducedIds("technology"),
    appearingCharacterIds: uniqueStringsInOrder(appearanceCharacterIds),
  });
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
  const books = asRecord(prepared.books.books, "Book catalogue books");
  preparedNarrativeIndexes.set(prepared, {
    chapters,
    zeroStateEntities: deepFreeze(
      assertZeroStateSemantics(
        prepared.zeroState,
        prepared.knownAstronomyObjectIds,
      ),
    ),
    chapterById: new Map(
      chapters.map((chapter) => [chapterId(chapter), chapter]),
    ),
    chapterDetailSourceById: new Map(
      chapters.map((chapter) => [
        chapterId(chapter),
        prepareChapterDetailSource(chapter, books),
      ]),
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

/** Exposes projection counts so regressions cannot hide per-stop world generation. */
export function narrativeWorldGenerationCount(
  corpus: PreparedNarrativeCorpus,
): number {
  return narrativeWorldGenerationCounts.get(corpus) ?? 0;
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

function locationProjectionDates(
  readerVisible: readonly NarrativeRecord[],
  defaultDate: string,
): string[] {
  const candidates = new Set<string>([defaultDate]);
  const stateDates: string[] = [];
  for (const chapter of readerVisible) {
    const date = chapterDate(chapter);
    candidates.add(date);
    const writes = [
      ...((chapter.introducing as unknown[] | undefined) ?? []),
      ...((chapter.updates as unknown[] | undefined) ?? []),
    ];
    if (
      writes.some((candidate) => {
        const record = asRecord(candidate, "Narrative state write");
        const id = record.id ?? record.entity_id;
        return typeof id !== "string" || !id.startsWith("event:");
      })
    ) {
      stateDates.push(date);
    }
    for (const candidate of writes) {
      const record = asRecord(candidate, "Narrative dated write");
      if (typeof record.date === "string") candidates.add(record.date);
    }
  }
  return [...candidates].filter(
    (candidate) =>
      candidate === defaultDate ||
      stateDates.every(
        (stateDate) => compareNarrativeDates(stateDate, candidate) !== null,
      ),
  );
}

function assertProjectedLocationConstraints(
  zeroStateEntities: readonly NarrativeEntity[],
  chapters: readonly NarrativeRecord[],
): void {
  for (const [selectedIndex, selectedChapter] of chapters.entries()) {
    const knowledgeChapter = chapterId(selectedChapter);
    const readerVisible = chapters.slice(0, selectedIndex + 1);
    for (const displayDate of locationProjectionDates(
      readerVisible,
      chapterDate(selectedChapter),
    )) {
      const locations = new Map(
        zeroStateEntities
          .filter((entity) => entity.entity_type === "location")
          .map((entity) => [entity.id, structuredClone(entity)]),
      );
      const latestMoments = new Map<string, NarrativeMoment>();
      for (const chapter of readerVisible) {
        const date = chapterDate(chapter);
        const sourceChapter = chapterId(chapter);
        if (!isDateAtOrBefore(date, displayDate)) continue;
        const before = new Map(
          [...locations].map(([id, location]) => [
            id,
            structuredClone(location),
          ]),
        );
        const orbitalWrites: OrbitalLocationWrite[] = [];
        for (const [index, candidate] of (
          (chapter.introducing as unknown[] | undefined) ?? []
        ).entries()) {
          const introduced = asRecord(
            candidate,
            `Introduction in ${sourceChapter}`,
          );
          const id = asString(
            introduced.id,
            `Introduction ID in ${sourceChapter}`,
          );
          if (!id.startsWith("location:")) continue;
          const location: NarrativeEntity = {
            id,
            entity_type: "location",
          };
          applyProperties(
            location,
            introduced,
            { date, sourceChapter },
            latestMoments,
            ["id"],
          );
          locations.set(id, location);
          orbitalWrites.push({
            id,
            record: introduced,
            pointer: `/introducing/${index}`,
          });
        }
        for (const [index, candidate] of (
          (chapter.updates as unknown[] | undefined) ?? []
        ).entries()) {
          const update = asRecord(candidate, `Update in ${sourceChapter}`);
          const id = asString(
            update.entity_id,
            `Update target in ${sourceChapter}`,
          );
          const location = locations.get(id);
          if (!location) continue;
          applyProperties(
            location,
            update,
            { date, sourceChapter },
            latestMoments,
            ["entity_id"],
          );
          orbitalWrites.push({
            id,
            record: update,
            pointer: `/updates/${index}`,
            orbitalOrderEffective: (() => {
              if (!Object.hasOwn(update, "orbital_order")) return undefined;
              const applied = latestMoments.get(`${id}\u0000orbital_order`);
              return (
                applied?.date === date &&
                applied.sourceChapter === sourceChapter
              );
            })(),
          });
        }
        normalizeOrbitalOrdersForMoment(
          locations,
          before,
          orbitalWrites,
          sourceChapter,
          displayDate,
        );
      }

      const moonCounts = new Map<string, number>();
      for (const location of locations.values()) {
        const effectiveProperties = surveyObservationProperties.filter(
          (property) =>
            Object.hasOwn(location, property) && location[property] !== null,
        );
        if (
          effectiveProperties.length > 0 &&
          (typeof location.kind !== "string" ||
            !surveyedBodyKinds.has(location.kind))
        ) {
          throw chapterSemanticError(
            knowledgeChapter,
            "/locations",
            `projection at ${displayDate} leaves survey properties ${effectiveProperties.join(", ")} on effective location kind ${String(location.kind)} for ${location.id}.`,
          );
        }
        if (
          location.kind !== "moon" ||
          typeof location.parent_location_id !== "string"
        ) {
          continue;
        }
        const parentId = location.parent_location_id;
        const count = (moonCounts.get(parentId) ?? 0) + 1;
        moonCounts.set(parentId, count);
        if (count > 4) {
          throw chapterSemanticError(
            knowledgeChapter,
            "/locations",
            `projection at ${displayDate} gives location ${parentId} ${count} direct moon children; maximum is 4.`,
          );
        }
      }
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
  for (const parent of locations.values()) {
    const childIds = parent.child_ids as string[];
    const orderedOrbitalIds = childIds
      .map((id) => locations.get(id))
      .filter(
        (child): child is NarrativeEntity =>
          child?.parent_relation === "orbits",
      )
      .sort(
        (left, right) =>
          (left.orbital_order as number) - (right.orbital_order as number),
      )
      .map((child) => child.id);
    let orbitalIndex = 0;
    parent.child_ids = childIds.map((id) =>
      locations.get(id)?.parent_relation === "orbits"
        ? orderedOrbitalIds[orbitalIndex++]!
        : id,
    );
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
      if (typeof target !== "string") continue;
      if (byId.get(target)?.entity_type === "location") {
        addLocationActivity(target, sourceChapter, date, "mention");
      } else {
        add(target, sourceChapter, date, "mention");
      }
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
  narrativeWorldGenerationCounts.set(
    corpus,
    (narrativeWorldGenerationCounts.get(corpus) ?? 0) + 1,
  );
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
    const locationsBefore = new Map(
      [...byId.values()]
        .filter((entity) => entity.entity_type === "location")
        .map((entity) => [entity.id, structuredClone(entity)]),
    );
    const orbitalWrites: OrbitalLocationWrite[] = [];
    for (const [index, candidate] of (
      (chapter.introducing as unknown[] | undefined) ?? []
    ).entries()) {
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
      if (type === "location") {
        orbitalWrites.push({
          id,
          record: introduced,
          pointer: `/introducing/${index}`,
        });
      }
    }
    for (const [index, candidate] of (
      (chapter.updates as unknown[] | undefined) ?? []
    ).entries()) {
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
      if (target.entity_type === "location") {
        orbitalWrites.push({
          id: targetId,
          record: update,
          pointer: `/updates/${index}`,
          orbitalOrderEffective: (() => {
            if (!Object.hasOwn(update, "orbital_order")) return undefined;
            const applied = latestMoments.get(`${targetId}\u0000orbital_order`);
            return (
              applied?.date === effectiveDate &&
              applied.sourceChapter === sourceChapter
            );
          })(),
        });
      }
    }
    normalizeOrbitalOrdersForMoment(
      new Map(
        [...byId.values()]
          .filter((entity) => entity.entity_type === "location")
          .map((entity) => [entity.id, entity]),
      ),
      locationsBefore,
      orbitalWrites,
      sourceChapter,
      displayDate ?? date,
    );
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
 * Resolves one prepared chapter-detail index against the exact reader-safe
 * Chapter-mode world already generated for the same chapter.
 */
export function projectNarrativeChapterDetail(
  corpus: PreparedNarrativeCorpus,
  selectedChapterId: string,
  world: NarrativeWorld,
): NarrativeChapterDetail {
  const indexes = indexesFor(corpus);
  const source = indexes.chapterDetailSourceById.get(selectedChapterId);
  if (!source) {
    throw new Error(`Requested chapter does not exist: ${selectedChapterId}.`);
  }
  const sourceChapter = indexes.chapterById.get(selectedChapterId);
  if (!sourceChapter) {
    throw new Error(
      `Prepared chapter index is incomplete: ${selectedChapterId}.`,
    );
  }
  if (
    world.view.chapter !== selectedChapterId ||
    world.view.display_date !== chapterDate(sourceChapter)
  ) {
    throw new Error(
      `Chapter ${selectedChapterId} detail requires its exact Chapter-mode projection.`,
    );
  }
  const entities = new Map(
    world.entities.map((entity) => [entity.id, entity] as const),
  );
  const resolveRequired = (
    id: string,
    label: string,
  ): NarrativeChapterRelationship => {
    const entity = entities.get(id);
    if (!entity || typeof entity.name !== "string") {
      throw new Error(
        `Chapter ${selectedChapterId} ${label} is unavailable in its reader-safe projection: ${id}.`,
      );
    }
    return { id, name: entity.name };
  };
  const resolveEligible = (
    ids: readonly string[],
    label: string,
  ): NarrativeChapterRelationship[] =>
    ids.flatMap((id) => {
      const entity = entities.get(id);
      if (!entity) return [];
      if (typeof entity.name !== "string") {
        throw new Error(
          `Chapter ${selectedChapterId} ${label} has no reader-visible name: ${id}.`,
        );
      }
      return [{ id, name: entity.name }];
    });
  const resolveAll = (
    ids: readonly string[],
    label: string,
  ): NarrativeChapterRelationship[] =>
    ids.map((id) => resolveRequired(id, label));
  return deepFreeze({
    chapter: source.chapter,
    bookNumber: source.bookNumber,
    bookTitle: source.bookTitle,
    localNumber: source.localNumber,
    title: source.title,
    summary: source.summary,
    pictureId: source.pictureId,
    location: resolveRequired(source.locationId, "default location"),
    leadCharacters: resolveAll(source.leadCharacterIds, "lead character"),
    events: resolveEligible(source.eventIds, "introduced event"),
    vessels: resolveAll(source.vesselIds, "introduced vessel"),
    technologies: resolveAll(source.technologyIds, "introduced technology"),
    appearingCharacters: resolveAll(
      source.appearingCharacterIds,
      "appearing character",
    ),
  });
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

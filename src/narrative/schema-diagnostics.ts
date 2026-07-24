import type { ErrorObject } from "ajv";
import { locationForPointer, type JsonSourceLocation } from "./json-source-map";

interface SchemaErrorParameters {
  additionalProperty?: string;
  missingProperty?: string;
}

interface SchemaErrorWithParent extends ErrorObject {
  parentSchema?: { properties?: Record<string, unknown> };
}

function errorPointer(error: ErrorObject): string {
  const parameters = error.params as SchemaErrorParameters;
  if (
    error.keyword === "additionalProperties" &&
    parameters.additionalProperty
  ) {
    return `${error.instancePath}/${parameters.additionalProperty.replaceAll("~", "~0").replaceAll("/", "~1")}`;
  }
  return error.instancePath;
}

function valueAtPointer(candidate: unknown, pointer: string): unknown {
  if (!pointer) return candidate;
  let value = candidate;
  for (const token of pointer.slice(1).split("/")) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[
      token.replaceAll("~1", "/").replaceAll("~0", "~")
    ];
  }
  return value;
}

const entityProperties = {
  character: new Set([
    "id",
    "name",
    "gender",
    "species_id",
    "current_state",
    "picture_id",
    "aliases",
    "birth_date",
    "death_date",
    "death_event_id",
  ]),
  species: new Set(["id", "name", "description", "picture_id", "homeworld_id"]),
  event: new Set([
    "id",
    "name",
    "location_id",
    "picture_id",
    "date",
    "description",
    "participant_ids",
  ]),
  location: new Set([
    "id",
    "name",
    "kind",
    "description",
    "state",
    "map_status",
    "parent_location_id",
    "parent_relation",
    "astronomy_object_id",
    "origin_location_id",
    "destination_location_id",
  ]),
} as const;

function isRelevantEntityError(
  error: ErrorObject,
  candidate: unknown,
): boolean {
  const pointer = errorPointer(error);
  const itemMatch = /^\/(?:introducing|entities)\/(\d+)(?:\/([^/]+))?/.exec(
    pointer,
  );
  if (!itemMatch) return true;
  const item = valueAtPointer(
    candidate,
    pointer.startsWith("/entities/")
      ? `/entities/${itemMatch[1]}`
      : `/introducing/${itemMatch[1]}`,
  );
  const id =
    item && typeof item === "object"
      ? (item as Record<string, unknown>).id
      : undefined;
  if (typeof id !== "string") return true;
  const entityType = id.split(":", 1)[0];
  if (!(entityType in entityProperties)) return true;
  const properties =
    entityProperties[entityType as keyof typeof entityProperties];
  const parameters = error.params as SchemaErrorParameters;
  if (error.keyword === "required")
    return properties.has(parameters.missingProperty ?? "");
  if (error.keyword === "additionalProperties")
    return !properties.has(parameters.additionalProperty ?? "");
  if (error.keyword === "pattern" && itemMatch[2] === "id") {
    return error.message?.includes(`^${entityType}:`) ?? false;
  }
  return !itemMatch[2] || properties.has(itemMatch[2]);
}

/** Removes summary and alternate-entity-branch errors that do not describe the input. */
export function actionableSchemaErrors(
  errors: readonly ErrorObject[],
  candidate: unknown,
): ErrorObject[] {
  return errors.filter(
    (error) =>
      !["oneOf", "anyOf", "if", "not"].includes(error.keyword) &&
      isRelevantEntityError(error, candidate),
  );
}

function editDistance(left: string, right: string): number {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]!;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]!;
      previous[rightIndex] = Math.min(
        previous[rightIndex - 1]! + 1,
        above + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length]!;
}

function knownProperties(error: ErrorObject, candidate: unknown): string[] {
  const itemMatch = /^\/(?:introducing|entities)\/(\d+)/.exec(
    error.instancePath,
  );
  if (itemMatch) {
    const item = valueAtPointer(candidate, itemMatch[0]);
    const id =
      item && typeof item === "object"
        ? (item as Record<string, unknown>).id
        : undefined;
    if (typeof id === "string") {
      const entityType = id.split(":", 1)[0];
      if (entityType in entityProperties)
        return [
          ...entityProperties[entityType as keyof typeof entityProperties],
        ];
    }
  }

  const parentSchema = (error as SchemaErrorWithParent).parentSchema;
  return Object.keys(parentSchema?.properties ?? {});
}

function propertySuggestions(error: ErrorObject, candidate: unknown): string[] {
  const property = (error.params as SchemaErrorParameters).additionalProperty;
  if (!property) return [];
  return knownProperties(error, candidate)
    .sort(
      (left, right) =>
        editDistance(property, left) - editDistance(property, right) ||
        left.localeCompare(right),
    )
    .slice(0, 3);
}

function humanMessage(error: ErrorObject, candidate: unknown): string {
  const parameters = error.params as SchemaErrorParameters;
  if (error.keyword === "additionalProperties") {
    const suggestions = propertySuggestions(error, candidate);
    const hint =
      suggestions.length > 0 ? `; did you mean: ${suggestions.join(", ")}` : "";
    return `unexpected property "${parameters.additionalProperty}"${hint}`;
  }
  if (error.keyword === "required") {
    return `missing required property "${parameters.missingProperty}"`;
  }
  if (error.keyword === "minLength") return "must not be empty";
  return error.message ?? "is invalid";
}

export interface FormattedSchemaDiagnostic {
  location: JsonSourceLocation;
  message: string;
}

export function formatSchemaDiagnostics(
  errors: readonly ErrorObject[],
  candidate: unknown,
  locations: ReadonlyMap<string, JsonSourceLocation>,
): FormattedSchemaDiagnostic[] {
  const seen = new Set<string>();
  const actionableErrors = actionableSchemaErrors(errors, candidate);
  const reportedErrors =
    actionableErrors.length > 0 ? actionableErrors : errors;
  return reportedErrors.flatMap((error) => {
    const pointer = errorPointer(error);
    const message = `${pointer || "/"}: ${humanMessage(error, candidate)}`;
    if (seen.has(message)) return [];
    seen.add(message);
    return [{ location: locationForPointer(locations, pointer), message }];
  });
}

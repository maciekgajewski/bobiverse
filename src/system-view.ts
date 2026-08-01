import type { StellarSystem } from "./domain/types";
import type { NarrativeEntity, NarrativeWorld } from "./narrative/model";

export const RECOGNIZED_ORBITAL_KINDS = new Set([
  "planet",
  "dwarf_planet",
  "moon",
  "asteroid_belt",
  "kuiper_belt",
  "oort_cloud",
]);

export interface SystemViewEntry {
  astronomySystemId: string;
  narrativeSystemId: string;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function directChildren(
  entities: ReadonlyMap<string, NarrativeEntity>,
  parentId: string,
): NarrativeEntity[] {
  const parent = entities.get(parentId);
  const orderedIds = Array.isArray(parent?.child_ids)
    ? parent.child_ids.filter((id): id is string => typeof id === "string")
    : [];
  const ordered = orderedIds
    .map((id) => entities.get(id))
    .filter((entity): entity is NarrativeEntity => Boolean(entity));
  const remaining = [...entities.values()].filter(
    (entity) =>
      stringValue(entity.parent_location_id) === parentId &&
      !ordered.some((child) => child.id === entity.id),
  );
  return [...ordered, ...remaining];
}

/**
 * Resolves the narrow, reader-safe first system-view entry boundary. This consumes
 * the generated world only; it does not infer component-to-narrative associations.
 */
export function systemViewEntryForNarrativeSelection(
  world: NarrativeWorld,
  systems: readonly StellarSystem[],
  narrativeSystemId: string | null,
): SystemViewEntry | null {
  if (!narrativeSystemId) return null;
  const entities = new Map(world.entities.map((entity) => [entity.id, entity]));
  const system = entities.get(narrativeSystemId);
  const astronomySystemId = system
    ? stringValue(system.astronomy_object_id)
    : null;
  if (
    !system ||
    system.entity_type !== "location" ||
    system.kind !== "star_system" ||
    !astronomySystemId ||
    !systems.some((candidate) => candidate.id === astronomySystemId)
  ) {
    return null;
  }
  const stars = directChildren(entities, system.id).filter(
    (child) =>
      child.entity_type === "location" &&
      child.kind === "star" &&
      child.parent_relation === "member_of_system",
  );
  const hasRenderableOrbitalChild = stars.some((star) =>
    directChildren(entities, star.id).some(
      (child) =>
        child.entity_type === "location" &&
        child.parent_relation === "orbits" &&
        RECOGNIZED_ORBITAL_KINDS.has(String(child.kind)),
    ),
  );
  return stars.length > 1 || hasRenderableOrbitalChild
    ? { astronomySystemId, narrativeSystemId: system.id }
    : null;
}

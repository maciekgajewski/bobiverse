import type { SelectionIdentity } from "../domain/selection";
import type { StellarSystem } from "../domain/types";
import type { NarrativeEntity, NarrativeWorld } from "./model";

const PARSECS_PER_LIGHT_YEAR = 1 / 3.26156;

export interface NarrativeMapProjection {
  knownSystemIds: ReadonlySet<string>;
  missingAstronomySystemIds: ReadonlySet<string>;
  narrativeSystemIdsByAstronomyId: ReadonlyMap<string, string>;
  activeSystemIds: ReadonlySet<string>;
  contextSystems: StellarSystem[];
  astronomySearchAliasesByNarrativeId: ReadonlyMap<string, readonly string[]>;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mappedSystemIdForLocation(
  entities: ReadonlyMap<string, NarrativeEntity>,
  locationId: string,
): string | null {
  const visited = new Set<string>();
  let current = entities.get(locationId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.entity_type === "location" &&
      current.kind === "star_system" &&
      typeof current.astronomy_object_id === "string"
    ) {
      return current.astronomy_object_id;
    }
    const parentId = stringValue(current.parent_location_id);
    current = parentId ? entities.get(parentId) : undefined;
  }
  return null;
}

function distancePc(left: StellarSystem, right: StellarSystem): number {
  return Math.hypot(
    left.position_pc.xg - right.position_pc.xg,
    left.position_pc.yg - right.position_pc.yg,
    left.position_pc.zg - right.position_pc.zg,
  );
}

export function astronomySearchValues(
  system: StellarSystem,
): readonly string[] {
  return [
    system.astronomy_name ?? system.name,
    system.name,
    ...system.alternates,
    ...system.components.flatMap((component) => [
      component.designation,
      component.identifiers.bayer_designation,
      component.identifiers.flamsteed_designation,
      component.identifiers.gj_id ? `GJ ${component.identifiers.gj_id}` : null,
      component.identifiers.hip_id
        ? `HIP ${component.identifiers.hip_id}`
        : null,
      component.identifiers.hd_id ? `HD ${component.identifiers.hd_id}` : null,
      component.identifiers.hr_id ? `HR ${component.identifiers.hr_id}` : null,
      component.identifiers.gaia_dr3_source_id
        ? `Gaia DR3 ${component.identifiers.gaia_dr3_source_id}`
        : null,
      component.identifiers.cns5_id
        ? `CNS5 ${component.identifiers.cns5_id}`
        : null,
      component.identifiers.wise_id,
      component.identifiers.twomass_id,
      component.identifiers.published_name,
    ]),
  ].filter((value): value is string => Boolean(value));
}

/**
 * Produces the complete rendered astronomy union for the current reader-safe world.
 * This intentionally remains a runtime projection of the validated static catalogue;
 * it is not a second generated astronomy authority.
 */
export function projectNarrativeMap(
  world: NarrativeWorld,
  systems: readonly StellarSystem[],
  contextRadiusLy: number,
  mode: "chapter" | "date",
): NarrativeMapProjection {
  const available = new Map(systems.map((system) => [system.id, system]));
  const knownSystemIds = new Set<string>();
  const missingAstronomySystemIds = new Set<string>();
  const narrativeSystemIds = new Map<string, string>();
  const narrativeSystemIdsByAstronomyId = new Map<string, string>();
  const narrativeNamesByAstronomyId = new Map<string, string>();
  const narrativeOwnersByAstronomyId = new Map<string, string[]>();

  for (const entity of world.entities) {
    if (
      entity.entity_type !== "location" ||
      entity.kind !== "star_system" ||
      typeof entity.astronomy_object_id !== "string"
    ) {
      continue;
    }
    if (!available.has(entity.astronomy_object_id)) {
      missingAstronomySystemIds.add(entity.astronomy_object_id);
      continue;
    }
    knownSystemIds.add(entity.astronomy_object_id);
    narrativeSystemIds.set(entity.id, entity.astronomy_object_id);
    const visibleName = stringValue(entity.name);
    if (!visibleName) {
      throw new Error(
        `Mapped narrative system ${entity.id} lacks a reader-visible name.`,
      );
    }
    const priorName = narrativeNamesByAstronomyId.get(
      entity.astronomy_object_id,
    );
    if (priorName && priorName !== visibleName) {
      throw new Error(
        `Astronomy system ${entity.astronomy_object_id} has conflicting reader-visible narrative names: ${priorName}, ${visibleName}.`,
      );
    }
    narrativeNamesByAstronomyId.set(entity.astronomy_object_id, visibleName);
    const owners =
      narrativeOwnersByAstronomyId.get(entity.astronomy_object_id) ?? [];
    owners.push(entity.id);
    narrativeOwnersByAstronomyId.set(entity.astronomy_object_id, owners);
  }
  for (const [astronomyId, owners] of narrativeOwnersByAstronomyId) {
    narrativeSystemIdsByAstronomyId.set(
      astronomyId,
      [...owners].sort((left, right) => left.localeCompare(right))[0]!,
    );
  }

  const activeSystemIds = new Set<string>();
  for (const activity of world.activity) {
    if (!activity.reasons.includes("mapped_system_ancestry")) continue;
    const isCurrent =
      mode === "chapter"
        ? activity.source_chapter === world.view.chapter
        : activity.effective_date === world.view.display_date;
    if (!isCurrent) continue;
    const astronomyId = narrativeSystemIds.get(activity.entity_id);
    if (astronomyId) activeSystemIds.add(astronomyId);
  }

  const anchors = [...knownSystemIds]
    .map((id) => available.get(id))
    .filter((system): system is StellarSystem => Boolean(system));
  const radiusPc = contextRadiusLy * PARSECS_PER_LIGHT_YEAR;
  const contextSystems = systems
    .filter(
      (system) =>
        knownSystemIds.has(system.id) ||
        anchors.some((anchor) => distancePc(system, anchor) <= radiusPc),
    )
    .map((system) => {
      const narrativeName = narrativeNamesByAstronomyId.get(system.id) ?? null;
      return {
        ...system,
        name: narrativeName ?? system.name,
        alternates: narrativeName
          ? [...new Set([system.name, ...system.alternates])].sort()
          : system.alternates,
        astronomy_name: system.name,
        narrative_name: narrativeName,
      };
    });
  const astronomySearchAliasesByNarrativeId = new Map<
    string,
    readonly string[]
  >();
  for (const system of contextSystems) {
    const narrativeId = narrativeSystemIdsByAstronomyId.get(system.id);
    if (!narrativeId) continue;
    astronomySearchAliasesByNarrativeId.set(
      narrativeId,
      astronomySearchValues(system),
    );
  }

  return {
    knownSystemIds,
    missingAstronomySystemIds,
    narrativeSystemIdsByAstronomyId,
    activeSystemIds,
    contextSystems,
    astronomySearchAliasesByNarrativeId,
  };
}

/** Returns the one unambiguous map target a selected reader-safe object provides. */
export function focusSystemIdForSelection(
  selection: SelectionIdentity | null,
  world: NarrativeWorld,
  contextSystemIds: ReadonlySet<string>,
): string | null {
  if (!selection) return null;
  if (selection.kind === "chapter") return null;
  if (selection.kind === "astronomy")
    return contextSystemIds.has(selection.id) ? selection.id : null;

  const entities = new Map(world.entities.map((entity) => [entity.id, entity]));
  const entity = entities.get(selection.id);
  if (!entity) return null;
  let locationId: string | null = null;
  if (entity.entity_type === "location") locationId = entity.id;
  if (entity.entity_type === "event")
    locationId = stringValue(entity.location_id);
  if (entity.entity_type === "character")
    locationId = entity.last_known_location?.location_id ?? null;
  if (!locationId) return null;
  const astronomyId = mappedSystemIdForLocation(entities, locationId);
  return astronomyId && contextSystemIds.has(astronomyId) ? astronomyId : null;
}

export function isSelectionEligibleForMap(
  selection: SelectionIdentity | null,
  world: NarrativeWorld,
  contextSystemIds: ReadonlySet<string>,
): boolean {
  if (!selection) return true;
  if (selection.kind === "chapter") return false;
  if (selection.kind === "astronomy") return contextSystemIds.has(selection.id);
  return world.entities.some((entity) => entity.id === selection.id);
}

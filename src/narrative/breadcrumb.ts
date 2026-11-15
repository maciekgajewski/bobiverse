import type { SelectionIdentity } from "../domain/selection";
import type { StellarSystem } from "../domain/types";
import { disambiguatedAdjacentLabels } from "./entity-label";
import type { NarrativeEntity, NarrativeWorld } from "./model";

export interface InspectorCrumb {
  key: string;
  label: string;
  /** Ancestors navigate; the current object (last crumb) does not. */
  target: SelectionIdentity | null;
}

/** At most this many crumbs show; earlier ancestors collapse into "…". */
export const MAX_VISIBLE_CRUMBS = 3;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The trail for the compact detail sheet header, built only from real,
 * projected relationships: a narrative location walks its
 * parent_location_id chain through the current (spoiler-safe) world, so a
 * parent that is not yet known never appears. Other selections show just
 * their own name.
 */
export function inspectorBreadcrumbTrail(
  selection: SelectionIdentity | null,
  world: NarrativeWorld,
  systems: readonly StellarSystem[],
): InspectorCrumb[] {
  if (!selection) return [];
  if (selection.kind === "chapter")
    return [
      {
        key: `chapter:${selection.id}`,
        label: `Chapter ${selection.id}`,
        target: null,
      },
    ];
  if (selection.kind === "astronomy") {
    const system = systems.find((candidate) => candidate.id === selection.id);
    return system
      ? [{ key: `astronomy:${system.id}`, label: system.name, target: null }]
      : [];
  }
  if (selection.kind === "component") {
    const system = systems.find(
      (candidate) => candidate.id === selection.systemId,
    );
    const component = system?.components.find(
      (candidate) => candidate.id === selection.id,
    );
    if (!system || !component) return [];
    return [
      { key: `astronomy:${system.id}`, label: system.name, target: null },
      {
        key: `component:${system.id}:${component.id}`,
        label: String(component.designation),
        target: null,
      },
    ];
  }
  const entities = new Map<string, NarrativeEntity>(
    world.entities.map((entity) => [entity.id, entity]),
  );
  const entity = entities.get(selection.id);
  if (!entity) return [];
  const chain: NarrativeEntity[] = [entity];
  const visited = new Set([entity.id]);
  let parentId =
    entity.entity_type === "location"
      ? stringValue(entity.parent_location_id)
      : null;
  while (parentId && !visited.has(parentId)) {
    const parent = entities.get(parentId);
    if (!parent) break;
    visited.add(parent.id);
    chain.unshift(parent);
    parentId = stringValue(parent.parent_location_id);
  }
  const labels = disambiguatedAdjacentLabels(chain);
  return chain.map((item, index) => ({
    key: item.id,
    label: labels[index] ?? String(item.name),
    target:
      index < chain.length - 1 ? { kind: "narrative", id: item.id } : null,
  }));
}

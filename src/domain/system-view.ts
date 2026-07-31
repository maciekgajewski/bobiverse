import type { NarrativeEntity, NarrativeWorld } from "../narrative/model";

export const RENDERABLE_ORBITAL_KINDS = new Set([
  "planet",
  "dwarf_planet",
  "moon",
  "asteroid_belt",
  "kuiper_belt",
  "oort_cloud",
]);

export interface SystemViewNode {
  entity: NarrativeEntity;
  parentId: string | null;
  childIds: readonly string[];
}

export interface SystemViewModel {
  systemId: string;
  astronomyId: string;
  nodes: ReadonlyMap<string, SystemViewNode>;
  activeCounts: ReadonlyMap<string, number>;
  activeTargets: readonly SystemActiveTarget[];
}

export interface SystemActiveTarget {
  id: string;
  displayName: string;
  hierarchyPath: string;
  visualNodeId: string | null;
  mappedSystemId: string | null;
}

export interface SystemLayoutItem {
  id: string;
  position: readonly [number, number, number];
  radius: number;
  detail: "focus" | "child" | "preview" | "context";
  interactive: boolean;
  orbitRadius?: number;
}

export function visibleSystemLabelIds(
  layout: readonly SystemLayoutItem[],
  activeCounts: ReadonlyMap<string, number>,
  selectedId: string | null,
  keyboardFocusedId: string | null,
  hoveredId: string | null,
): ReadonlySet<string> {
  const candidates = layout
    .map((item, index) => ({
      item,
      index,
      priority:
        (activeCounts.has(item.id) ? 8 : 0) +
        (selectedId === item.id || keyboardFocusedId === item.id ? 4 : 0) +
        (hoveredId === item.id ? 2 : 0) +
        (item.detail === "focus" ? 1 : 0),
    }))
    .filter(
      ({ item }) =>
        item.detail === "focus" ||
        item.detail === "child" ||
        activeCounts.has(item.id),
    )
    .sort(
      (left, right) =>
        right.priority - left.priority || left.index - right.index,
    );
  const accepted: typeof candidates = [];
  for (const candidate of candidates) {
    if (
      accepted.some(
        ({ item }) =>
          Math.abs(item.position[0] - candidate.item.position[0]) < 0.9 &&
          Math.abs(item.position[1] - candidate.item.position[1]) < 0.38,
      )
    )
      continue;
    accepted.push(candidate);
  }
  return new Set(accepted.map(({ item }) => item.id));
}

export function orbitalRegionPoints(
  kind: "asteroid_belt" | "kuiper_belt" | "oort_cloud",
  radius: number,
): readonly [number, number, number][] {
  const count =
    kind === "oort_cloud" ? 220 : kind === "kuiper_belt" ? 110 : 170;
  const points: [number, number, number][] = [];
  for (let index = 0; index < count; index += 1) {
    const phase = index * 2.399963229728653;
    if (kind === "oort_cloud") {
      const vertical = 1 - (2 * (index + 0.5)) / count;
      const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const shell = radius * (1.9 + ((index * 37) % 23) / 100);
      points.push([
        Math.cos(phase) * horizontal * shell,
        vertical * shell,
        Math.sin(phase) * horizontal * shell,
      ]);
    } else {
      const breadth = kind === "kuiper_belt" ? 0.42 : 0.2;
      const ring = radius * (1.45 + (((index * 29) % 31) / 100) * breadth);
      points.push([
        Math.cos(phase) * ring,
        Math.sin(phase) * ring,
        (((index * 17) % 19) / 18 - 0.5) * breadth * radius,
      ]);
    }
  }
  return points;
}

function childIds(entity: NarrativeEntity): string[] {
  return Array.isArray(entity.child_ids)
    ? entity.child_ids.filter((id): id is string => typeof id === "string")
    : [];
}

function isCurrentActivity(
  world: NarrativeWorld,
  mode: "chapter" | "date",
  sourceChapter: string,
  effectiveDate: string | null,
): boolean {
  return mode === "chapter"
    ? sourceChapter === world.view.chapter
    : Boolean(effectiveDate && effectiveDate === world.view.display_date);
}

export function projectSystemView(
  world: NarrativeWorld,
  systemId: string,
  mode: "chapter" | "date",
): SystemViewModel | null {
  const entities = new Map(world.entities.map((entity) => [entity.id, entity]));
  const root = entities.get(systemId);
  if (
    root?.entity_type !== "location" ||
    root.kind !== "star_system" ||
    typeof root.astronomy_object_id !== "string"
  ) {
    return null;
  }
  const nodes = new Map<string, SystemViewNode>();
  nodes.set(root.id, { entity: root, parentId: null, childIds: [] });
  const stars = childIds(root)
    .map((id) => entities.get(id))
    .filter(
      (entity): entity is NarrativeEntity =>
        entity?.entity_type === "location" &&
        entity.kind === "star" &&
        entity.parent_location_id === root.id &&
        entity.parent_relation === "member_of_system",
    );
  for (const star of stars) {
    nodes.set(star.id, { entity: star, parentId: root.id, childIds: [] });
    const visit = (parent: NarrativeEntity) => {
      for (const id of childIds(parent)) {
        const child = entities.get(id);
        if (
          child?.entity_type !== "location" ||
          child.parent_location_id !== parent.id ||
          child.parent_relation !== "orbits" ||
          !RENDERABLE_ORBITAL_KINDS.has(String(child.kind))
        ) {
          continue;
        }
        nodes.set(child.id, {
          entity: child,
          parentId: parent.id,
          childIds: [],
        });
        visit(child);
      }
    };
    visit(star);
  }
  for (const node of nodes.values()) {
    const ordered = childIds(node.entity).filter((id) => nodes.has(id));
    nodes.set(node.entity.id, { ...node, childIds: ordered });
  }
  const meaningful =
    stars.length > 1 ||
    stars.some((star) => nodes.get(star.id)!.childIds.length > 0);
  if (!meaningful) return null;

  const activeCounts = new Map<string, number>();
  const activeTargets: SystemActiveTarget[] = [];
  const seenActiveLocations = new Set<string>();
  for (const activity of world.activity) {
    if (
      !isCurrentActivity(
        world,
        mode,
        activity.source_chapter,
        activity.effective_date,
      )
    ) {
      continue;
    }
    if (activity.reasons.every((reason) => reason === "mapped_system_ancestry"))
      continue;
    const actual = entities.get(activity.entity_id);
    if (
      actual?.entity_type !== "location" ||
      seenActiveLocations.has(actual.id)
    )
      continue;
    seenActiveLocations.add(actual.id);
    let current: NarrativeEntity | undefined = actual;
    const visited = new Set<string>();
    let visualNodeId: string | null = null;
    let mappedSystemId: string | null = null;
    const path: string[] = [];
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(String(current.name ?? current.id));
      if (!visualNodeId && nodes.has(current.id)) visualNodeId = current.id;
      if (
        current.kind === "star_system" &&
        typeof current.astronomy_object_id === "string"
      )
        mappedSystemId = current.id;
      current =
        typeof current.parent_location_id === "string"
          ? entities.get(current.parent_location_id)
          : undefined;
    }
    if (visualNodeId)
      activeCounts.set(visualNodeId, (activeCounts.get(visualNodeId) ?? 0) + 1);
    activeTargets.push({
      id: actual.id,
      displayName: String(actual.name ?? actual.id),
      hierarchyPath: path.join(" / "),
      visualNodeId,
      mappedSystemId,
    });
  }
  activeTargets.sort(
    (left, right) =>
      String(entities.get(left.mappedSystemId ?? "")?.name ?? "").localeCompare(
        String(entities.get(right.mappedSystemId ?? "")?.name ?? ""),
      ) ||
      left.hierarchyPath.localeCompare(right.hierarchyPath) ||
      left.displayName.localeCompare(right.displayName) ||
      left.id.localeCompare(right.id),
  );
  return {
    systemId: root.id,
    astronomyId: root.astronomy_object_id,
    nodes,
    activeCounts,
    activeTargets,
  };
}

export function focusPath(
  model: SystemViewModel,
  requestedId: string,
): string[] {
  let current =
    model.nodes.get(requestedId) ?? model.nodes.get(model.systemId)!;
  const reversed: string[] = [];
  const visited = new Set<string>();
  while (current && !visited.has(current.entity.id)) {
    visited.add(current.entity.id);
    reversed.push(current.entity.id);
    current = current.parentId
      ? model.nodes.get(current.parentId)!
      : undefined!;
  }
  return reversed.reverse();
}

export function initialSystemFocusPath(model: SystemViewModel): string[] {
  const root = model.nodes.get(model.systemId)!;
  const componentStars = root.childIds.filter(
    (id) => model.nodes.get(id)?.entity.kind === "star",
  );
  return componentStars.length === 1
    ? focusPath(model, componentStars[0]!)
    : [model.systemId];
}

export function retreatSystemFocusPath(
  model: SystemViewModel,
  previousPath: readonly string[],
): string[] {
  const nearest = [...previousPath].reverse().find((id) => model.nodes.has(id));
  return focusPath(model, nearest ?? model.systemId);
}

export function nearestSystemViewNode(
  model: SystemViewModel,
  world: NarrativeWorld,
  locationId: string,
): string | null {
  const entities = new Map(world.entities.map((entity) => [entity.id, entity]));
  let current = entities.get(locationId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (model.nodes.has(current.id)) return current.id;
    current =
      typeof current.parent_location_id === "string"
        ? entities.get(current.parent_location_id)
        : undefined;
  }
  return null;
}

export function bodyCategoryRadius(entity: NarrativeEntity): number {
  if (entity.kind === "star") return 0.52;
  if (entity.kind === "moon") return 0.12;
  if (entity.kind === "dwarf_planet" || entity.body_class === "dwarf_planet")
    return 0.15;
  if (entity.body_class === "gas_giant") return 0.28;
  if (entity.body_class === "ice_giant") return 0.24;
  if (entity.kind === "planet") return 0.19;
  return 0.18;
}

export function systemViewLayout(
  model: SystemViewModel,
  focusedId: string,
  compact: boolean,
): SystemLayoutItem[] {
  const focus = model.nodes.get(focusedId) ?? model.nodes.get(model.systemId)!;
  const rootOverview = focus.entity.kind === "star_system";
  const result: SystemLayoutItem[] = [
    {
      id: focus.entity.id,
      position: [0, 0, 0],
      radius: rootOverview ? 0 : bodyCategoryRadius(focus.entity),
      detail: "focus",
      interactive: !rootOverview,
    },
  ];
  const children = focus.childIds;
  const spacing = rootOverview ? (compact ? 1.2 : 1.55) : compact ? 1.05 : 1.28;
  children.forEach((id, index) => {
    const angle =
      children.length === 1 ? -0.28 : -0.42 + index * 2.399963229728653;
    const orbit = rootOverview
      ? spacing + index * (compact ? 0.34 : 0.48)
      : spacing + index * (compact ? 0.42 : 0.55);
    const child = model.nodes.get(id)!;
    result.push({
      id,
      position: [Math.cos(angle) * orbit, Math.sin(angle) * orbit, 0],
      radius: bodyCategoryRadius(child.entity),
      detail: "child",
      interactive: true,
      orbitRadius: orbit,
    });
    if (!compact || index < 5) {
      child.childIds.forEach((previewId, previewIndex) => {
        const preview = model.nodes.get(previewId)!;
        result.push({
          id: previewId,
          position: [
            Math.cos(angle) * orbit + 0.28 + previewIndex * 0.13,
            Math.sin(angle) * orbit + 0.18,
            0,
          ],
          radius: bodyCategoryRadius(preview.entity) * 0.48,
          detail: "preview",
          interactive: false,
        });
      });
    }
  });
  if (focus.parentId) {
    const parent = model.nodes.get(focus.parentId)!;
    result.push({
      id: parent.entity.id,
      position: [-2.25, 1.25, -0.4],
      radius: bodyCategoryRadius(parent.entity) * 0.7,
      detail: "context",
      interactive: false,
    });
    parent.childIds
      .filter((id) => id !== focus.entity.id && !children.includes(id))
      .slice(0, compact ? 2 : parent.childIds.length)
      .forEach((id, index) => {
        const sibling = model.nodes.get(id)!;
        result.push({
          id,
          position: [-2.25 + index * 0.42, 0.62 - index * 0.48, -0.55],
          radius: bodyCategoryRadius(sibling.entity) * 0.55,
          detail: "context",
          interactive: false,
        });
      });
  }
  return result;
}

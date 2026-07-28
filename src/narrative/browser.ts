import {
  compareNarrativeChapters,
  compareNarrativeDates,
  compareNarrativeMoments,
  type NarrativeActivity,
  type NarrativeEntity,
  type NarrativeWorld,
} from "./model";

export const browserGroupDefinitions = [
  { id: "characters", label: "Characters" },
  { id: "events", label: "Events" },
  { id: "star-systems", label: "Star Systems" },
  { id: "other-locations", label: "Other Locations" },
  { id: "species", label: "Species" },
  { id: "technologies", label: "Technologies" },
  { id: "organizations", label: "Organizations" },
  { id: "vessel-types", label: "Vessel Types" },
] as const;

export type BrowserGroupId = (typeof browserGroupDefinitions)[number]["id"];
export type BrowserGroupState = Record<BrowserGroupId, boolean>;
export type BrowserMode = "chapter" | "date";

export interface NarrativeBrowserItem {
  entity: NarrativeEntity;
  name: string;
  aliases: string[];
  active: boolean;
  lastActivity: NarrativeActivity | null;
}

export interface NarrativeBrowserGroup {
  id: BrowserGroupId;
  label: string;
  items: NarrativeBrowserItem[];
  eligibleCount: number;
  activeCount: number;
}

const nameCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

export function defaultBrowserGroupState(): BrowserGroupState {
  return Object.fromEntries(
    browserGroupDefinitions.map(({ id }) => [id, true]),
  ) as BrowserGroupState;
}

export function normalizeBrowserGroupState(
  candidate: unknown,
): BrowserGroupState {
  const record =
    candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    browserGroupDefinitions.map(({ id }) => [
      id,
      typeof record[id] === "boolean" ? record[id] : true,
    ]),
  ) as BrowserGroupState;
}

export function normalizeBrowserSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .trim();
}

function entityGroup(entity: NarrativeEntity): BrowserGroupId {
  switch (entity.entity_type) {
    case "character":
      return "characters";
    case "event":
      return "events";
    case "species":
      return "species";
    case "technology":
      return "technologies";
    case "organization":
      return "organizations";
    case "vessel_type":
      return "vessel-types";
    case "location":
      return entity.kind === "star_system" ? "star-systems" : "other-locations";
  }
}

function activityAtOrBefore(
  activity: NarrativeActivity,
  displayDate: string,
): boolean {
  if (!activity.effective_date) return false;
  const ordering = compareNarrativeDates(activity.effective_date, displayDate);
  return ordering !== null && ordering <= 0;
}

function latestActivity(
  activities: readonly NarrativeActivity[],
  mode: BrowserMode,
  displayDate: string | null,
): NarrativeActivity | null {
  const eligible =
    mode === "date" && displayDate
      ? activities.filter((activity) =>
          activityAtOrBefore(activity, displayDate),
        )
      : [...activities];
  if (eligible.length === 0) return null;
  if (mode === "date") {
    const uniquelyLatest = eligible.filter((candidate, candidateIndex) =>
      eligible.every((other, otherIndex) => {
        if (candidateIndex === otherIndex) return true;
        if (!candidate.effective_date || !other.effective_date) return false;
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
    return uniquelyLatest.length === 1 ? uniquelyLatest[0]! : null;
  }
  return eligible.reduce((latest, candidate) => {
    return compareNarrativeChapters(
      candidate.source_chapter,
      latest.source_chapter,
    ) > 0
      ? candidate
      : latest;
  });
}

function isActive(
  activities: readonly NarrativeActivity[],
  world: NarrativeWorld,
  mode: BrowserMode,
): boolean {
  if (mode === "chapter") {
    return Boolean(
      world.view.chapter &&
      activities.some(
        (activity) => activity.source_chapter === world.view.chapter,
      ),
    );
  }
  return Boolean(
    world.view.display_date &&
    activities.some(
      (activity) =>
        activity.effective_date === world.view.display_date &&
        activityAtOrBefore(activity, world.view.display_date!),
    ),
  );
}

function compareItems(
  left: NarrativeBrowserItem,
  right: NarrativeBrowserItem,
  mode: BrowserMode,
): number {
  if (left.active !== right.active) return left.active ? -1 : 1;
  if (left.lastActivity && !right.lastActivity) return -1;
  if (!left.lastActivity && right.lastActivity) return 1;
  if (left.lastActivity && right.lastActivity) {
    const recency =
      mode === "chapter"
        ? compareNarrativeChapters(
            right.lastActivity.source_chapter,
            left.lastActivity.source_chapter,
          )
        : left.lastActivity.effective_date && right.lastActivity.effective_date
          ? (compareNarrativeMoments(
              {
                date: right.lastActivity.effective_date,
                sourceChapter: right.lastActivity.source_chapter,
              },
              {
                date: left.lastActivity.effective_date,
                sourceChapter: left.lastActivity.source_chapter,
              },
            ) ?? 0)
          : 0;
    if (recency !== 0) return recency;
  }
  return (
    nameCollator.compare(left.name, right.name) ||
    left.entity.id.localeCompare(right.entity.id)
  );
}

export function buildNarrativeBrowserGroups(
  world: NarrativeWorld,
  mode: BrowserMode,
  query = "",
): NarrativeBrowserGroup[] {
  const normalizedQuery = normalizeBrowserSearch(query);
  const activityByEntity = new Map<string, NarrativeActivity[]>();
  for (const activity of world.activity) {
    const records = activityByEntity.get(activity.entity_id) ?? [];
    records.push(activity);
    activityByEntity.set(activity.entity_id, records);
  }
  const allItems = world.entities.map((entity): NarrativeBrowserItem => {
    const activities = activityByEntity.get(entity.id) ?? [];
    return {
      entity,
      name: String(entity.name),
      aliases: Array.isArray(entity.aliases)
        ? entity.aliases.filter(
            (alias): alias is string => typeof alias === "string",
          )
        : [],
      active: isActive(activities, world, mode),
      lastActivity: latestActivity(activities, mode, world.view.display_date),
    };
  });
  return browserGroupDefinitions.flatMap(({ id, label }) => {
    const eligible = allItems
      .filter((item) => entityGroup(item.entity) === id)
      .sort((left, right) => compareItems(left, right, mode));
    if (eligible.length === 0) return [];
    const items = normalizedQuery
      ? eligible.filter((item) =>
          [item.name, ...item.aliases].some((value) =>
            normalizeBrowserSearch(value).includes(normalizedQuery),
          ),
        )
      : eligible;
    if (normalizedQuery && items.length === 0) return [];
    return [
      {
        id,
        label,
        items,
        eligibleCount: items.length,
        activeCount: items.filter((item) => item.active).length,
      },
    ];
  });
}

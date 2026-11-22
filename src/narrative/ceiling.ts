/**
 * Story-time helpers for the two ceilings of the design principles
 * (`docs/design-principles.md`, ADR-0031): whether a dated fact is known at a
 * soft ceiling (rule (e)), a chapter's latest date (§3.1), which is the soft
 * ceiling chapter view uses (rule (d)), and the earliest known story date of an
 * entity (rule (a)).
 *
 * These are pure functions over canonical chapter records and ADR-0026 dates.
 * They do not change validation: `isNarrativeDateEligible` stays strict.
 */
import {
  compareNarrativeChapters,
  narrativeDateRange,
  type NarrativeDateRange,
  type NarrativeRecord,
} from "./model";

/**
 * Rule (e): a fact dated to a year or a month counts as known throughout that
 * whole period. The fact is known at the soft ceiling when its calendar range
 * starts on or before the end of the ceiling's range. When both dates name the
 * same calendar range, the ordering suffix decides, as in ADR-0026: the fact is
 * known when its suffix is not higher than the ceiling's (a missing suffix is
 * zero). Suffixes never matter between different ranges.
 *
 * So `2185` is known at `2185-04`, `2185-04` is known at `2185`, `2185-05` is
 * not known at `2185-04`, `2185.2` is known at `2185.2` but not at `2185.1`.
 * Both arguments must be canonical narrative dates; invalid ones throw.
 */
export function isKnownAtCeiling(factDate: string, ceiling: string): boolean {
  const fact = narrativeDateRange(factDate);
  const limit = narrativeDateRange(ceiling);
  if (fact.start === limit.start && fact.end === limit.end)
    return fact.suffix <= limit.suffix;
  return fact.start <= limit.end;
}

/** Later story date first: later range end, then later start, then higher suffix. */
function compareLatest(left: NarrativeDateRange, right: NarrativeDateRange) {
  return (
    left.end - right.end ||
    left.start - right.start ||
    (left.suffix < right.suffix ? -1 : left.suffix > right.suffix ? 1 : 0)
  );
}

/** Earlier story date first: earlier range start, then earlier end, then lower suffix. */
function compareEarliest(left: NarrativeDateRange, right: NarrativeDateRange) {
  return (
    left.start - right.start ||
    left.end - right.end ||
    (left.suffix < right.suffix ? -1 : left.suffix > right.suffix ? 1 : 0)
  );
}

function records(value: unknown): NarrativeRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is NarrativeRecord =>
          !!item && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function isEventId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("event:");
}

function headerDate(chapter: NarrativeRecord): string {
  if (typeof chapter.date !== "string")
    throw new Error(
      `Chapter ${String(chapter.chapter)} date must be a string.`,
    );
  return chapter.date;
}

function chapterRef(chapter: NarrativeRecord): string {
  if (typeof chapter.chapter !== "string")
    throw new Error("Chapter reference must be a string.");
  return chapter.chapter;
}

/**
 * §3.1: a chapter's latest date, the soft ceiling chapter view uses (rule (d)).
 * It is the latest of the chapter's header `date`, the `date` of each event the
 * chapter introduces, each event `date` its `updates` supply (a `null` that
 * clears a date does not count) and each update's `effective_date`. Undated
 * events, appearances, mentions, locations and entity fields such as
 * `birth_date` do not count.
 *
 * "Latest" compares the end of each calendar range; among dates that end
 * together, the latest start wins, then the higher ordering suffix. Exact ties
 * keep the header date. Returns the winning date string as written.
 */
export function chapterLatestDate(chapter: NarrativeRecord): string {
  let latest = headerDate(chapter);
  let latestRange = narrativeDateRange(latest);
  const consider = (candidate: unknown) => {
    if (typeof candidate !== "string") return;
    const range = narrativeDateRange(candidate);
    if (compareLatest(range, latestRange) > 0) {
      latest = candidate;
      latestRange = range;
    }
  };
  for (const introduced of records(chapter.introducing)) {
    if (isEventId(introduced.id)) consider(introduced.date);
  }
  for (const update of records(chapter.updates)) {
    if (isEventId(update.entity_id)) consider(update.date);
    consider(update.effective_date);
  }
  return latest;
}

/**
 * Rule (a): the earliest known story date of every entity that chapters up to
 * Read through write about, keyed by entity ID. An entity exists at a soft
 * ceiling when `isKnownAtCeiling(earliest, ceiling)`.
 *
 * `chapters` are canonical chapter records in any order (for example
 * `preparedNarrativeChapters(corpus)`); only chapters at or before `readThrough`
 * in reading order are used (the hard ceiling), and `null` means nothing has
 * been read, which gives an empty map. Each revealed fact is dated as the
 * projection dates it:
 *
 * - an introduction by the chapter's header date, or an event's own `date`;
 * - an update by its `effective_date ?? chapter date`; an update to an event by
 *   the `date` it supplies, else the event's current date, else the chapter date;
 * - an appearance of a character by the chapter's header date;
 * - a supplemental mention (ADR-0017) by the mentioning chapter's header date;
 * - an introduction's `first_mentioned` (ADR-0032) by the header date of the
 *   chapter it names. That chapter is earlier than the introduction, so it is
 *   already read.
 *
 * An event exists from its own date when it has one (§2.3), so mentions and
 * `first_mentioned` do not date events; for an event, `first_mentioned` only
 * gives the card line (ADR-0032 S3).
 *
 * Mentions count because an entity exists from the earliest story date of any
 * fact about it, a mention included (§2.3). Undated facts take the revealing
 * chapter's date (rule (c)). Entity fields such as `birth_date` do not count. Zero-state (pre-book)
 * entities exist at every ceiling; they appear in the map only when a chapter
 * writes about them, so callers should not hide an entity that is missing from
 * the map.
 *
 * "Earliest" compares the start of each calendar range; among dates that start
 * together, the earliest end wins, then the lower suffix. Returns the dates as
 * written.
 */
export function entityEarliestDates(
  chapters: readonly NarrativeRecord[],
  readThrough: string | null,
): ReadonlyMap<string, string> {
  const earliest = new Map<string, string>();
  if (readThrough === null) return earliest;
  const consider = (entityId: unknown, date: string) => {
    if (typeof entityId !== "string") return;
    const prior = earliest.get(entityId);
    if (
      prior === undefined ||
      compareEarliest(narrativeDateRange(date), narrativeDateRange(prior)) < 0
    )
      earliest.set(entityId, date);
  };
  const revealed = chapters
    .filter(
      (chapter) =>
        compareNarrativeChapters(chapterRef(chapter), readThrough) <= 0,
    )
    .sort((left, right) =>
      compareNarrativeChapters(chapterRef(left), chapterRef(right)),
    );
  const headerDates = new Map(
    revealed.map((chapter) => [chapterRef(chapter), headerDate(chapter)]),
  );
  // An event's date as the facts read so far leave it; an update may set or clear it.
  const eventDates = new Map<string, string | null>();
  for (const chapter of revealed) {
    const date = headerDate(chapter);
    for (const introduced of records(chapter.introducing)) {
      const id = introduced.id;
      const firstMentioned =
        typeof introduced.first_mentioned === "string"
          ? headerDates.get(introduced.first_mentioned)
          : undefined;
      if (firstMentioned !== undefined && !isEventId(id))
        consider(id, firstMentioned);
      if (isEventId(id)) {
        const eventDate =
          typeof introduced.date === "string" ? introduced.date : null;
        eventDates.set(id, eventDate);
        consider(id, eventDate ?? date);
      } else {
        consider(id, date);
      }
    }
    for (const update of records(chapter.updates)) {
      const id = update.entity_id;
      if (isEventId(id)) {
        const supplied = typeof update.date === "string" ? update.date : null;
        consider(id, supplied ?? eventDates.get(id) ?? date);
        if ("date" in update) eventDates.set(id, supplied);
      } else {
        consider(
          id,
          typeof update.effective_date === "string"
            ? update.effective_date
            : date,
        );
      }
    }
    for (const appearance of records(chapter.appearances)) {
      consider(appearance.character_id, date);
    }
    if (Array.isArray(chapter.mentions)) {
      for (const target of chapter.mentions as unknown[])
        if (!isEventId(target)) consider(target, date);
    }
  }
  return earliest;
}

/**
 * Rule (a) for one entity: its earliest known story date from chapters up to
 * `readThrough`, or `null` when none of them writes about it. See
 * `entityEarliestDates`, which callers projecting many entities should use once.
 */
export function entityEarliestDate(
  chapters: readonly NarrativeRecord[],
  entityId: string,
  readThrough: string | null,
): string | null {
  return entityEarliestDates(chapters, readThrough).get(entityId) ?? null;
}

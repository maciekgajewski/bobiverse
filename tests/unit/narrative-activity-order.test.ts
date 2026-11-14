import { describe, expect, it } from "vitest";
import {
  collectNarrativeActivity,
  generateNarrativeWorld,
  meaningfulNarrativeDateOptions,
  orderNarrativeActivity,
  preparedNarrativeChapters,
  type NarrativeActivity,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

// Reference implementation: the pre-BOB-20261114-JD5VFR activity ordering,
// copied verbatim (repeated scan, dates re-parsed on every comparison) so the
// topological sort can be checked against it on the real corpus.
const referenceDatePattern =
  /^(?<year>[1-9][0-9]{3})(?:-(?<month>0[1-9]|1[0-2])(?:-(?<day>0[1-9]|[12][0-9]|3[01]))?)?(?:\.(?<suffix>0|[1-9][0-9]*))?$/;

interface ReferenceDate {
  year: number;
  month: number | null;
  day: number | null;
  suffix: bigint;
  precision: "year" | "month" | "day";
}

function referenceIsLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function referenceDaysInMonth(year: number, month: number): number {
  return [
    31,
    referenceIsLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1]!;
}

function referenceParseDate(value: string): ReferenceDate {
  const match = referenceDatePattern.exec(value);
  if (!match?.groups) throw new Error(`Invalid narrative date: ${value}.`);
  const year = Number(match.groups.year);
  const month = match.groups.month ? Number(match.groups.month) : null;
  const day = match.groups.day ? Number(match.groups.day) : null;
  if (day !== null && month !== null && day > referenceDaysInMonth(year, month))
    throw new Error(`Invalid Gregorian narrative date: ${value}.`);
  return {
    year,
    month,
    day,
    suffix: BigInt(match.groups.suffix ?? "0"),
    precision: day !== null ? "day" : month !== null ? "month" : "year",
  };
}

function referenceRange(date: ReferenceDate): [number, number] {
  const start =
    Date.UTC(date.year, (date.month ?? 1) - 1, date.day ?? 1) / 86400000;
  if (date.precision === "day") return [start, start];
  if (date.precision === "month")
    return [
      start,
      Date.UTC(
        date.year,
        date.month! - 1,
        referenceDaysInMonth(date.year, date.month!),
      ) / 86400000,
    ];
  return [start, Date.UTC(date.year, 11, 31) / 86400000];
}

function referenceCompareDates(left: string, right: string): number | null {
  const leftDate = referenceParseDate(left);
  const rightDate = referenceParseDate(right);
  const [leftStart, leftEnd] = referenceRange(leftDate);
  const [rightStart, rightEnd] = referenceRange(rightDate);
  if (leftEnd < rightStart) return -1;
  if (rightEnd < leftStart) return 1;
  if (leftDate.precision !== rightDate.precision || leftStart !== rightStart)
    return null;
  return leftDate.suffix < rightDate.suffix
    ? -1
    : leftDate.suffix > rightDate.suffix
      ? 1
      : 0;
}

function referenceCompareChapters(left: string, right: string): number {
  const [leftBook, leftChapter] = left.split(".").map(Number);
  const [rightBook, rightChapter] = right.split(".").map(Number);
  return leftBook! - rightBook! || leftChapter! - rightChapter!;
}

function referenceCompareMoments(
  left: { date: string; sourceChapter: string },
  right: { date: string; sourceChapter: string },
): number | null {
  const dateOrdering = referenceCompareDates(left.date, right.date);
  return dateOrdering !== null && dateOrdering !== 0
    ? dateOrdering
    : referenceCompareChapters(left.sourceChapter, right.sourceChapter);
}

function referenceTieOrder(
  left: NarrativeActivity,
  right: NarrativeActivity,
): number {
  return (
    referenceCompareChapters(left.source_chapter, right.source_chapter) ||
    (left.effective_date ?? "").localeCompare(right.effective_date ?? "") ||
    left.entity_id.localeCompare(right.entity_id)
  );
}

function referencePrecedes(
  left: NarrativeActivity,
  right: NarrativeActivity,
): boolean {
  if (!left.effective_date || !right.effective_date) return false;
  const ordering = referenceCompareMoments(
    { date: left.effective_date, sourceChapter: left.source_chapter },
    { date: right.effective_date, sourceChapter: right.source_chapter },
  );
  return ordering !== null && ordering < 0;
}

// The predicate is pure, so the corpus test memoizes it per record pair to
// keep the cubic scan affordable; the scan itself is unchanged.
type Precedes = (left: NarrativeActivity, right: NarrativeActivity) => boolean;

function memoizedReferencePrecedes(): Precedes {
  const capacity = 4096;
  const indexes = new Map<string, number>();
  const recordIndexes = new WeakMap<NarrativeActivity, number>();
  // 0: not computed, 1: false, 2: true.
  const results = new Uint8Array(capacity * capacity);
  const indexOf = (record: NarrativeActivity) => {
    let index = recordIndexes.get(record);
    if (index === undefined) {
      const key = activityKey(record);
      index = indexes.get(key);
      if (index === undefined) {
        index = indexes.size;
        if (index >= capacity) throw new Error("Reference memo is full.");
        indexes.set(key, index);
      }
      recordIndexes.set(record, index);
    }
    return index;
  };
  return (left, right) => {
    const pair = indexOf(left) * capacity + indexOf(right);
    if (results[pair] === 0)
      results[pair] = referencePrecedes(left, right) ? 2 : 1;
    return results[pair] === 2;
  };
}

function referenceOrder(
  records: NarrativeActivity[],
  precedes: Precedes = referencePrecedes,
): NarrativeActivity[] {
  const remaining = [...records];
  const ordered: NarrativeActivity[] = [];
  while (remaining.length > 0) {
    const available = remaining
      .filter(
        (candidate) =>
          !remaining.some(
            (other) => other !== candidate && precedes(other, candidate),
          ),
      )
      .sort(referenceTieOrder);
    const next = available[0];
    if (!next) {
      throw new Error("Narrative activity ordering contains a cycle.");
    }
    ordered.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }
  return ordered;
}

const activityKey = (activity: NarrativeActivity) =>
  `${activity.entity_id}|${activity.source_chapter}|${activity.effective_date ?? ""}`;

function activity(
  entityId: string,
  sourceChapter: string,
  effectiveDate: string | null,
): NarrativeActivity {
  return {
    entity_id: entityId,
    source_chapter: sourceChapter,
    effective_date: effectiveDate,
    reasons: ["mention"],
  } as NarrativeActivity;
}

describe("narrative activity ordering", () => {
  if (!narrativeCorpus)
    throw new Error("Canonical narrative preparation failed.");
  const corpus = narrativeCorpus;
  const chapters = preparedNarrativeChapters(corpus);

  it("matches the reference repeated-scan order for every chapter", () => {
    let compared = 0;
    const precedes = memoizedReferencePrecedes();
    for (let index = 0; index < chapters.length; index += 1) {
      const visible = chapters.slice(0, index + 1);
      const chapter = String(visible.at(-1)!.chapter);
      const collected = collectNarrativeActivity(
        corpus.zeroState,
        visible,
        corpus.knownAstronomyObjectIds,
      );
      const expected = referenceOrder(collected, precedes).map(activityKey);
      expect(
        orderNarrativeActivity(collected).map(activityKey),
        chapter,
      ).toEqual(expected);
      expect(
        generateNarrativeWorld(corpus, chapter).activity.map(activityKey),
        chapter,
      ).toEqual(expected);
      compared += 1;
    }
    expect(compared).toBe(chapters.length);
  }, 60_000);

  it("ignores input order apart from exact ties", () => {
    const visible = chapters.slice(0, 20);
    const collected = collectNarrativeActivity(
      corpus.zeroState,
      visible,
      corpus.knownAstronomyObjectIds,
    );
    expect(orderNarrativeActivity([...collected].reverse())).toEqual(
      orderNarrativeActivity(collected),
    );
  });

  it("matches the reference with undated records mixed in", () => {
    const records = [
      activity("character:c", "1.3", "2134"),
      activity("character:b", "1.2", "2134-05-02"),
      activity("character:a", "1.1", "2134-05-01"),
      activity("character:d", "1.1", null),
      activity("character:e", "1.1", null),
    ];
    expect(orderNarrativeActivity(records).map(activityKey)).toEqual(
      referenceOrder(records).map(activityKey),
    );
  });

  it("rejects a precedence cycle like the reference", () => {
    // Dated precedence can cycle across precisions: the year overlaps both
    // days, so it falls back to chapter order (after 1.1, before 1.3), while
    // the May day precedes the June day by date.
    const records = [
      activity("character:a", "1.2", "2134"),
      activity("character:b", "1.1", "2134-06-01"),
      activity("character:c", "1.3", "2134-05-01"),
    ];
    expect(() => referenceOrder(records)).toThrow(
      "Narrative activity ordering contains a cycle.",
    );
    expect(() => orderNarrativeActivity(records)).toThrow(
      "Narrative activity ordering contains a cycle.",
    );
  });

  it("shares one ordered activity list between worlds and date options", () => {
    const chapter = String(chapters.at(-1)!.chapter);
    const first = generateNarrativeWorld(corpus, chapter);
    const second = generateNarrativeWorld(corpus, chapter);
    expect(second.activity).toEqual(first.activity);
    expect(second.activity).not.toBe(first.activity);
    first.activity[0]!.reasons.push("mention");
    expect(generateNarrativeWorld(corpus, chapter).activity).toEqual(
      second.activity,
    );
    const dates = meaningfulNarrativeDateOptions(corpus, chapter).map(
      ({ date }) => date,
    );
    for (const record of second.activity) {
      if (record.effective_date) expect(dates).toContain(record.effective_date);
    }
  });
});

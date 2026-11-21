import {
  compareNarrativeChapters,
  compareNarrativeDates,
  type NarrativeRecord,
} from "./model";
import {
  containsInlineLinkMarkup,
  inlineLinksToPlainText,
} from "./inline-links";

/**
 * Merged-text sentence preservation (BOB-20261113-JRV53G).
 *
 * A chapter that writes a prose field which already had a value keeps every
 * sentence of the earlier value it is compared against verbatim. Which earlier
 * value that is depends on the field's policy below. Only chapter-authored writes
 * (introductions and updates) are compared; zero-state values are not.
 *
 * Values are compared as display text (ADR-0029): inline entity links become
 * their labels or default names and escapes are removed before sentences are
 * split, so adding or removing link markup around unchanged words is not a
 * violation, while changing the visible words still is.
 *
 * This is offline editorial tooling run by `narrative:validate`. Projection never
 * calls it, so the browser bundle and the reader-facing model are unchanged.
 */

/**
 * Which prose fields are checked, and against which earlier write.
 *
 * - `always`: every write must keep the sentences of the latest-read earlier
 *   write, whatever either's story date. `description` is fused from everything
 *   read (docs/design-principles.md rule (f)), as is `visual_description`.
 * - `back-dated`: a write is a snapshot of the entity's condition as of its own
 *   story date (`effective_date ?? chapter date`). A write dated at its chapter
 *   (no `effective_date`, or one not strictly earlier than the chapter date) is a
 *   new observation at the story's present: it replaces any earlier-read state
 *   of the same date, as the soft-ceiling projection does when dates tie (the
 *   later-read write wins), and is not checked. A back-dated write
 *   (`effective_date` strictly earlier than the chapter date) reveals something
 *   about a past moment, so it must keep the sentences of the latest-read
 *   earlier write whose date is equal to or overlaps its own
 *   (`compareNarrativeDates` returns `0` or `null`, as for `2185` and
 *   `2185-04`), unless its update says `"supersedes": true`. Earlier-read writes
 *   strictly earlier or later in story time are different snapshots and are not
 *   compared: a state dated earlier must not carry later facts, and a later one
 *   may replace them (docs/design-principles.md §2.5).
 *
 * `supersedes: true` declares that a back-dated update replaces the earlier
 * state of its moment. It is an error unless the update is back-dated and its
 * `state` or `current_state` would drop a sentence; it never exempts
 * `description` or `visual_description`.
 */
export const sentencePreservationPolicy = {
  description: "always",
  visual_description: "always",
  state: "back-dated",
  current_state: "back-dated",
} as const satisfies Record<string, "always" | "back-dated">;

export type SentencePreservedField = keyof typeof sentencePreservationPolicy;

export const sentencePreservedFields = Object.freeze(
  Object.keys(sentencePreservationPolicy) as SentencePreservedField[],
);

/**
 * Words that end with a full stop without ending a sentence. Compared
 * case-insensitively, without the final stop.
 */
const nonTerminalAbbreviations = new Set([
  "approx",
  "ca",
  "cf",
  "dr",
  "e.g",
  "etc",
  "i.e",
  "jr",
  "mr",
  "mrs",
  "ms",
  "mt",
  "no",
  "prof",
  "sr",
  "st",
  "vs",
]);

/**
 * Splits prose into sentences with one deterministic rule.
 *
 * A sentence ends at a run of `.`, `!` or `?`, with any directly following
 * closing quotes or brackets, when whitespace or the end of the text follows. A
 * single full stop does not end a sentence when the word before it is a single
 * letter or a dotted run of single letters (an initial, as in `R. Riker`, or
 * `U.S.`), or a listed abbreviation (`St.`, `Dr.`, `Mt.`, `e.g.` and the others
 * above), and that word is preceded by the start of the text or by a non-letter
 * that is not an apostrophe (`'` or `\u2019`). A possessive such as `Romulus's.`
 * or `Bobs'.` therefore ends the sentence. A decimal point (`99.9`) is never
 * followed by whitespace, so it never splits. Each sentence is trimmed and its
 * internal whitespace collapsed to one space; empty pieces are dropped.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const terminator = /[.!?]+["'\u201d\u2019)\]]*(?=\s|$)/g;
  for (const match of text.matchAll(terminator)) {
    if (/^\.(?![.!?])/.test(match[0])) {
      const prefix = text.slice(start, match.index);
      const wordMatch = /(?:^|([^A-Za-z]))([A-Za-z]+(?:\.[A-Za-z]+)*)$/.exec(
        prefix,
      );
      const preceding = wordMatch?.[1];
      const word = wordMatch?.[2];
      if (
        word !== undefined &&
        (preceding === undefined ||
          (preceding !== "'" && preceding !== "\u2019")) &&
        (/^(?:[A-Za-z]\.)*[A-Za-z]$/.test(word) ||
          nonTerminalAbbreviations.has(word.toLowerCase()))
      ) {
        continue;
      }
    }
    const end = match.index + match[0].length;
    sentences.push(text.slice(start, end));
    start = end;
  }
  sentences.push(text.slice(start));
  return sentences
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length > 0);
}

export interface SentencePreservationViolation {
  entityId: string;
  field: SentencePreservedField;
  chapter: string;
  /** JSON pointer of the offending write inside the chapter file. */
  pointer: string;
  earlierChapter: string;
  /** Zero-based index of the missing sentence in the earlier value. */
  sentenceIndex: number;
  sentenceCount: number;
  sentence: string;
}

/** An update marked `supersedes: true` that replaces no earlier sentence. */
export interface UnusedSupersedesMarker {
  entityId: string;
  chapter: string;
  /** JSON pointer of the marker inside the chapter file. */
  pointer: string;
}

interface ChapterWrite {
  value: string;
  /** Story date of the write: `effective_date ?? chapter date`. */
  date: string;
  /** `effective_date` is strictly earlier than the chapter date. */
  backDated: boolean;
  /** Pointer of the record's `supersedes: true` marker, if it has one. */
  marker: string | undefined;
  pointer: string;
}

interface ReadWrite extends ChapterWrite {
  chapter: string;
}

export interface SentencePreservationOptions {
  /**
   * Converts a prose value written in `chapter` to display text. `narrative:validate`
   * passes `inlineLinkDisplayTextResolver(corpus)`, which shows `[[id]]` as the
   * target's name as of that chapter. The default shows it as the target ID.
   */
  displayText?: (value: string, chapter: string) => string;
}

function defaultDisplayText(value: string): string {
  return inlineLinksToPlainText(value, (target) => target);
}

function chapterWrites(
  chapter: NarrativeRecord,
  displayText: (value: string, chapter: string) => string,
): Map<string, Map<SentencePreservedField, ChapterWrite>> {
  const writes = new Map<string, Map<SentencePreservedField, ChapterWrite>>();
  const sources: Array<[string, string]> = [
    ["introducing", "id"],
    ["updates", "entity_id"],
  ];
  for (const [list, idKey] of sources) {
    const records = chapter[list];
    if (!Array.isArray(records)) continue;
    records.forEach((candidate: unknown, index) => {
      if (!candidate || typeof candidate !== "object") return;
      const record = candidate as NarrativeRecord;
      const id = record[idKey];
      if (typeof id !== "string") return;
      const backDated =
        typeof record.effective_date === "string" &&
        compareNarrativeDates(record.effective_date, String(chapter.date)) ===
          -1;
      const date =
        typeof record.effective_date === "string"
          ? record.effective_date
          : String(chapter.date);
      const marker =
        record.supersedes === true ? `/${list}/${index}/supersedes` : undefined;
      for (const field of sentencePreservedFields) {
        const value = record[field];
        if (typeof value !== "string") continue;
        const fields =
          writes.get(id) ?? new Map<SentencePreservedField, ChapterWrite>();
        const prior = fields.get(field);
        // Within one chapter, story-date order decides the visible write.
        if (!prior || (compareNarrativeDates(prior.date, date) ?? -1) <= 0) {
          fields.set(field, {
            value: displayText(value, String(chapter.chapter)),
            date,
            backDated,
            marker,
            pointer: `/${list}/${index}/${field}`,
          });
        }
        writes.set(id, fields);
      }
    });
  }
  return writes;
}

/**
 * The earlier-read write a new write must preserve, or `undefined` when there is
 * none to check against. `history` holds the field's earlier writes in reading
 * order.
 */
function comparedWrite(
  field: SentencePreservedField,
  write: ChapterWrite,
  history: readonly ReadWrite[],
): ReadWrite | undefined {
  if (sentencePreservationPolicy[field] === "always") return history.at(-1);
  if (!write.backDated) return undefined;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const earlier = history[index]!;
    // 0: the same date; null: overlapping ranges of different precision.
    if ((compareNarrativeDates(write.date, earlier.date) ?? 0) === 0)
      return earlier;
  }
  return undefined;
}

/**
 * Lists every sentence that a chapter's write drops from the earlier write it is
 * compared against (see `sentencePreservationPolicy`). Chapters may come in any
 * order; they are compared in reading order.
 */
export function findSentencePreservationViolations(
  chapters: readonly NarrativeRecord[],
  options: SentencePreservationOptions = {},
): SentencePreservationViolation[] {
  return checkSentencePreservation(chapters, options).violations;
}

/**
 * Lists every `supersedes: true` marker that excuses nothing: its update is not
 * back-dated, or its `state` or `current_state` keeps every earlier sentence.
 */
export function findUnusedSupersedesMarkers(
  chapters: readonly NarrativeRecord[],
  options: SentencePreservationOptions = {},
): UnusedSupersedesMarker[] {
  return checkSentencePreservation(chapters, options).unusedMarkers;
}

function checkSentencePreservation(
  chapters: readonly NarrativeRecord[],
  options: SentencePreservationOptions,
): {
  violations: SentencePreservationViolation[];
  unusedMarkers: UnusedSupersedesMarker[];
} {
  const displayText = options.displayText ?? defaultDisplayText;
  const ordered = [...chapters].sort((left, right) =>
    compareNarrativeChapters(String(left.chapter), String(right.chapter)),
  );
  const histories = new Map<string, ReadWrite[]>();
  const violations: SentencePreservationViolation[] = [];
  const markers = new Map<string, UnusedSupersedesMarker>();
  const usedMarkers = new Set<string>();
  for (const chapter of ordered) {
    const chapterReference = String(chapter.chapter);
    (Array.isArray(chapter.updates) ? chapter.updates : []).forEach(
      (candidate: unknown, index) => {
        const record = candidate as NarrativeRecord | null;
        if (record?.supersedes !== true) return;
        const pointer = `/updates/${index}/supersedes`;
        markers.set(`${chapterReference}\u0000${pointer}`, {
          entityId: String(record.entity_id),
          chapter: chapterReference,
          pointer,
        });
      },
    );
    const writes = chapterWrites(chapter, displayText);
    for (const [entityId, fields] of writes) {
      for (const [field, write] of fields) {
        const history = histories.get(`${entityId}\u0000${field}`) ?? [];
        const earlier = comparedWrite(field, write, history);
        if (!earlier) continue;
        const kept = new Set(splitSentences(write.value));
        const sentences = splitSentences(earlier.value);
        if (sentences.every((sentence) => kept.has(sentence))) continue;
        if (
          write.marker &&
          sentencePreservationPolicy[field] === "back-dated"
        ) {
          usedMarkers.add(`${chapterReference}\u0000${write.marker}`);
          continue;
        }
        sentences.forEach((sentence, sentenceIndex) => {
          if (kept.has(sentence)) return;
          violations.push({
            entityId,
            field,
            chapter: chapterReference,
            pointer: write.pointer,
            earlierChapter: earlier.chapter,
            sentenceIndex,
            sentenceCount: sentences.length,
            sentence,
          });
        });
      }
    }
    for (const [entityId, fields] of writes) {
      for (const [field, write] of fields) {
        const key = `${entityId}\u0000${field}`;
        const history = histories.get(key) ?? [];
        history.push({ ...write, chapter: chapterReference });
        histories.set(key, history);
      }
    }
  }
  const unusedMarkers = [...markers]
    .filter(([key]) => !usedMarkers.has(key))
    .map(([, marker]) => marker);
  return { violations, unusedMarkers };
}

/** The first `count` words of a sentence, with an ellipsis when cut. */
export function sentenceOpening(sentence: string, count = 8): string {
  const words = sentence.split(" ");
  return words.length <= count
    ? sentence
    : `${words.slice(0, count).join(" ")} …`;
}

export const sentencePreservationExceptionsPath =
  "data/narrative/sentence-preservation-exceptions.json";

export function formatSentencePreservationViolation(
  violation: SentencePreservationViolation,
): string {
  const remedy =
    sentencePreservationPolicy[violation.field] === "back-dated"
      ? 'or, if this back-dated update replaces that state, add "supersedes": true to it.'
      : `or add a reviewed exception with a reason to ${sentencePreservationExceptionsPath}.`;
  return `Chapter ${violation.chapter} ${violation.pointer}: ${violation.entityId}.${violation.field} drops sentence ${violation.sentenceIndex + 1} of ${violation.sentenceCount} of the earlier value from chapter ${violation.earlierChapter} ("${sentenceOpening(violation.sentence)}"). Keep that sentence verbatim, ${remedy}`;
}

export function formatUnusedSupersedesMarker(
  marker: UnusedSupersedesMarker,
): string {
  return `Chapter ${marker.chapter} ${marker.pointer}: ${marker.entityId} is marked "supersedes": true but replaces no earlier sentence. The marker is allowed only on a back-dated update (effective_date earlier than the chapter date) whose state or current_state drops a sentence of an earlier-read write of the same date; remove it.`;
}

export interface SentencePreservationException {
  chapter: string;
  entity_id: string;
  field: SentencePreservedField;
  reason: string;
}

const exceptionKeys = ["chapter", "entity_id", "field", "reason"];

/** Validates the exceptions document; throws on any malformed entry. */
export function parseSentencePreservationExceptions(
  document: unknown,
): SentencePreservationException[] {
  const fail = (message: string): never => {
    throw new Error(`${sentencePreservationExceptionsPath}: ${message}`);
  };
  if (!document || typeof document !== "object" || Array.isArray(document))
    fail("must be an object.");
  const record = document as NarrativeRecord;
  const extra = Object.keys(record).filter(
    (key) => key !== "about" && key !== "exceptions",
  );
  if (extra.length) fail(`unknown key(s) ${extra.join(", ")}.`);
  if (!Array.isArray(record.exceptions)) fail("exceptions must be an array.");
  const seen = new Set<string>();
  return (record.exceptions as unknown[]).map((candidate, index) => {
    const label = `exceptions[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      fail(`${label} must be an object.`);
    const entry = candidate as NarrativeRecord;
    const keys = Object.keys(entry).sort();
    if (keys.join() !== exceptionKeys.join())
      fail(`${label} must have exactly ${exceptionKeys.join(", ")}.`);
    for (const key of exceptionKeys) {
      if (typeof entry[key] !== "string" || !String(entry[key]).trim())
        fail(`${label}.${key} must be a non-empty string.`);
    }
    if (containsInlineLinkMarkup(String(entry.reason)))
      fail(
        `${label}.reason must not contain inline entity link markup or escapes (ADR-0029).`,
      );
    if (!/^[1-9][0-9]*\.[1-9][0-9]*$/.test(String(entry.chapter)))
      fail(`${label}.chapter must use book.chapter form.`);
    if (
      !(sentencePreservedFields as readonly string[]).includes(
        String(entry.field),
      )
    )
      fail(
        `${label}.field must be one of ${sentencePreservedFields.join(", ")}.`,
      );
    const key = exceptionKey(entry as unknown as SentencePreservationException);
    if (seen.has(key)) fail(`${label} duplicates an earlier entry.`);
    seen.add(key);
    return entry as unknown as SentencePreservationException;
  });
}

function exceptionKey(entry: {
  chapter: string;
  field: string;
  entity_id?: string;
  entityId?: string;
}): string {
  return `${entry.chapter}\u0000${entry.entity_id ?? entry.entityId}\u0000${entry.field}`;
}

/**
 * Splits violations into those no exception excuses and lists the exceptions that
 * excuse nothing. One exception covers one chapter's write to one field of one
 * entity, whichever of its sentences that write drops.
 */
export function applySentencePreservationExceptions(
  violations: readonly SentencePreservationViolation[],
  exceptions: readonly SentencePreservationException[],
): {
  unexcused: SentencePreservationViolation[];
  unused: SentencePreservationException[];
} {
  const keys = new Set(exceptions.map(exceptionKey));
  const used = new Set<string>();
  const unexcused = violations.filter((violation) => {
    const key = exceptionKey(violation);
    if (!keys.has(key)) return true;
    used.add(key);
    return false;
  });
  return {
    unexcused,
    unused: exceptions.filter((entry) => !used.has(exceptionKey(entry))),
  };
}

import {
  compareNarrativeChapters,
  compareNarrativeDates,
  type NarrativeRecord,
} from "./model";

/**
 * Merged-text sentence preservation (BOB-20261113-JRV53G).
 *
 * Under "Merge: (a) keep full merged texts" (ADR-0028), a chapter that writes a
 * prose field which already had a visible value keeps every sentence of that
 * value verbatim. The earlier value is the one chapter view shows just before the
 * chapter: the write of the latest-read earlier chapter (decision (c)). Only
 * chapter-authored writes (introductions and updates) are compared; zero-state
 * values are not.
 *
 * This is offline editorial tooling run by `narrative:validate`. Projection never
 * calls it, so the browser bundle and the reader-facing model are unchanged.
 */

/**
 * Which prose fields are checked, and when.
 *
 * - `always`: every write must keep the earlier value's sentences. This is the
 *   full-field update rule for `description` in docs/chapter-extraction.md
 *   §Descriptions.
 * - `when-not-later`: only a write whose story date is not later than the earlier
 *   write's (earlier, the same date, or an overlapping date of different
 *   precision) must keep them. That is the ADR-0028 case, where the write is read
 *   later but dated earlier and would otherwise hide what is known. A later-dated
 *   `state` or `current_state` write is the new latest condition, which
 *   §Descriptions says replaces the old one.
 */
export const sentencePreservationPolicy = {
  description: "always",
  visual_description: "always",
  state: "when-not-later",
  current_state: "when-not-later",
} as const satisfies Record<string, "always" | "when-not-later">;

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

interface ChapterWrite {
  value: string;
  date: string;
  pointer: string;
}

function chapterWrites(
  chapter: NarrativeRecord,
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
      const date =
        typeof record.effective_date === "string"
          ? record.effective_date
          : String(chapter.date);
      for (const field of sentencePreservedFields) {
        const value = record[field];
        if (typeof value !== "string") continue;
        const fields =
          writes.get(id) ?? new Map<SentencePreservedField, ChapterWrite>();
        const prior = fields.get(field);
        // Within one chapter, story-date order decides the visible write.
        if (!prior || (compareNarrativeDates(prior.date, date) ?? -1) <= 0) {
          fields.set(field, {
            value,
            date,
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
 * Lists every sentence that a chapter's write drops from the value visible in
 * chapter view just before that chapter. Chapters may come in any order; they
 * are compared in reading order.
 */
export function findSentencePreservationViolations(
  chapters: readonly NarrativeRecord[],
): SentencePreservationViolation[] {
  const ordered = [...chapters].sort((left, right) =>
    compareNarrativeChapters(String(left.chapter), String(right.chapter)),
  );
  const visible = new Map<string, ChapterWrite & { chapter: string }>();
  const violations: SentencePreservationViolation[] = [];
  for (const chapter of ordered) {
    const chapterReference = String(chapter.chapter);
    const writes = chapterWrites(chapter);
    for (const [entityId, fields] of writes) {
      for (const [field, write] of fields) {
        const earlier = visible.get(`${entityId}\u0000${field}`);
        if (!earlier) continue;
        const dateOrder = compareNarrativeDates(write.date, earlier.date);
        if (
          sentencePreservationPolicy[field] === "when-not-later" &&
          dateOrder !== null &&
          dateOrder > 0
        ) {
          continue;
        }
        const kept = new Set(splitSentences(write.value));
        const sentences = splitSentences(earlier.value);
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
        visible.set(`${entityId}\u0000${field}`, {
          ...write,
          chapter: chapterReference,
        });
      }
    }
  }
  return violations;
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
  return `Chapter ${violation.chapter} ${violation.pointer}: ${violation.entityId}.${violation.field} drops sentence ${violation.sentenceIndex + 1} of ${violation.sentenceCount} of the earlier value from chapter ${violation.earlierChapter} ("${sentenceOpening(violation.sentence)}"). Keep that sentence verbatim, or add a reviewed exception with a reason to ${sentencePreservationExceptionsPath}.`;
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

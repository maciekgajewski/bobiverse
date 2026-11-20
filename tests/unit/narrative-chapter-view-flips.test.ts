import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  preparedNarrativeChapters,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

// Canonical non-linear pairs: a later-read chapter dated earlier in story
// time than the chapter read before it. Under the two ceilings (design
// principles §2.5, ADR-0031), state takes the latest-dated write known at the
// soft ceiling, so the later-read write is current only while the earlier-read
// one is still in the future; description follows Read through only, so the
// later-read write wins at every soft ceiling. IDs, fields and chapter refs
// only; values are compared with the canonical chapter writes, never written
// here.

interface StateFlip {
  subject: string;
  field: string;
  laterRead: string;
  earlierRead: string;
  // Chapter views whose soft ceiling is before the earlier-read write's date.
  laterReadCurrent: string[];
  // Chapter views whose soft ceiling has reached it.
  laterDatedCurrent: string[];
}

const stateFlips: StateFlip[] = [
  {
    subject: "character:bill",
    field: "current_state",
    laterRead: "1.42",
    earlierRead: "1.41",
    laterReadCurrent: ["1.42"],
    laterDatedCurrent: ["1.43", "1.44"],
  },
];

interface DescriptionFlip {
  subject: string;
  field: string;
  laterRead: string;
  earlierRead: string;
}

const descriptionFlips: DescriptionFlip[] = [
  {
    subject: "technology:vr",
    field: "description",
    laterRead: "1.42",
    earlierRead: "1.40",
  },
];

function corpus() {
  if (!narrativeCorpus) throw new Error("Canonical corpus failed to prepare.");
  return narrativeCorpus;
}

function chapter(id: string): NarrativeRecord {
  const found = preparedNarrativeChapters(corpus()).find(
    (candidate) => candidate.chapter === id,
  );
  if (!found) throw new Error(`Missing canonical chapter ${id}.`);
  return found;
}

function written(chapterId: string, subject: string, field: string): unknown {
  const source = chapter(chapterId);
  const write = [
    ...((source.introducing as NarrativeRecord[] | undefined) ?? []),
    ...((source.updates as NarrativeRecord[] | undefined) ?? []),
  ].find((record) => (record.id ?? record.entity_id) === subject);
  if (!write || !Object.hasOwn(write, field))
    throw new Error(`Chapter ${chapterId} does not write ${subject} ${field}.`);
  return write[field];
}

function projected(
  knowledge: string,
  date: string | null,
  subject: string,
  field: string,
): unknown {
  return generateNarrativeWorld(corpus(), knowledge, date).entities.find(
    (entity) => entity.id === subject,
  )?.[field];
}

describe("canonical non-linear pairs under the two ceilings", () => {
  it.each(stateFlips.map((flip) => [`${flip.subject} ${flip.field}`, flip]))(
    "state %s follows the soft ceiling",
    (
      _label,
      {
        subject,
        field,
        laterRead,
        earlierRead,
        laterReadCurrent,
        laterDatedCurrent,
      },
    ) => {
      const later = written(laterRead, subject, field);
      const earlier = written(earlierRead, subject, field);
      expect(later).not.toEqual(earlier);
      const laterDate = chapter(laterRead).date as string;
      const earlierDate = chapter(earlierRead).date as string;
      // The later-read chapter is earlier in story time.
      expect(laterDate < earlierDate).toBe(true);
      for (const knowledge of laterReadCurrent) {
        expect(projected(knowledge, null, subject, field), knowledge).toEqual(
          later,
        );
      }
      for (const knowledge of laterDatedCurrent) {
        expect(projected(knowledge, null, subject, field), knowledge).toEqual(
          earlier,
        );
      }
      expect(projected(laterRead, earlierDate, subject, field)).toEqual(
        earlier,
      );
      expect(projected(laterRead, laterDate, subject, field)).toEqual(later);
    },
    // Each canonical projection takes about a second.
    60_000,
  );

  it.each(
    descriptionFlips.map((flip) => [`${flip.subject} ${flip.field}`, flip]),
  )(
    "description %s follows Read through only",
    (_label, { subject, field, laterRead, earlierRead }) => {
      const later = written(laterRead, subject, field);
      const earlier = written(earlierRead, subject, field);
      expect(later).not.toEqual(earlier);
      expect(projected(earlierRead, null, subject, field)).toEqual(earlier);
      expect(projected(laterRead, null, subject, field)).toEqual(later);
      for (const date of [
        chapter(earlierRead).date as string,
        chapter(laterRead).date as string,
      ]) {
        expect(projected(laterRead, date, subject, field), date).toEqual(later);
      }
    },
    60_000,
  );
});

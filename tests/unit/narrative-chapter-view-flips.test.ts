import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld,
  preparedNarrativeChapters,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";

// Canonical pairs whose chapter-view winner flipped under ADR-0028 decision (c):
// a later-read chapter with an earlier story date now wins in chapter view, and
// Date view keeps story-date order. IDs, fields and chapter refs only; values
// are compared with the canonical chapter writes, never written here. See
// docs/tasks/BOB-20261113-WZGAM4-chapter-view-reading-order.md.

interface Flip {
  subject: string;
  field: string;
  // Read points where chapter view shows the later-read write.
  readPoints: string[];
  laterRead: string;
  earlierRead: string;
}

const flips: Flip[] = [
  {
    subject: "character:bill",
    field: "current_state",
    readPoints: ["1.42", "1.43", "1.44"],
    laterRead: "1.42",
    earlierRead: "1.41",
  },
  {
    subject: "technology:vr",
    field: "description",
    readPoints: ["1.42"],
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

describe("canonical chapter-view flips under ADR-0028 decision (c)", () => {
  it.each(flips.map((flip) => [`${flip.subject} ${flip.field}`, flip]))(
    "%s",
    (_label, { subject, field, readPoints, laterRead, earlierRead }) => {
      const later = written(laterRead, subject, field);
      const earlier = written(earlierRead, subject, field);
      expect(later).not.toEqual(earlier);
      const laterDate = chapter(laterRead).date as string;
      const earlierDate = chapter(earlierRead).date as string;
      // The later-read chapter is earlier in story time.
      expect(laterDate < earlierDate).toBe(true);
      for (const knowledge of readPoints) {
        expect(projected(knowledge, null, subject, field), knowledge).toEqual(
          later,
        );
      }
      const knowledge = readPoints[0]!;
      expect(projected(knowledge, earlierDate, subject, field)).toEqual(
        earlier,
      );
      expect(projected(knowledge, laterDate, subject, field)).toEqual(later);
    },
    // Each canonical projection takes about a second.
    60_000,
  );
});

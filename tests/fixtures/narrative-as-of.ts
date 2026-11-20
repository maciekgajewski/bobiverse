import {
  prepareNarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "./narrative";

// Synthetic, fictional records only, for cards "as of" the soft ceiling and
// chapter-view recency in story time (BOB-20261120-73F83F).

export const asOfIds = {
  human: "species:fixture-human",
  alex: "character:fixture-alex",
  bea: "character:fixture-bea",
  cy: "character:fixture-cy",
  kai: "character:fixture-kai",
  undated: "event:fixture-undated",
} as const;

const { human, alex, bea, cy, kai, undated } = asOfIds;

function chapter(
  id: string,
  date: string,
  extra: NarrativeRecord = {},
): NarrativeRecord {
  return {
    chapter: id,
    title: `Fixture chapter ${id}`,
    summary: "A fictional chapter for as-of card tests.",
    date,
    location_id: "location:earth",
    appearances: [{ character_id: alex, role: "lead" }],
    ...extra,
  };
}

function corpus() {
  const base = createNarrativeFixtureCorpus();
  base.chapters = [
    chapter("1.1", "2160-01", {
      introducing: [
        { id: human, name: "Fixture human" },
        {
          id: alex,
          name: "Fixture Alex",
          species_id: human,
          current_state: "alex 2160",
        },
        { id: bea, name: "Fixture Bea", species_id: human },
        { id: cy, name: "Fixture Cy", species_id: human },
      ],
    }),
    chapter("1.2", "2170-06", {
      appearances: [
        { character_id: alex, role: "lead" },
        { character_id: cy, role: "other" },
      ],
    }),
    // A non-linear chapter: read after 1.2, set earlier in story time.
    chapter("1.3", "2165-03", {
      introducing: [{ id: undated, name: "Fixture undated event" }],
      appearances: [
        { character_id: alex, role: "lead" },
        { character_id: bea, role: "other" },
      ],
    }),
    chapter("1.4", "2175", {
      introducing: [
        {
          id: kai,
          name: "Fixture Kai",
          species_id: human,
          description: "A fictional latecomer.",
          current_state: "kai 2175",
        },
      ],
    }),
  ];
  return base;
}

export const asOfCorpus = prepareNarrativeCorpus(corpus());

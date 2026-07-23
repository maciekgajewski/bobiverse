import baseline from "../../data/narrative/baseline/solar-system.json";
import type { NarrativeCorpus } from "../../src/narrative/model";

/** Deliberately fictional source records used only to test the chapter pipeline. */
export function createNarrativeFixtureCorpus(): NarrativeCorpus {
  return {
    assets: { assets: [] },
    baseline: structuredClone(baseline),
    books: { books: { "1": { title: "Fixture volume" } } },
    chapters: [
      {
        chapter: "1.1",
        title: "Fixture introduction",
        summary:
          "A fictional person is introduced for narrative-validation tests.",
        date: "2200.0",
        location_id: "location:earth",
        introducing: [
          { id: "species:fixture-human", name: "Fixture human" },
          {
            id: "character:fixture-alex",
            name: "Fixture Alex",
            species_id: "species:fixture-human",
            current_state: "initial state",
          },
        ],
        appearances: [{ character_id: "character:fixture-alex", role: "lead" }],
      },
      {
        chapter: "1.2",
        title: "Fixture future",
        summary: "A fictional later state establishes a story-time boundary.",
        date: "2200.2",
        location_id: "location:earth",
        appearances: [{ character_id: "character:fixture-alex", role: "lead" }],
        updates: [
          {
            entity_id: "character:fixture-alex",
            current_state: "later state",
          },
        ],
      },
      {
        chapter: "1.3",
        title: "Fixture middle",
        summary:
          "A fictional chapter demonstrates non-chronological story time.",
        date: "2200.1",
        location_id: "location:earth",
        appearances: [{ character_id: "character:fixture-alex", role: "lead" }],
        updates: [
          {
            entity_id: "character:fixture-alex",
            current_state: "middle state",
          },
        ],
      },
    ],
    knownAstronomyObjectIds: ["sol"],
  };
}

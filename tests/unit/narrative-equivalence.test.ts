import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  generateNarrativeWorld as generateWorld,
  meaningfulNarrativeDateOptions,
} from "../../src/narrative/model";
import {
  narrativeCorpus,
  narrativeRuntimePreparationCount,
} from "../../src/narrative/runtime";
import { plainProseWorld } from "../fixtures/plain-prose";

const comparisonChapters = ["1.1", "1.10", "1.11"] as const;

function publicComparisonMatrix() {
  if (!narrativeCorpus)
    throw new Error("Canonical narrative preparation failed.");
  const corpus = narrativeCorpus;
  // Snapshot display text, not inline entity link markup (ADR-0029).
  const generateNarrativeWorld = (...args: Parameters<typeof generateWorld>) =>
    plainProseWorld(corpus, generateWorld(...args));
  const meaningfulDates = meaningfulNarrativeDateOptions(corpus, "1.11");
  return {
    meaningfulDates,
    worlds: {
      zeroState: generateNarrativeWorld(corpus),
      chapter: Object.fromEntries(
        comparisonChapters.map((chapter) => [
          chapter,
          generateNarrativeWorld(corpus, chapter),
        ]),
      ),
      date: Object.fromEntries(
        meaningfulDates.map(({ date }) => [
          date,
          generateNarrativeWorld(corpus, "1.11", date),
        ]),
      ),
    },
  };
}

describe("canonical narrative equivalence", () => {
  it("keeps the public zero-state, chapter, date-option, and date-mode matrix stable", () => {
    const matrix = publicComparisonMatrix();
    const capturePath = process.env.BOB_029_CAPTURE;
    if (capturePath) {
      writeFileSync(capturePath, `${JSON.stringify(matrix, null, 2)}\n`);
    }
    expect(matrix).toMatchSnapshot();
    expect(narrativeRuntimePreparationCount()).toBe(1);
  });
});

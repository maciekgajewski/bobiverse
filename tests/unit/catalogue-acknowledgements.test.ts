import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acknowledgementsInData,
  catalogueAcknowledgements,
} from "../../src/domain/catalogue-acknowledgements";

describe("catalogueAcknowledgements", () => {
  it("returns every distinct acknowledgement in the nearby-systems JSON", () => {
    const raw = JSON.parse(
      readFileSync(resolve("src/data/nearby-systems.json"), "utf8"),
    ) as unknown;
    const fromFile = acknowledgementsInData(raw);
    expect(fromFile.length).toBeGreaterThan(0);
    const uniqueFromFile = [...new Set(fromFile.map((text) => text.trim()))];
    expect(catalogueAcknowledgements()).toEqual(uniqueFromFile);
    expect(
      catalogueAcknowledgements().some((text) => text.includes("ESA")),
    ).toBe(true);
    expect(
      catalogueAcknowledgements().some((text) => text.includes("DPAC")),
    ).toBe(true);
  });

  it("deduplicates identical acknowledgements and skips blanks", () => {
    expect(
      catalogueAcknowledgements({
        first: { acknowledgement: "Same text." },
        second: { acknowledgement: "Same text." },
        third: { acknowledgement: "  Other text.  " },
        fourth: { acknowledgement: "   " },
      }),
    ).toEqual(["Same text.", "Other text."]);
  });

  it("returns an empty list when sources are missing", () => {
    expect(catalogueAcknowledgements(null)).toEqual([]);
    expect(catalogueAcknowledgements(undefined)).toEqual([]);
  });
});

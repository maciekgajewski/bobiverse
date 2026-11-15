import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acknowledgementExtension,
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
    const credits = catalogueAcknowledgements();
    for (const rawText of fromFile) {
      const text = rawText.trim();
      const represented = credits.some((item) => {
        if (item === text) return true;
        const rest = acknowledgementExtension(item, text);
        return rest !== null && (rest === "" || credits.includes(rest));
      });
      expect(represented).toBe(true);
    }
    expect(credits.filter((text) => text.includes("VizieR"))).toHaveLength(1);
    expect(
      credits.some(
        (text) => text.includes("IV/27A") && text.includes("Kostjuk"),
      ),
    ).toBe(true);
    expect(credits.some((text) => text.includes("ESA"))).toBe(true);
    expect(credits.some((text) => text.includes("DPAC"))).toBe(true);
  });

  it("keeps a generic VizieR line once and credits the Kostjuk extension", () => {
    const generic =
      "This research has made use of the VizieR catalogue access tool, CDS, Strasbourg, France (DOI: 10.26093/cds/vizier).";
    const extended =
      "This research has made use of the VizieR catalogue access tool, CDS, Strasbourg, France (DOI: 10.26093/cds/vizier), and the IV/27A HD-DM-GC-HR-HIP-Bayer-Flamsteed Cross Index (Kostjuk, 2002).";
    expect(
      catalogueAcknowledgements({
        generic: { acknowledgement: generic },
        extended: { acknowledgement: extended },
      }),
    ).toEqual([
      generic,
      "The IV/27A HD-DM-GC-HR-HIP-Bayer-Flamsteed Cross Index (Kostjuk, 2002).",
    ]);
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

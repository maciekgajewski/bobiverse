import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GALACTIC_STARFIELD_ASSET,
  GALACTIC_STARFIELD_SOURCE_URL,
  GALACTIC_STARFIELD_UI_CREDIT,
} from "../../src/domain/galactic-starfield";

const root = resolve(process.cwd());
const sourcePath = resolve(
  root,
  "source-assets/galactic-starfield/milkyway_2020_4k_gal.exr",
);
const outputPath = resolve(root, "src/assets/galactic-starfield.avif");
const provenancePath = resolve(
  root,
  "docs/data/galactic-starfield-backdrop.md",
);

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Galactic starfield local-asset provenance", () => {
  it("retains the exact source and exactly one derived browser texture", () => {
    expect(existsSync(sourcePath)).toBe(true);
    expect(existsSync(outputPath)).toBe(true);
    expect(sha256(sourcePath)).toBe(
      "fad63b36aa632c691d521cd9d8b828de9d29b4c2784276eec44e54c6cb159a49",
    );
    expect(sha256(outputPath)).toBe(
      "58faaa20b673ff0fb9fbe50c21b2d41a207f0261576c795247a729ad0cb7cbfc",
    );
    expect(GALACTIC_STARFIELD_ASSET).toBe("milkyway_2020_4k_gal.exr");
  });

  it("records the required source, conversion, credit, acknowledgement, and use terms", () => {
    const provenance = readFileSync(provenancePath, "utf8");
    expect(provenance).toContain(GALACTIC_STARFIELD_SOURCE_URL);
    expect(provenance).toContain(GALACTIC_STARFIELD_UI_CREDIT);
    expect(provenance).toContain("ffmpeg version 8.0.1-3ubuntu2");
    expect(provenance).toContain(
      "This work has made use of data from the European",
    );
    expect(provenance).toContain("NASA's [Images and Media Usage Guidelines]");
    expect(provenance).toContain("do not endorse this");
  });
});

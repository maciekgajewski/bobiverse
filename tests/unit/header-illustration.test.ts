import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ABOUT_IMAGE_ALT,
  EARTH_IMAGE_ALT,
  JEEVES_IMAGE_ALT,
  MOON_IMAGE_ALT,
} from "../../src/about-image";
import {
  EARTH_ENTITY_ID,
  GUPPI_ENTITY_ID,
  JEEVES_ENTITY_ID,
  MOON_ENTITY_ID,
  PRESENTATION_ILLUSTRATIONS,
  resolveHeaderIllustration,
} from "../../src/narrative/header-illustration";
import {
  generateNarrativeWorld,
  type NarrativeWorld,
} from "../../src/narrative/model";
import { narrativeCorpus } from "../../src/narrative/runtime";
import { resolveSpeciesPresentations } from "../../src/narrative/species-presentation";

const CREDIT =
  "Admiral Ackbar illustration by Michael Sutfin, from The New Essential Guide to Characters. Star Wars © Lucasfilm Ltd. Used under fair use.";

function fixtureWorld(entities: NarrativeWorld["entities"]): NarrativeWorld {
  return {
    entities,
    activity: [],
    view: { chapter: "1.1", display_date: "2200" },
  };
}

describe("inspector header illustrations", () => {
  it("registers GUPPI's crop of the About picture with the same credit", () => {
    const guppi = PRESENTATION_ILLUSTRATIONS.get(GUPPI_ENTITY_ID)!;
    expect(GUPPI_ENTITY_ID).toBe("technology:guppi-interface");
    expect(guppi.src).toBe("/assets/guppi-ackbar-head.webp");
    expect(guppi.alt).toBe(CREDIT);
    expect(guppi.alt).toBe(ABOUT_IMAGE_ALT);
    const asset = readFileSync(resolve("public", guppi.src.slice(1)));
    expect(asset.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(asset.subarray(8, 12).toString("latin1")).toBe("WEBP");
    expect(asset.byteLength).toBeLessThan(20_000);
    const credits = readFileSync(resolve("public/assets/CREDITS.md"), "utf8");
    const section = credits.split("## `guppi-ackbar-head.webp`")[1]!;
    expect(section.replace(/\s+/g, " ")).toContain(CREDIT);
    expect(section).toContain(
      "https://starwars.fandom.com/wiki/File:Ackbar-NEGTC.png",
    );
    expect(section).toMatch(/cropped/i);
    // Only reader-facing narrative IDs are keyed, and every file exists.
    for (const [id, illustration] of PRESENTATION_ILLUSTRATIONS) {
      expect(id).toMatch(/^[a-z]+:[a-z0-9-]+$/);
      expect(existsSync(resolve("public", illustration.src.slice(1)))).toBe(
        true,
      );
    }
  });

  it("shows GUPPI's illustration only once GUPPI is reader-visible", () => {
    const corpus = narrativeCorpus!;
    for (const chapter of [null, "1.1"]) {
      const world = generateNarrativeWorld(corpus, chapter);
      expect(world.entities.some((e) => e.id === GUPPI_ENTITY_ID)).toBe(false);
      expect(
        resolveHeaderIllustration(GUPPI_ENTITY_ID, world, corpus.assets),
      ).toBeNull();
    }
    const known = generateNarrativeWorld(corpus, "1.2");
    expect(
      resolveHeaderIllustration(GUPPI_ENTITY_ID, known, corpus.assets),
    ).toEqual({
      kind: "image",
      origin: "presentation",
      src: "/assets/guppi-ackbar-head.webp",
      alt: CREDIT,
      width: 66,
      height: 66,
    });
  });

  it("shows Jeeves's head, credited, only once Jeeves is reader-visible", () => {
    const jeeves = PRESENTATION_ILLUSTRATIONS.get(JEEVES_ENTITY_ID)!;
    expect(JEEVES_ENTITY_ID).toBe("technology:jeeves");
    expect(jeeves).toEqual({
      src: "/assets/jeeves-head.webp",
      alt: JEEVES_IMAGE_ALT,
      width: 66,
      height: 66,
    });
    const credits = readFileSync(resolve("public/assets/CREDITS.md"), "utf8");
    expect(credits.split("## `jeeves-head.webp`")[1]).toMatch(
      /Same credit as `jeeves\.webp`/,
    );
    const corpus = narrativeCorpus!;
    // Jeeves is introduced in Chapter 1.13.
    for (const chapter of [null, "1.12"]) {
      const world = generateNarrativeWorld(corpus, chapter);
      expect(
        resolveHeaderIllustration(JEEVES_ENTITY_ID, world, corpus.assets),
      ).toBeNull();
    }
    expect(
      resolveHeaderIllustration(
        JEEVES_ENTITY_ID,
        generateNarrativeWorld(corpus, "1.13"),
        corpus.assets,
      ),
    ).toEqual({ kind: "image", origin: "presentation", ...jeeves });
  });

  it("shows Earth's and the Moon's credited photographs from the zero state", () => {
    const credits = readFileSync(resolve("public/assets/CREDITS.md"), "utf8");
    const corpus = narrativeCorpus!;
    for (const [id, file, alt, source] of [
      [
        EARTH_ENTITY_ID,
        "earth-head.webp",
        EARTH_IMAGE_ALT,
        "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg",
      ],
      [
        MOON_ENTITY_ID,
        "moon-head.webp",
        MOON_IMAGE_ALT,
        "https://commons.wikimedia.org/wiki/File:Moon_nearside_LRO_color_mosaic.png",
      ],
    ] as const) {
      const illustration = PRESENTATION_ILLUSTRATIONS.get(id)!;
      expect(illustration).toEqual({
        src: `/assets/${file}`,
        alt,
        width: 66,
        height: 66,
      });
      const asset = readFileSync(resolve("public/assets", file));
      expect(asset.subarray(0, 4).toString("latin1")).toBe("RIFF");
      expect(asset.subarray(8, 12).toString("latin1")).toBe("WEBP");
      // Lossless (VP8L), like the GUPPI and Jeeves heads.
      expect(asset.subarray(12, 16).toString("latin1")).toBe("VP8L");
      expect(asset.byteLength).toBeLessThan(20_000);
      const bits = asset.readUInt32LE(21);
      expect([(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]).toEqual([
        66, 66,
      ]);
      const section = credits.split(`## \`${file}\``)[1]!.split("\n## ")[0]!;
      expect(section.replace(/\s+/g, " ")).toContain(alt);
      expect(section).toContain(source);
      expect(section).toMatch(/Public domain/);
      // Known in the pre-book zero state and in every chapter view.
      for (const chapter of [null, "1.1", "1.20"]) {
        expect(
          resolveHeaderIllustration(
            id,
            generateNarrativeWorld(corpus, chapter),
            corpus.assets,
          ),
        ).toEqual({ kind: "image", origin: "presentation", ...illustration });
      }
    }
  });

  it("uses each projected species' presentation icon", () => {
    const corpus = narrativeCorpus!;
    const world = generateNarrativeWorld(corpus, "1.2");
    const presentations = resolveSpeciesPresentations(corpus, world);
    const species = world.entities.filter((e) => e.entity_type === "species");
    expect(species.length).toBeGreaterThan(0);
    for (const entity of species) {
      const presentation = presentations.get(entity.id)!;
      expect(
        resolveHeaderIllustration(
          entity.id,
          world,
          corpus.assets,
          presentation,
        ),
      ).toEqual({
        kind: "species-icon",
        iconPath: presentation.iconPath,
        colour: presentation.colour,
        label: `${String(entity.name)} species icon`,
      });
    }
  });

  it("prefers an entity's own illustration asset and ignores other roles", () => {
    const assets = {
      assets: [
        {
          id: "asset:fixture-portrait",
          path: "assets/fixture-portrait.webp",
          role: "illustration",
        },
        {
          id: "asset:fixture-icon",
          path: "assets/fixture-icon.svg",
          role: "species_icon",
        },
      ],
    };
    const world = fixtureWorld([
      {
        id: "character:portrait",
        entity_type: "character",
        name: "Portrait",
        picture_id: "asset:fixture-portrait",
      },
      {
        id: "character:wrong-role",
        entity_type: "character",
        name: "Wrong role",
        picture_id: "asset:fixture-icon",
      },
      {
        id: "event:plain",
        entity_type: "event",
        name: "Plain",
      },
      { id: "location:plain", entity_type: "location", name: "Plain place" },
    ]);
    expect(
      resolveHeaderIllustration("character:portrait", world, assets),
    ).toEqual({
      kind: "image",
      origin: "picture",
      src: "/assets/fixture-portrait.webp",
      alt: "Portrait",
    });
    expect(
      resolveHeaderIllustration("character:wrong-role", world, assets),
    ).toBeNull();
    expect(resolveHeaderIllustration("event:plain", world, assets)).toBeNull();
    expect(
      resolveHeaderIllustration("location:plain", world, assets),
    ).toBeNull();
    expect(
      resolveHeaderIllustration("character:absent", world, assets),
    ).toBeNull();
  });
});

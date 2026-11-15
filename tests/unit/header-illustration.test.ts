import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_IMAGE_ALT } from "../../src/about-image";
import {
  GUPPI_ENTITY_ID,
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

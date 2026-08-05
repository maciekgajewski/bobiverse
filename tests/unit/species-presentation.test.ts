import { describe, expect, it } from "vitest";
import canonicalPresentation from "../../data/presentation/species.json";
import { resolveAssetForRole } from "../../src/narrative/assets";
import {
  generateNarrativeWorld,
  prepareNarrativeCorpus,
  validateNarrativeCorpus,
  narrativeSchemaErrors,
} from "../../src/narrative/model";
import { resolveSpeciesPresentations } from "../../src/narrative/species-presentation";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

describe("species presentation registry", () => {
  it("pins the accepted six-style palette and explicit generic default", () => {
    expect(canonicalPresentation.default_style_id).toBe(
      "species-style:unknown",
    );
    expect(
      Object.fromEntries(
        canonicalPresentation.styles.map(({ label, colour }) => [
          label,
          colour,
        ]),
      ),
    ).toEqual({
      Human: "#4DD9FF",
      Deltan: "#B69CFF",
      Pav: "#FFB347",
      "The Others": "#FF6274",
      Quinlan: "#58E0C2",
      "Other / Unknown": "#98A8B8",
    });
    expect(canonicalPresentation.assignments).toEqual([
      {
        species_id: "species:human",
        style_id: "species-style:human",
      },
      {
        species_id: "species:delta-eridani-natives",
        style_id: "species-style:deltan",
      },
    ]);
  });

  it("resolves assignments and the configured fallback only for projected species", () => {
    const source = createNarrativeFixtureCorpus();
    source.speciesPresentation.assignments = [
      {
        species_id: "species:fixture-human",
        style_id: "species-style:fixture",
      },
    ];
    source.chapters[1]!.introducing = [
      { id: "species:fixture-later", name: "Fixture later species" },
    ];
    const corpus = prepareNarrativeCorpus(source);

    const first = resolveSpeciesPresentations(
      corpus,
      generateNarrativeWorld(corpus, "1.1"),
    );
    expect(first.get("species:fixture-human")).toEqual({
      styleId: "species-style:fixture",
      iconPath: "/assets/species-icons/fixture.svg",
      colour: "#98A8B8",
      displayName: "Fixture human",
    });
    expect(first.has("species:fixture-later")).toBe(false);

    const second = resolveSpeciesPresentations(
      corpus,
      generateNarrativeWorld(corpus, "1.2"),
    );
    expect(second.get("species:fixture-later")?.styleId).toBe(
      "species-style:fixture",
    );
  });

  it("rejects duplicate, unknown, missing-default, and wrong-role presentation data", () => {
    const duplicate = createNarrativeFixtureCorpus();
    duplicate.speciesPresentation.styles = [
      ...(duplicate.speciesPresentation.styles as unknown[]),
      structuredClone((duplicate.speciesPresentation.styles as unknown[])[0]),
    ];
    expect(() => validateNarrativeCorpus(duplicate)).toThrow("duplicate style");

    const unknownSpecies = createNarrativeFixtureCorpus();
    unknownSpecies.speciesPresentation.assignments = [
      {
        species_id: "species:not-canonical",
        style_id: "species-style:fixture",
      },
    ];
    expect(() => validateNarrativeCorpus(unknownSpecies)).toThrow(
      "unknown species",
    );

    const missingDefault = createNarrativeFixtureCorpus();
    missingDefault.speciesPresentation.default_style_id =
      "species-style:missing";
    expect(() => validateNarrativeCorpus(missingDefault)).toThrow(
      "default style does not exist",
    );

    for (const role of ["illustration", "system_marker_icon"] as const) {
      const wrongRole = createNarrativeFixtureCorpus();
      (wrongRole.assets.assets as Array<Record<string, unknown>>)[0]!.role =
        role;
      expect(() => validateNarrativeCorpus(wrongRole)).toThrow(
        "requires asset role species_icon",
      );
    }
  });

  it("rejects invalid colours, unsafe asset paths, duplicate assignments, and missing icon assets", () => {
    const invalidColour = createNarrativeFixtureCorpus().speciesPresentation;
    (invalidColour.styles as Array<Record<string, unknown>>)[0]!.colour =
      "rgb(152, 168, 184)";
    expect(
      narrativeSchemaErrors("species_presentation_source", invalidColour),
    ).not.toEqual([]);

    expect(
      narrativeSchemaErrors("assets_source", {
        assets: [
          {
            id: "asset:unsafe",
            path: "assets/../unsafe.svg",
            role: "species_icon",
            source: "Fixture.",
          },
        ],
      }),
    ).not.toEqual([]);

    const duplicateAssignment = createNarrativeFixtureCorpus();
    duplicateAssignment.speciesPresentation.assignments = [
      {
        species_id: "species:fixture-human",
        style_id: "species-style:fixture",
      },
      {
        species_id: "species:fixture-human",
        style_id: "species-style:fixture",
      },
    ];
    expect(() => validateNarrativeCorpus(duplicateAssignment)).toThrow(
      "duplicate assignment",
    );

    const missingAsset = createNarrativeFixtureCorpus();
    (
      missingAsset.speciesPresentation.styles as Array<Record<string, unknown>>
    )[0]!.icon_asset_id = "asset:missing";
    expect(() => validateNarrativeCorpus(missingAsset)).toThrow(
      "references unavailable asset",
    );
  });

  it("rejects species and system-marker icons from picture_id", () => {
    for (const role of ["species_icon", "system_marker_icon"] as const) {
      const source = createNarrativeFixtureCorpus();
      const asset = (
        source.assets.assets as Array<Record<string, unknown>>
      )[0]!;
      asset.role = role;
      source.chapters[0]!.picture_id = asset.id;
      if (role === "system_marker_icon") {
        (
          source.speciesPresentation.styles as Array<Record<string, unknown>>
        )[0]!.icon_asset_id = "asset:species-separate";
        (source.assets.assets as Array<Record<string, unknown>>).push({
          id: "asset:species-separate",
          path: "assets/species-icons/separate.svg",
          role: "species_icon",
          source: "Fixture.",
        });
      }
      expect(() => validateNarrativeCorpus(source)).toThrow(
        "requires asset role illustration",
      );
    }
  });

  it("rejects a wrong-role zero-state entity picture", () => {
    const source = createNarrativeFixtureCorpus();
    const entities = source.zeroState.entities as Array<
      Record<string, unknown>
    >;
    const humanIndex = entities.findIndex(
      (entity) => entity.id === "species:human",
    );
    const human = entities[humanIndex]!;
    human.picture_id = "asset:species-fixture";
    expect(() => validateNarrativeCorpus(source)).toThrow(
      `Zero state /entities/${humanIndex}/picture_id`,
    );
  });

  it("enforces consumer roles in both directions", () => {
    const assets = {
      assets: [
        { id: "asset:picture", role: "illustration" },
        { id: "asset:species", role: "species_icon" },
        { id: "asset:marker", role: "system_marker_icon" },
      ],
    };
    expect(
      resolveAssetForRole(assets, "asset:picture", "illustration", "picture"),
    ).toHaveProperty("id", "asset:picture");
    expect(
      resolveAssetForRole(
        assets,
        "asset:species",
        "species_icon",
        "species style",
      ),
    ).toHaveProperty("id", "asset:species");
    expect(
      resolveAssetForRole(
        assets,
        "asset:marker",
        "system_marker_icon",
        "system marker",
      ),
    ).toHaveProperty("id", "asset:marker");
    expect(() =>
      resolveAssetForRole(assets, "asset:species", "illustration", "picture"),
    ).toThrow("requires asset role illustration");
    expect(() =>
      resolveAssetForRole(
        assets,
        "asset:marker",
        "species_icon",
        "species style",
      ),
    ).toThrow("requires asset role species_icon");
    expect(() =>
      resolveAssetForRole(
        assets,
        "asset:picture",
        "system_marker_icon",
        "system marker",
      ),
    ).toThrow("requires asset role system_marker_icon");
  });
});

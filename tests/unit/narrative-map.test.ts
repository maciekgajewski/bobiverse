import { describe, expect, it } from "vitest";
import type { StellarSystem } from "../../src/domain/types";
import {
  focusSystemIdForSelection,
  isSelectionEligibleForMap,
  projectNarrativeMap,
} from "../../src/narrative/map";
import type { NarrativeWorld } from "../../src/narrative/model";

function system(id: string, xg: number): StellarSystem {
  return {
    id,
    name: id,
    alternates: [],
    position_pc: { xg, yg: 0, zg: 0 },
    render_position: { x: xg, y: 0, z: 0 },
    distance_from_sol_pc: Math.abs(xg),
    distance_uncertainty_pc: null,
    components: [],
    provenance: {
      catalogues: [],
      source_object_ids: [],
      adopted_component_id: "test",
      review_version: "test",
      wds_designations: [],
    },
  };
}

const world: NarrativeWorld = {
  entities: [
    {
      id: "location:system",
      entity_type: "location",
      name: "Known system",
      kind: "star_system",
      astronomy_object_id: "known",
    },
    {
      id: "location:planet",
      entity_type: "location",
      name: "Known planet",
      kind: "planet",
      parent_location_id: "location:system",
    },
    {
      id: "character:known",
      entity_type: "character",
      name: "Known character",
      last_known_location: {
        location_id: "location:planet",
        source_chapter: "1.1",
        effective_date: "2200.0",
      },
    },
    {
      id: "event:unmapped",
      entity_type: "event",
      name: "Unmapped event",
    },
  ],
  activity: [
    {
      entity_id: "location:system",
      source_chapter: "1.1",
      effective_date: "2200.0",
      reasons: ["mapped_system_ancestry"],
    },
  ],
  view: { chapter: "1.1", display_date: null },
};

describe("narrative map projection", () => {
  it("uses the one radius union around reader-safe mapped anchors", () => {
    const projection = projectNarrativeMap(
      world,
      [system("known", 0), system("near", 5), system("far", 8)],
      20,
      "chapter",
    );
    expect([...projection.knownSystemIds]).toEqual(["known"]);
    expect([...projection.missingAstronomySystemIds]).toEqual([]);
    expect([...projection.activeSystemIds]).toEqual(["known"]);
    expect(projection.narrativeSystemIdsByAstronomyId.get("known")).toBe(
      "location:system",
    );
    expect(projection.contextSystems.map((candidate) => candidate.id)).toEqual([
      "known",
      "near",
    ]);
  });

  it("reports mapped narrative anchors missing from astronomy coverage", () => {
    const projection = projectNarrativeMap(
      world,
      [system("near", 5)],
      20,
      "chapter",
    );

    expect([...projection.knownSystemIds]).toEqual([]);
    expect([...projection.missingAstronomySystemIds]).toEqual(["known"]);
    expect(projection.contextSystems).toEqual([]);
  });

  it("uses mapped activity ancestry at the represented date", () => {
    const datedWorld: NarrativeWorld = {
      ...world,
      view: { chapter: "1.1", display_date: "2200.0" },
    };
    expect([
      ...projectNarrativeMap(datedWorld, [system("known", 0)], 20, "date")
        .activeSystemIds,
    ]).toEqual(["known"]);
  });

  it("derives focus only from an unambiguous supported mapped context", () => {
    const ids = new Set(["known", "near"]);
    expect(
      focusSystemIdForSelection(
        { kind: "narrative", id: "character:known" },
        world,
        ids,
      ),
    ).toBe("known");
    expect(
      focusSystemIdForSelection(
        { kind: "narrative", id: "event:unmapped" },
        world,
        ids,
      ),
    ).toBeNull();
    expect(
      focusSystemIdForSelection({ kind: "astronomy", id: "near" }, world, ids),
    ).toBe("near");
    expect(
      focusSystemIdForSelection({ kind: "chapter", id: "1.1" }, world, ids),
    ).toBeNull();
  });

  it("invalidates astronomy-only selections when their context disappears", () => {
    expect(
      isSelectionEligibleForMap(
        { kind: "astronomy", id: "far" },
        world,
        new Set(["known"]),
      ),
    ).toBe(false);
    expect(
      isSelectionEligibleForMap(
        { kind: "chapter", id: "1.1" },
        world,
        new Set(["known"]),
      ),
    ).toBe(false);
  });
});

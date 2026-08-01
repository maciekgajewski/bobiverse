import { describe, expect, it } from "vitest";
import type { StellarSystem } from "../../src/domain/types";
import type { NarrativeWorld } from "../../src/narrative/model";
import { systemViewEntryForNarrativeSelection } from "../../src/system-view";

const astronomySystem: StellarSystem = {
  id: "fixture-system",
  name: "Fixture System",
  alternates: [],
  position_pc: { xg: 0, yg: 0, zg: 0 },
  render_position: { x: 0, y: 0, z: 0 },
  distance_from_sol_pc: 0,
  distance_uncertainty_pc: null,
  components: [],
  provenance: {
    catalogues: [],
    source_object_ids: [],
    adopted_component_id: "fixture",
    review_version: "fixture",
    wds_designations: [],
  },
};

function world(children: Record<string, unknown>[]): NarrativeWorld {
  return {
    entities: [
      {
        id: "location:system",
        entity_type: "location",
        name: "Fixture System",
        kind: "star_system",
        astronomy_object_id: "fixture-system",
        child_ids: children.map((child) => String(child.id)),
      },
      ...children,
    ] as NarrativeWorld["entities"],
    activity: [],
    view: { chapter: null, display_date: null },
  };
}

describe("system-view entry eligibility", () => {
  it("accepts multiple direct member stars", () => {
    const fixture = world([
      {
        id: "location:a",
        entity_type: "location",
        kind: "star",
        parent_location_id: "location:system",
        parent_relation: "member_of_system",
      },
      {
        id: "location:b",
        entity_type: "location",
        kind: "star",
        parent_location_id: "location:system",
        parent_relation: "member_of_system",
      },
    ]);

    expect(
      systemViewEntryForNarrativeSelection(
        fixture,
        [astronomySystem],
        "location:system",
      ),
    ).toEqual({
      astronomySystemId: "fixture-system",
      narrativeSystemId: "location:system",
    });
  });

  it("accepts one member star with a recognized direct orbital child", () => {
    const fixture = world([
      {
        id: "location:star",
        entity_type: "location",
        kind: "star",
        parent_location_id: "location:system",
        parent_relation: "member_of_system",
        child_ids: ["location:planet"],
      },
      {
        id: "location:planet",
        entity_type: "location",
        kind: "planet",
        parent_location_id: "location:star",
        parent_relation: "orbits",
      },
    ]);

    expect(
      systemViewEntryForNarrativeSelection(
        fixture,
        [astronomySystem],
        "location:system",
      ),
    ).not.toBeNull();
  });

  it("rejects astronomy-only, empty single-star, and non-renderable descendants", () => {
    const fixture = world([
      {
        id: "location:star",
        entity_type: "location",
        kind: "star",
        parent_location_id: "location:system",
        parent_relation: "member_of_system",
        child_ids: ["location:locale"],
      },
      {
        id: "location:locale",
        entity_type: "location",
        kind: "locale",
        parent_location_id: "location:star",
        parent_relation: "orbits",
      },
    ]);

    expect(
      systemViewEntryForNarrativeSelection(
        fixture,
        [astronomySystem],
        "location:system",
      ),
    ).toBeNull();
    expect(
      systemViewEntryForNarrativeSelection(fixture, [astronomySystem], null),
    ).toBeNull();
    expect(
      systemViewEntryForNarrativeSelection(fixture, [], "location:system"),
    ).toBeNull();
  });
});

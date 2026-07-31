import { describe, expect, it } from "vitest";
import {
  focusPath,
  orbitalRegionPoints,
  projectSystemView,
  retreatSystemFocusPath,
  systemViewLayout,
  visibleSystemLabelIds,
} from "../../src/domain/system-view";
import {
  bodySurfaceRequestPath,
  normalizeOrbitalOrders,
  orderLocationChildIds,
  selectBodySurfaceAsset,
  type NarrativeAsset,
  type NarrativeEntity,
  type NarrativeRecord,
  type NarrativeWorld,
} from "../../src/narrative/model";

function location(
  id: string,
  name: string,
  kind: string,
  values: NarrativeRecord = {},
): NarrativeEntity {
  return { id, name, kind, entity_type: "location", ...values };
}

function fixtureWorld(): NarrativeWorld {
  return {
    entities: [
      location("location:system", "Fixture System", "star_system", {
        astronomy_object_id: "fixture",
        child_ids: ["location:a", "location:b"],
      }),
      location("location:a", "Fixture A", "star", {
        parent_location_id: "location:system",
        parent_relation: "member_of_system",
        child_ids: ["location:earth", "location:belt", "location:locale"],
      }),
      location("location:b", "Fixture B", "star", {
        parent_location_id: "location:system",
        parent_relation: "member_of_system",
        child_ids: [],
      }),
      location("location:earth", "Fixture planet", "planet", {
        parent_location_id: "location:a",
        parent_relation: "orbits",
        orbital_order: 1024,
        body_class: "rocky",
        child_ids: ["location:moon"],
      }),
      location("location:belt", "Fixture belt", "asteroid_belt", {
        parent_location_id: "location:a",
        parent_relation: "orbits",
        orbital_order: 2048,
        child_ids: [],
      }),
      location("location:moon", "Fixture moon", "moon", {
        parent_location_id: "location:earth",
        parent_relation: "orbits",
        orbital_order: 1024,
        child_ids: [],
      }),
      location("location:locale", "Hidden locale", "locale", {
        parent_location_id: "location:a",
        parent_relation: "located_on",
        child_ids: [],
      }),
      location("location:station", "Orbiting station", "megastructure", {
        parent_location_id: "location:a",
        parent_relation: "orbits",
        child_ids: [],
      }),
    ],
    activity: [
      {
        entity_id: "location:moon",
        source_chapter: "1.1",
        effective_date: "2133",
        reasons: ["mention"],
      },
    ],
    view: { chapter: "1.1", display_date: "2133" },
  };
}

describe("guided system view", () => {
  it("projects only the recognized hierarchy and preserves authored child order", () => {
    const model = projectSystemView(
      fixtureWorld(),
      "location:system",
      "chapter",
    );
    expect(model).not.toBeNull();
    expect([...model!.nodes.keys()]).toEqual([
      "location:system",
      "location:a",
      "location:earth",
      "location:moon",
      "location:belt",
      "location:b",
    ]);
    expect(model!.nodes.has("location:locale")).toBe(false);
    expect(model!.nodes.has("location:station")).toBe(false);
    expect(model!.nodes.get("location:a")!.childIds).toEqual([
      "location:earth",
      "location:belt",
    ]);
    expect(model!.activeCounts.get("location:moon")).toBe(1);
    expect(focusPath(model!, "location:moon")).toEqual([
      "location:system",
      "location:a",
      "location:earth",
      "location:moon",
    ]);
  });

  it("uses direct children, reduced previews, and no deeper descendants", () => {
    const model = projectSystemView(
      fixtureWorld(),
      "location:system",
      "chapter",
    )!;
    const overview = systemViewLayout(model, "location:a", false);
    expect(overview.map(({ id }) => id)).toEqual([
      "location:a",
      "location:earth",
      "location:moon",
      "location:belt",
      "location:system",
      "location:b",
    ]);
    expect(overview.find(({ id }) => id === "location:moon")).toMatchObject({
      detail: "preview",
      interactive: false,
    });
  });

  it("does not offer entry for an empty single star", () => {
    const world = fixtureWorld();
    world.entities = world.entities.filter(
      (entity) => entity.id === "location:system" || entity.id === "location:a",
    );
    world.entities[0]!.child_ids = ["location:a"];
    world.entities[1]!.child_ids = [];
    expect(projectSystemView(world, "location:system", "chapter")).toBeNull();
  });

  it("deduplicates real active locations, excludes ancestry-only records, and retains global targets", () => {
    const world = fixtureWorld();
    world.entities.push(
      location("location:other", "Other System", "star_system", {
        astronomy_object_id: "other",
      }),
      location("location:other-world", "Other World", "planet", {
        parent_location_id: "location:other",
        parent_relation: "orbits",
      }),
    );
    world.activity.push(
      {
        entity_id: "location:moon",
        source_chapter: "1.1",
        effective_date: "2133",
        reasons: ["update"],
      },
      {
        entity_id: "location:system",
        source_chapter: "1.1",
        effective_date: "2133",
        reasons: ["mapped_system_ancestry"],
      },
      {
        entity_id: "location:other-world",
        source_chapter: "1.1",
        effective_date: "2133",
        reasons: ["mention"],
      },
    );
    const model = projectSystemView(world, "location:system", "chapter")!;
    expect(model.activeCounts.get("location:moon")).toBe(1);
    expect(model.activeTargets.map(({ id }) => id)).toEqual([
      "location:moon",
      "location:other-world",
    ]);
    expect(model.activeTargets[1]).toMatchObject({
      visualNodeId: null,
      mappedSystemId: "location:other",
    });
  });

  it("retreats to the nearest surviving focus ancestor", () => {
    const model = projectSystemView(
      fixtureWorld(),
      "location:system",
      "chapter",
    )!;
    const nodes = new Map(model.nodes);
    nodes.delete("location:moon");
    expect(
      retreatSystemFocusPath({ ...model, nodes }, [
        "location:system",
        "location:a",
        "location:earth",
        "location:moon",
      ]),
    ).toEqual(["location:system", "location:a", "location:earth"]);
  });

  it("uses deterministic distinct region inputs and priority-managed labels", () => {
    const model = projectSystemView(
      fixtureWorld(),
      "location:system",
      "chapter",
    )!;
    const layout = systemViewLayout(model, "location:a", false);
    expect(orbitalRegionPoints("asteroid_belt", 1)).toHaveLength(170);
    expect(orbitalRegionPoints("kuiper_belt", 1)).toHaveLength(110);
    expect(orbitalRegionPoints("oort_cloud", 1)).toHaveLength(220);
    expect(orbitalRegionPoints("oort_cloud", 1)).toEqual(
      orbitalRegionPoints("oort_cloud", 1),
    );
    const labels = visibleSystemLabelIds(
      layout,
      model.activeCounts,
      "location:earth",
      "location:belt",
      null,
    );
    expect(labels.has("location:moon")).toBe(true);
    expect(labels.has("location:earth")).toBe(false);
  });
});

describe("orbital order and body surfaces", () => {
  it("allocates simultaneous omissions by stable ID after the effective maximum", () => {
    const parent = location("location:star", "Star", "star");
    const inner = location("location:inner", "Inner", "planet", {
      parent_location_id: parent.id,
      parent_relation: "orbits",
      orbital_order: 7,
    });
    const later = location("location:z", "Z", "planet", {
      parent_location_id: parent.id,
      parent_relation: "orbits",
    });
    const earlier = location("location:a", "A", "planet", {
      parent_location_id: parent.id,
      parent_relation: "orbits",
    });
    normalizeOrbitalOrders(
      new Map(
        [parent, inner, later, earlier].map((entity) => [entity.id, entity]),
      ),
    );
    expect(earlier.orbital_order).toBe(1031);
    expect(later.orbital_order).toBe(2055);
  });

  it("rejects colliding effective sibling keys", () => {
    const parent = location("location:star", "Star", "star");
    const children = ["a", "b"].map((suffix) =>
      location(`location:${suffix}`, suffix, "planet", {
        parent_location_id: parent.id,
        parent_relation: "orbits",
        orbital_order: 1024,
      }),
    );
    expect(() =>
      normalizeOrbitalOrders(
        new Map([parent, ...children].map((entity) => [entity.id, entity])),
      ),
    ).toThrow("Orbital order 1024 is duplicated");
  });

  it("sorts the orbital subsequence across interleaved non-orbital children", () => {
    const outer = location("location:outer", "Outer", "planet", {
      parent_relation: "orbits",
      orbital_order: 2048,
    });
    const locale = location("location:locale", "Locale", "locale", {
      parent_relation: "located_on",
    });
    const inner = location("location:inner", "Inner", "planet", {
      parent_relation: "orbits",
      orbital_order: 1024,
    });
    const locations = new Map(
      [outer, locale, inner].map((entity) => [entity.id, entity]),
    );
    expect(
      orderLocationChildIds(
        ["location:outer", "location:locale", "location:inner"],
        locations,
      ),
    ).toEqual(["location:inner", "location:locale", "location:outer"]);
  });

  it("selects a compatible versioned generic deterministically", () => {
    const asset = (id: string, selectionVersion = 1): NarrativeAsset => ({
      id,
      role: "body_surface",
      path: `assets/${id.slice(6)}.svg`,
      source: "fixture",
      generic: true,
      selection_version: selectionVersion,
      compatible_body_classes: ["rocky"],
      compatible_kinds: ["planet"],
    });
    const body = location("location:planet", "Planet", "planet", {
      body_class: "rocky",
    });
    const registry = { assets: [asset("asset:a"), asset("asset:b")] };
    const selected = selectBodySurfaceAsset(body, registry);
    expect(selectBodySurfaceAsset(body, registry)?.id).toBe(selected?.id);
    expect(
      selectBodySurfaceAsset(body, {
        assets: [...registry.assets, asset("asset:future", 2)],
      })?.id,
    ).toBe(selected?.id);
  });

  it("uses an explicit compatible dedicated surface through the shared selector", () => {
    const dedicated: NarrativeAsset = {
      id: "asset:dedicated-earth",
      role: "body_surface",
      path: "assets/body-surfaces/dedicated-earth.svg",
      source: "focused fixture",
      generic: false,
      selection_version: 1,
      compatible_body_classes: ["rocky"],
      compatible_kinds: ["planet"],
    };
    const body = location("location:earth", "Earth", "planet", {
      body_class: "rocky",
      surface_texture_id: dedicated.id,
    });
    expect(selectBodySurfaceAsset(body, { assets: [dedicated] })).toBe(
      dedicated,
    );
    expect(bodySurfaceRequestPath(body, { assets: [dedicated] })).toBe(
      "/assets/body-surfaces/dedicated-earth.svg",
    );
    expect(
      selectBodySurfaceAsset(
        { ...body, kind: "moon" },
        { assets: [dedicated] },
      ),
    ).toBeNull();
  });
});

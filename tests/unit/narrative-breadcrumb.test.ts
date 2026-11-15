import { describe, expect, it } from "vitest";
import type { StellarSystem } from "../../src/domain/types";
import type { NarrativeWorld } from "../../src/narrative/model";
import { inspectorBreadcrumbTrail } from "../../src/narrative/breadcrumb";

const world = {
  entities: [
    {
      id: "location:solar-system",
      entity_type: "location",
      name: "Solar System",
      kind: "star_system",
    },
    {
      id: "location:sol",
      entity_type: "location",
      name: "Sol",
      kind: "star",
      parent_location_id: "location:solar-system",
    },
    {
      id: "location:earth",
      entity_type: "location",
      name: "Earth",
      kind: "planet",
      parent_location_id: "location:sol",
    },
    {
      // Its parent is not projected in this view (not yet revealed).
      id: "location:outpost",
      entity_type: "location",
      name: "Outpost",
      parent_location_id: "location:hidden",
    },
    {
      id: "location:loop-a",
      entity_type: "location",
      name: "Loop A",
      parent_location_id: "location:loop-b",
    },
    {
      id: "location:loop-b",
      entity_type: "location",
      name: "Loop B",
      parent_location_id: "location:loop-a",
    },
    {
      id: "location:epsilon-eridani",
      entity_type: "location",
      name: "Epsilon Eridani",
      kind: "star_system",
    },
    {
      id: "location:epsilon-eridani-star",
      entity_type: "location",
      name: "Epsilon Eridani",
      kind: "star",
      parent_location_id: "location:epsilon-eridani",
    },
    {
      id: "location:epsilon-eridani-one",
      entity_type: "location",
      name: "Epsilon Eridani One",
      kind: "planet",
      parent_location_id: "location:epsilon-eridani-star",
    },
    {
      id: "character:bob",
      entity_type: "character",
      name: "Bob",
      parent_location_id: "location:earth",
    },
  ],
  activity: [],
  view: { chapter: null, display_date: null },
} as unknown as NarrativeWorld;

const systems = [
  {
    id: "sol",
    name: "Sol",
    components: [{ id: "sol-a", designation: "Sol A" }],
  },
] as unknown as StellarSystem[];

const labels = (trail: ReturnType<typeof inspectorBreadcrumbTrail>) =>
  trail.map((crumb) => crumb.label);

describe("inspector breadcrumb trail", () => {
  it("walks real parent links from the root to the selected location", () => {
    const trail = inspectorBreadcrumbTrail(
      { kind: "narrative", id: "location:earth" },
      world,
      systems,
    );
    expect(labels(trail)).toEqual(["Solar System", "Sol", "Earth"]);
    expect(trail.map((crumb) => crumb.target)).toEqual([
      { kind: "narrative", id: "location:solar-system" },
      { kind: "narrative", id: "location:sol" },
      null,
    ]);
  });

  it("stops at a parent that is not in the projected world", () => {
    expect(
      labels(
        inspectorBreadcrumbTrail(
          { kind: "narrative", id: "location:outpost" },
          world,
          systems,
        ),
      ),
    ).toEqual(["Outpost"]);
  });

  it("does not loop on a cyclic parent chain", () => {
    expect(
      labels(
        inspectorBreadcrumbTrail(
          { kind: "narrative", id: "location:loop-a" },
          world,
          systems,
        ),
      ),
    ).toEqual(["Loop B", "Loop A"]);
  });

  it("shows only the name for non-location entities", () => {
    expect(
      labels(
        inspectorBreadcrumbTrail(
          { kind: "narrative", id: "character:bob" },
          world,
          systems,
        ),
      ),
    ).toEqual(["Bob"]);
  });

  it("names chapters, astronomy systems and components", () => {
    expect(
      labels(
        inspectorBreadcrumbTrail({ kind: "chapter", id: "1.2" }, world, []),
      ),
    ).toEqual(["Chapter 1.2"]);
    expect(
      labels(
        inspectorBreadcrumbTrail(
          { kind: "astronomy", id: "sol" },
          world,
          systems,
        ),
      ),
    ).toEqual(["Sol"]);
    expect(
      labels(
        inspectorBreadcrumbTrail(
          { kind: "component", systemId: "sol", id: "sol-a" },
          world,
          systems,
        ),
      ),
    ).toEqual(["Sol", "Sol A"]);
  });

  it("is empty with no selection or an unknown object", () => {
    expect(inspectorBreadcrumbTrail(null, world, systems)).toEqual([]);
    expect(
      inspectorBreadcrumbTrail(
        { kind: "narrative", id: "location:missing" },
        world,
        systems,
      ),
    ).toEqual([]);
  });

  it("qualifies adjacent same-named system and star crumbs, including the current", () => {
    const trail = inspectorBreadcrumbTrail(
      { kind: "narrative", id: "location:epsilon-eridani-star" },
      world,
      systems,
    );
    expect(labels(trail)).toEqual([
      "Epsilon Eridani (star system)",
      "Epsilon Eridani (star)",
    ]);
    expect(trail.map((crumb) => crumb.target)).toEqual([
      { kind: "narrative", id: "location:epsilon-eridani" },
      null,
    ]);
  });

  it("leaves a one-crumb system trail and a uniquely named planet unqualified", () => {
    expect(
      labels(
        inspectorBreadcrumbTrail(
          { kind: "narrative", id: "location:epsilon-eridani" },
          world,
          systems,
        ),
      ),
    ).toEqual(["Epsilon Eridani"]);
    const trail = inspectorBreadcrumbTrail(
      { kind: "narrative", id: "location:epsilon-eridani-one" },
      world,
      systems,
    );
    expect(labels(trail)).toEqual([
      "Epsilon Eridani (star system)",
      "Epsilon Eridani (star)",
      "Epsilon Eridani One",
    ]);
  });
});

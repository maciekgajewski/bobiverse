import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectInspector } from "../../src/components/ObjectInspector";
import type { NarrativeBrowserItem } from "../../src/narrative/browser";
import type {
  NarrativeEntity,
  NarrativeWorld,
} from "../../src/narrative/model";

const sparseEntities: NarrativeEntity[] = [
  {
    id: "character:sparse",
    entity_type: "character",
    name: "Sparse character",
  },
  { id: "event:sparse", entity_type: "event", name: "Sparse event" },
  {
    id: "location:sparse-system",
    entity_type: "location",
    name: "Sparse system",
    kind: "star_system",
    map_status: "unmapped",
  },
  { id: "species:sparse", entity_type: "species", name: "Sparse species" },
  {
    id: "technology:sparse",
    entity_type: "technology",
    name: "Sparse technology",
  },
  {
    id: "organization:sparse",
    entity_type: "organization",
    name: "Sparse organization",
  },
  {
    id: "vessel_type:sparse",
    entity_type: "vessel_type",
    name: "Sparse vessel type",
  },
];

const world: NarrativeWorld = {
  entities: sparseEntities,
  activity: [],
  view: { chapter: "1.1", display_date: "2200" },
};

function item(entity: NarrativeEntity): NarrativeBrowserItem {
  return {
    entity,
    name: String(entity.name),
    aliases: [],
    active: false,
    lastActivity: null,
  };
}

describe("object inspector", () => {
  afterEach(cleanup);

  it("renders every supported narrative type safely with sparse fields", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ObjectInspector
        selection={{ kind: "narrative", id: sparseEntities[0]!.id }}
        narrativeItem={item(sparseEntities[0]!)}
        world={world}
        systems={[]}
        assets={{ assets: [] }}
        unit="ly"
        onSelect={onSelect}
      />,
    );
    for (const entity of sparseEntities) {
      rerender(
        <ObjectInspector
          selection={{ kind: "narrative", id: entity.id }}
          narrativeItem={item(entity)}
          world={world}
          systems={[]}
          assets={{ assets: [] }}
          unit="ly"
          onSelect={onSelect}
        />,
      );
      expect(
        screen.getByRole("heading", { name: String(entity.name) }),
      ).toBeInTheDocument();
      if (entity.entity_type === "event") {
        expect(
          screen.getByText("Chronologically unplaced"),
        ).toBeInTheDocument();
      }
    }
  });

  it("links only eligible projected relationships and labels sightings as last seen", () => {
    const entities: NarrativeEntity[] = [
      {
        id: "character:traveler",
        entity_type: "character",
        name: "Traveler",
        species_id: "species:eligible",
        last_known_location: {
          location_id: "location:eligible",
          source_chapter: "1.2",
          effective_date: "2200.1",
        },
      },
      {
        id: "species:eligible",
        entity_type: "species",
        name: "Eligible species",
      },
      {
        id: "location:eligible",
        entity_type: "location",
        name: "Eligible place",
        kind: "locale",
        map_status: "unmapped",
      },
    ];
    const linkedWorld: NarrativeWorld = {
      ...world,
      entities,
    };
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: entities[0]!.id }}
        narrativeItem={item(entities[0]!)}
        world={linkedWorld}
        systems={[]}
        assets={{ assets: [] }}
        unit="ly"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Last seen")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Eligible place" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/current location/i)).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectInspector } from "../../src/components/ObjectInspector";
import { nearbySystems } from "../../src/domain/data";
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
    id: "vessel:sparse",
    entity_type: "vessel",
    name: "Sparse vessel",
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

  it("labels vessels and displays optional current state", () => {
    const vessel: NarrativeEntity = {
      id: "vessel:heaven-fixture",
      entity_type: "vessel",
      name: "Heaven fixture",
      current_state: "Departing the fixture system.",
    };
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: vessel.id }}
        narrativeItem={item(vessel)}
        world={{ ...world, entities: [vessel] }}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Vessel")).toBeInTheDocument();
    expect(screen.getByText("Current state")).toBeInTheDocument();
    expect(
      screen.getByText("Departing the fixture system."),
    ).toBeInTheDocument();
  });

  it("renders one sparse-safe chapter detail surface and selects relationships", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <ObjectInspector
        selection={{ kind: "chapter", id: "1.7" }}
        narrativeItem={null}
        chapterDetail={{
          chapter: "1.7",
          bookNumber: "1",
          bookTitle: "Fixture volume",
          localNumber: "7",
          title: "An unprefixed fixture title",
          summary: "A compact original fixture synopsis.",
          pictureId: "asset:fixture-chapter",
          location: { id: "location:fixture", name: "Fixture location" },
          leadCharacters: [
            { id: "character:lead-one", name: "Lead One" },
            { id: "character:lead-two", name: "Lead Two" },
          ],
          events: [{ id: "event:fixture", name: "Fixture event" }],
          vessels: [{ id: "vessel:fixture", name: "Fixture vessel" }],
          technologies: [
            { id: "technology:fixture", name: "Fixture technology" },
          ],
          appearingCharacters: Array.from({ length: 24 }, (_, index) => ({
            id: `character:fixture-${index}`,
            name: `Fixture Character ${index}`,
          })),
        }}
        world={world}
        systems={[]}
        assets={{
          assets: [
            {
              id: "asset:fixture-chapter",
              path: "assets/fixture-chapter.webp",
              source: "Test-only chapter illustration.",
            },
          ],
        }}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Book 1 · Chapter 7")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "An unprefixed fixture title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Synopsis")).toBeInTheDocument();
    expect(screen.getByText("Lead characters")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Vessels")).toBeInTheDocument();
    expect(screen.getByText("Technologies")).toBeInTheDocument();
    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Illustration for Book 1, Chapter 7, An unprefixed fixture title",
      }),
    ).toHaveAttribute("src", "/assets/fixture-chapter.webp");
    expect(
      document.querySelector(".chapter-relationship-list.condensed"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".chapter-inspector-details"),
    ).toBeInTheDocument();
    expect(container.querySelector(".chapter-details")).not.toBeInTheDocument();
    expect(
      container.querySelector(".chapter-relationship-frame"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Location: Fixture location" }),
    );
    expect(onSelect).toHaveBeenCalledWith({
      kind: "narrative",
      id: "location:fixture",
    });
  });

  it("omits chapter illustration and empty optional relationship groups", () => {
    const { container } = render(
      <ObjectInspector
        selection={{ kind: "chapter", id: "1.1" }}
        narrativeItem={null}
        chapterDetail={{
          chapter: "1.1",
          bookNumber: "1",
          bookTitle: "Fixture volume",
          localNumber: "1",
          title: "1",
          summary: "A compact original fixture synopsis.",
          pictureId: null,
          location: { id: "location:fixture", name: "Fixture location" },
          leadCharacters: [],
          events: [],
          vessels: [],
          technologies: [],
          appearingCharacters: [],
        }}
        world={world}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Lead character")).not.toBeInTheDocument();
    expect(screen.queryByText("Events")).not.toBeInTheDocument();
    expect(screen.queryByText("Vessels")).not.toBeInTheDocument();
    expect(screen.queryByText("Technologies")).not.toBeInTheDocument();
    expect(screen.queryByText("Characters")).not.toBeInTheDocument();
  });

  it("uses the concise numeric-only alternative text for chapter illustrations", () => {
    render(
      <ObjectInspector
        selection={{ kind: "chapter", id: "1.1" }}
        narrativeItem={null}
        chapterDetail={{
          chapter: "1.1",
          bookNumber: "1",
          bookTitle: "Fixture volume",
          localNumber: "1",
          title: "1",
          summary: "A compact original fixture synopsis.",
          pictureId: "asset:fixture-chapter",
          location: { id: "location:fixture", name: "Fixture location" },
          leadCharacters: [],
          events: [],
          vessels: [],
          technologies: [],
          appearingCharacters: [],
        }}
        world={world}
        systems={[]}
        assets={{
          assets: [
            {
              id: "asset:fixture-chapter",
              path: "assets/fixture-chapter.webp",
              source: "Test-only chapter illustration.",
            },
          ],
        }}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "Illustration for Book 1, Chapter 1",
      }),
    ).toBeInTheDocument();
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
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Last seen")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Eligible place" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/current location/i)).not.toBeInTheDocument();
  });

  it("renders direct-parent-first ancestor links with independent chapter and date metadata", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onChapterSelect = vi.fn();
    const entities: NarrativeEntity[] = [
      {
        id: "character:child",
        entity_type: "character",
        name: "Child",
        parent_id: "character:parent",
      },
      {
        id: "character:parent",
        entity_type: "character",
        name: "Parent",
        parent_id: "character:grandparent",
        birth_chapter: "1.7",
      },
      {
        id: "character:grandparent",
        entity_type: "character",
        name: "Grandparent",
        birth_date: "2100.2",
      },
    ];
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: "character:child" }}
        narrativeItem={item(entities[0]!)}
        world={{ ...world, entities }}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
        onChapterSelect={onChapterSelect}
        sectionState={{ overview: true, lineage: true, travelHistory: false }}
      />,
    );

    const lineage = screen.getByRole("button", { name: "Lineage" });
    expect(lineage).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("heading", { name: "Lineage" }),
    ).toBeInTheDocument();
    const names = screen
      .getAllByRole("button", { name: /^Character:/ })
      .map((button) => button.textContent);
    expect(names).toEqual(["Parent", "Grandparent"]);
    expect(screen.getByText("2100")).toBeInTheDocument();
    const parentLink = screen.getByRole("button", {
      name: "Character: Parent",
    });
    const chapterLink = screen.getByRole("button", {
      name: "Birth or cloning chapter for Parent: Chapter 1.7",
    });
    await user.tab();
    await user.tab();
    await user.tab();
    expect(parentLink).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith({
      kind: "narrative",
      id: "character:parent",
    });
    await user.tab();
    expect(chapterLink).toHaveFocus();
    await user.keyboard(" ");
    expect(onChapterSelect).toHaveBeenCalledWith("1.7");
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Character: Grandparent" }),
    ).toHaveFocus();
  });

  it("renders every travel stop newest first with separate location and chapter controls", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onChapterSelect = vi.fn();
    const entities: NarrativeEntity[] = [
      { id: "character:traveler", entity_type: "character", name: "Traveler" },
      { id: "location:old", entity_type: "location", name: "Old place" },
      { id: "location:new", entity_type: "location", name: "New place" },
    ];
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: "character:traveler" }}
        narrativeItem={item(entities[0]!)}
        world={{ ...world, entities }}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
        onChapterSelect={onChapterSelect}
        travelStops={[
          {
            location_id: "location:old",
            source_chapter: "1.1",
            effective_date: "2200",
            appearance_index: 0,
            astronomy_system_id: null,
          },
          {
            location_id: "location:new",
            source_chapter: "1.2",
            effective_date: "2201",
            appearance_index: 0,
            astronomy_system_id: null,
          },
        ]}
        sectionState={{ overview: true, lineage: false, travelHistory: true }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Travel history" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list")).toHaveTextContent("New place");
    expect(screen.getByRole("list")).toHaveTextContent("Old place");
    await user.click(screen.getByRole("button", { name: "New place" }));
    expect(onSelect).toHaveBeenCalledWith({
      kind: "narrative",
      id: "location:new",
    });
    await user.click(
      screen.getByRole("button", {
        name: "Travel appearance chapter: Chapter 1.2",
      }),
    );
    expect(onChapterSelect).toHaveBeenCalledWith("1.2");
  });

  it("renders astronomy distances and coordinates only in light-years", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const system = nearbySystems.systems.find(
      (candidate) => candidate.id !== "sol",
    );
    expect(system).toBeDefined();
    if (!system) throw new Error("Fixture dataset has no non-Sol system");

    render(
      <ObjectInspector
        selection={{ kind: "astronomy", id: system.id }}
        narrativeItem={null}
        world={world}
        systems={[system]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        `${(system.distance_from_sol_pc * 3.261563777).toFixed(2)} ly`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `${(system.position_pc.xg * 3.261563777).toFixed(3)}, ${(
          system.position_pc.yg * 3.261563777
        ).toFixed(3)}, ${(system.position_pc.zg * 3.261563777).toFixed(3)} ly`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\bpc$/)).not.toBeInTheDocument();
  });

  it("shows accepted census identity and substellar facts without physical-size claims", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const system = nearbySystems.systems.find(
      (candidate) => candidate.name === "WISE 0855-0714",
    );
    if (!system) throw new Error("WISE 0855-0714 fixture is missing");

    render(
      <ObjectInspector
        selection={{ kind: "astronomy", id: system.id }}
        narrativeItem={null}
        world={world}
        systems={[system]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/GJ 11286/)).toBeInTheDocument();
    expect(
      screen.getByText(/brown dwarf · 250 K ± 50 K · 20-pc census/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/physical radius|luminosity/i),
    ).not.toBeInTheDocument();
  });
});

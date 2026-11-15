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

  it("hides Enter system while ENABLE_ENTER_SYSTEM is off", () => {
    // The real flag module, not a mock: this fails once the flag is turned
    // back on, as a reminder to restore the Enter system tests' coverage.
    const system = sparseEntities.find(
      (entity) => entity.id === "location:sparse-system",
    )!;
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: system.id }}
        narrativeItem={item(system)}
        world={world}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
        systemEntry={{
          astronomySystemId: "stellar-system-000001",
          narrativeSystemId: system.id,
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Sparse system" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enter system" }),
    ).not.toBeInTheDocument();
  });

  it("omits the in-body history controls when the host renders them", () => {
    const entity = sparseEntities[0]!;
    const props = {
      selection: { kind: "narrative", id: entity.id } as const,
      narrativeItem: item(entity),
      world,
      systems: [],
      assets: { assets: [] },
      onSelect: vi.fn(),
    };
    const { rerender } = render(<ObjectInspector {...props} />);
    expect(
      screen.getByRole("navigation", { name: "Inspector history" }),
    ).toBeInTheDocument();
    rerender(<ObjectInspector {...props} showHistoryControls={false} />);
    expect(
      screen.queryByRole("navigation", { name: "Inspector history" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: entity.name as string }),
    ).toBeInTheDocument();
  });

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

  it("shows a location's kind under its name and Map context at the bottom", () => {
    const system: NarrativeEntity = {
      id: "location:kind-system",
      entity_type: "location",
      name: "Kind system",
      kind: "star_system",
      map_status: "unmapped",
      description: "A fixture system.",
    };
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: system.id }}
        narrativeItem={item(system)}
        world={{ ...world, entities: [...sparseEntities, system] }}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Kind system",
    });
    const header = heading.closest("header")!;
    expect(header).toHaveClass("inspector-header");
    expect(header).not.toHaveClass("has-illustration");
    const kind = heading.nextElementSibling!;
    expect(kind).toHaveClass("entity-kind");
    expect(kind).toHaveTextContent(/^star system$/);
    expect(screen.queryByText("Location kind")).not.toBeInTheDocument();
    expect(
      [...document.querySelectorAll("dt")].map((dt) => dt.textContent),
    ).not.toContain("Map context");
    const details = heading.closest(".narrative-details")!;
    const last = details.lastElementChild!;
    expect(last).toHaveClass("map-context-section");
    expect(last.querySelector("h3")).toHaveTextContent("Map context");
    expect(last).toHaveTextContent("Explicitly unmapped");
    expect(header.querySelector("[data-header-illustration]")).toBeNull();
  });

  it("puts a species icon, GUPPI's picture or an entity picture in the header", () => {
    const species: NarrativeEntity = {
      id: "species:human",
      entity_type: "species",
      name: "Human",
    };
    const guppi: NarrativeEntity = {
      id: "technology:guppi-interface",
      entity_type: "technology",
      name: "GUPPI interface",
    };
    const portrait: NarrativeEntity = {
      id: "character:portrait",
      entity_type: "character",
      name: "Portrait",
      picture_id: "asset:fixture-portrait",
    };
    const fullWorld = {
      ...world,
      entities: [...sparseEntities, species, guppi, portrait],
    };
    const assets = {
      assets: [
        {
          id: "asset:fixture-portrait",
          path: "assets/fixture-portrait.webp",
          role: "illustration",
        },
      ],
    };
    const view = (entity: NarrativeEntity, extra = {}) => (
      <ObjectInspector
        selection={{ kind: "narrative", id: entity.id }}
        narrativeItem={{ ...item(entity), ...extra }}
        world={fullWorld}
        systems={[]}
        assets={assets}
        onSelect={vi.fn()}
      />
    );
    const { rerender } = render(
      view(species, {
        speciesPresentation: {
          styleId: "species-style:human",
          iconPath: "/assets/species-icons/human.svg",
          colour: "#4DD9FF",
          displayName: "Human",
        },
      }),
    );
    const icon = screen.getByRole("img", { name: "Human species icon" });
    expect(icon).toHaveAttribute("data-header-illustration", "species-icon");
    expect(icon.closest("header")).toHaveClass("has-illustration");
    expect(icon.getAttribute("style")).toContain("human.svg");

    rerender(view(guppi));
    const picture = screen.getByRole("img", {
      name: "Admiral Ackbar illustration by Michael Sutfin, from The New Essential Guide to Characters. Star Wars © Lucasfilm Ltd. Used under fair use.",
    });
    expect(picture).toHaveAttribute("src", "/assets/guppi-ackbar-head.webp");
    expect(picture).toHaveAttribute("data-header-illustration", "presentation");
    expect(picture.closest("header")).toContainElement(
      screen.getByRole("heading", { level: 2, name: "GUPPI interface" }),
    );

    rerender(view(portrait));
    const own = screen.getByRole("img", { name: "Portrait" });
    expect(own).toHaveAttribute("src", "/assets/fixture-portrait.webp");
    expect(own).toHaveAttribute("data-header-illustration", "picture");
    expect(own.closest("header")).not.toBeNull();
    // The old in-body entity picture is gone.
    expect(document.querySelector(".inspector-picture")).toBeNull();
  });

  it("never shows GUPPI's picture when GUPPI is not reader-visible", () => {
    const guppi: NarrativeEntity = {
      id: "technology:guppi-interface",
      entity_type: "technology",
      name: "GUPPI interface",
    };
    // A stale item for an entity outside the projected world.
    render(
      <ObjectInspector
        selection={{ kind: "narrative", id: guppi.id }}
        narrativeItem={item(guppi)}
        world={world}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-header-illustration]")).toBeNull();
    expect(
      document.querySelector('img[src="/assets/guppi-ackbar-head.webp"]'),
    ).toBeNull();
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

  it("renders inline entity links in prose and gates hidden targets", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const town: NarrativeEntity = {
      id: "location:fixture-town",
      entity_type: "location",
      name: "Fixture Town",
    };
    const description =
      "A transport based at [[location:fixture-town]], built before the [[event:fixture-war]].";
    const vessel: NarrativeEntity = {
      id: "vessel:fixture-transport",
      entity_type: "vessel",
      name: "Fixture transport",
      description,
      current_state: "Docked at [[location:fixture-town|the town]].",
    };
    const { container } = render(
      <ObjectInspector
        selection={{ kind: "narrative", id: vessel.id }}
        narrativeItem={item(vessel)}
        world={{
          entities: [vessel, town],
          activity: [],
          view: { chapter: null, display_date: "2200" },
        }}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
        inlineLinkFallbacks={
          new Map([[description, ["Fixture town", "Fixture war"]]])
        }
      />,
    );
    expect(container.textContent).toContain(
      "A transport based at Fixture Town, built before the Fixture war.",
    );
    expect(container.textContent).toContain("Docked at the town.");
    expect(container.textContent).not.toContain("[[");
    expect(screen.queryByRole("button", { name: "Fixture war" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "the town" }));
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: "narrative",
      id: "location:fixture-town",
    });
    await user.click(screen.getByRole("button", { name: "Fixture Town" }));
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("renders inline entity links in a character's state and a chapter synopsis", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const town: NarrativeEntity = {
      id: "location:fixture-town",
      entity_type: "location",
      name: "Fixture Town",
    };
    const character: NarrativeEntity = {
      id: "character:fixture-pat",
      entity_type: "character",
      name: "Fixture Pat",
      current_state: "Works at [[location:fixture-town]].",
    };
    const linkedWorld: NarrativeWorld = {
      entities: [character, town],
      activity: [],
      view: { chapter: "1.7", display_date: "2200" },
    };
    const { unmount } = render(
      <ObjectInspector
        selection={{ kind: "narrative", id: character.id }}
        narrativeItem={item(character)}
        world={linkedWorld}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Fixture Town" }));
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: "narrative",
      id: "location:fixture-town",
    });
    unmount();
    render(
      <ObjectInspector
        selection={{ kind: "chapter", id: "1.7" }}
        narrativeItem={null}
        chapterDetail={{
          chapter: "1.7",
          bookNumber: "1",
          bookTitle: "Fixture volume",
          localNumber: "7",
          title: "Fixture title",
          date: "2200",
          summary: "[[character:fixture-pat|Pat]] moves to the town.",
          pictureId: null,
          location: { id: "location:fixture-town", name: "Fixture Town" },
          leadCharacters: [],
          events: [],
          vessels: [],
          technologies: [],
          appearingCharacters: [],
        }}
        world={linkedWorld}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
      />,
    );
    expect(document.querySelector(".chapter-synopsis p")).toHaveTextContent(
      "Pat moves to the town.",
    );
    await user.click(screen.getByRole("button", { name: "Pat" }));
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: "narrative",
      id: "character:fixture-pat",
    });
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
          date: "2200-03-04",
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
              role: "illustration",
              source: "Test-only chapter illustration.",
            },
          ],
        }}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Book 1 · Fixture volume")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "An unprefixed fixture title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Chapter")).toBeInTheDocument();
    expect(screen.getByText("Synopsis")).toBeInTheDocument();
    expect(screen.getByText("4 March 2200")).toBeInTheDocument();
    expect(screen.queryByText("Date")).not.toBeInTheDocument();
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
          date: "2200",
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
          date: "2200",
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
              role: "illustration",
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
  it("disambiguates a same-named primary star in Contains and leaves unique names bare", async () => {
    const user = userEvent.setup();
    const system: NarrativeEntity = {
      id: "location:epsilon-eridani",
      entity_type: "location",
      name: "Epsilon Eridani",
      kind: "star_system",
      child_ids: ["location:epsilon-eridani-star", "location:bill-skunkworks"],
    };
    const star: NarrativeEntity = {
      id: "location:epsilon-eridani-star",
      entity_type: "location",
      name: "Epsilon Eridani",
      kind: "star",
      parent_location_id: "location:epsilon-eridani",
    };
    const skunkworks: NarrativeEntity = {
      id: "location:bill-skunkworks",
      entity_type: "location",
      name: "Bill's skunkworks",
      kind: "locale",
      parent_location_id: "location:epsilon-eridani",
    };
    const solarSystem: NarrativeEntity = {
      id: "location:solar-system",
      entity_type: "location",
      name: "Solar System",
      kind: "star_system",
      child_ids: ["location:sol"],
    };
    const sol: NarrativeEntity = {
      id: "location:sol",
      entity_type: "location",
      name: "Sol",
      kind: "star",
      parent_location_id: "location:solar-system",
    };
    const caseWorld: NarrativeWorld = {
      entities: [system, star, skunkworks, solarSystem, sol],
      activity: [],
      view: { chapter: "1.61", display_date: "2185" },
    };
    const onSelect = vi.fn();
    const { rerender } = render(
      <ObjectInspector
        selection={{ kind: "narrative", id: system.id }}
        narrativeItem={item(system)}
        world={caseWorld}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Epsilon Eridani (star)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bill's skunkworks" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Epsilon Eridani" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Epsilon Eridani (star)" }),
    );
    expect(onSelect).toHaveBeenCalledWith({
      kind: "narrative",
      id: "location:epsilon-eridani-star",
    });

    rerender(
      <ObjectInspector
        selection={{ kind: "narrative", id: star.id }}
        narrativeItem={item(star)}
        world={caseWorld}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Epsilon Eridani (star system)" }),
    ).toBeInTheDocument();

    rerender(
      <ObjectInspector
        selection={{ kind: "narrative", id: solarSystem.id }}
        narrativeItem={item(solarSystem)}
        world={caseWorld}
        systems={[]}
        assets={{ assets: [] }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Sol" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sol (star)" }),
    ).not.toBeInTheDocument();
  });
});

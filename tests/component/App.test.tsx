import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as narrativeMap from "../../src/narrative/map";
import * as narrativeModel from "../../src/narrative/model";
import { narrativeRuntimePreparationCount } from "../../src/narrative/runtime";

describe("atlas shell", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("keeps narrative DOM selection available when WebGL is unavailable", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByText(
        "Select a map marker or browser item to inspect its reader-safe details.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Solar System/ }));
    expect(
      screen.getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/WebGL unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("Astronomy systems")).not.toBeInTheDocument();
  });

  it("enters a single-star system at its planets and exits through the breadcrumb", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(screen.getByRole("button", { name: "Enter system" }));

    const breadcrumb = screen.getByRole("navigation", {
      name: "System view breadcrumb",
    });
    expect(within(breadcrumb).getByText("Solar System")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Sol")).toBeInTheDocument();
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    await user.click(within(inspector).getByRole("button", { name: "Sol" }));
    await user.click(within(inspector).getByRole("button", { name: "Earth" }));
    expect(within(breadcrumb).getByText("Earth")).toBeInTheDocument();
    expect(
      within(inspector).getByRole("heading", { level: 2, name: "Earth" }),
    ).toBeInTheDocument();
    await user.click(
      within(breadcrumb).getByRole("button", { name: "Solar System" }),
    );
    expect(
      within(inspector).getByRole("heading", { level: 2, name: "Earth" }),
    ).toBeInTheDocument();

    await user.click(
      within(breadcrumb).getByRole("button", { name: "Return to map" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("navigation", { name: "System view breadcrumb" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Solar System" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enter system" }),
    ).toBeInTheDocument();
  });

  it("exits an ineligible projection from its single-star focus", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.16",
        viewChapter: "1.16",
        displayDate: "2144",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getAllByRole("button", { name: /^Epsilon EridaniActive$/ })[0]!,
    );
    await user.click(screen.getByRole("button", { name: "Enter system" }));
    const breadcrumb = screen.getByRole("navigation", {
      name: "System view breadcrumb",
    });
    expect(
      within(breadcrumb).getAllByRole("button", {
        name: "Epsilon Eridani",
      }),
    ).toHaveLength(2);
    await user.selectOptions(
      screen.getByLabelText("Knowledge through"),
      "1.15",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("navigation", { name: "System view breadcrumb" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText(/composition is no longer eligible/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Epsilon Eridani" }),
    ).toBeInTheDocument();
  });

  it("renders actionable content when the narrative projection is invalid", () => {
    vi.spyOn(narrativeModel, "generateNarrativeWorld").mockImplementationOnce(
      () => {
        throw new Error("Fixture projection failed.");
      },
    );

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Narrative projection unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fixture projection failed.")).toBeInTheDocument();
    expect(screen.getByText(/Reload the application/)).toBeInTheDocument();
  });

  it("routes persisted-progress projection failures to the recovery state", () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    vi.spyOn(
      narrativeModel,
      "meaningfulNarrativeDateOptions",
    ).mockImplementationOnce(() => {
      throw new Error("Persisted projection failed.");
    });

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Narrative projection unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Persisted projection failed."),
    ).toBeInTheDocument();
  });

  it("routes selected-object transition failures to the recovery state", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Solar System" }));
    vi.spyOn(narrativeModel, "generateNarrativeWorld").mockImplementationOnce(
      () => {
        throw new Error("Transition projection failed.");
      },
    );

    await user.selectOptions(screen.getByLabelText("Read through"), "1.1");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );

    expect(
      screen.getByRole("heading", { name: "Narrative projection unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Transition projection failed."),
    ).toBeInTheDocument();
  });

  it("generates one world per chapter transition and none for unrelated UI state", async () => {
    const generate = vi.spyOn(narrativeModel, "generateNarrativeWorld");
    const user = userEvent.setup();
    render(<App />);
    const afterInitialLoad = generate.mock.calls.length;

    await user.type(
      screen.getByRole("searchbox", { name: "Search visible objects" }),
      "earth",
    );
    await user.click(
      screen.getByRole("button", { name: /Other Locations, 1 visible/ }),
    );
    expect(generate).toHaveBeenCalledTimes(afterInitialLoad);

    await user.clear(
      screen.getByRole("searchbox", { name: "Search visible objects" }),
    );
    await user.click(screen.getByRole("button", { name: "Solar System" }));
    await user.selectOptions(screen.getByLabelText("Read through"), "1.1");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );

    expect(generate).toHaveBeenCalledTimes(afterInitialLoad + 1);
  });

  it("selects an unlocked timeline chapter for inspection without a second projection", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const generate = vi.spyOn(narrativeModel, "generateNarrativeWorld");
    const user = userEvent.setup();
    render(<App />);
    const afterInitialLoad = generate.mock.calls.length;

    await user.click(
      screen.getByRole("button", {
        name: "Book 1, 1 - Bob Version 1.0",
      }),
    );

    expect(generate).toHaveBeenCalledTimes(afterInitialLoad + 1);
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    expect(
      within(inspector).getByText("Book 1 · Chapter 1"),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByRole("heading", {
        name: "1 - Bob Version 1.0",
      }),
    ).toBeInTheDocument();
    expect(within(inspector).getByText("Synopsis")).toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", {
        name: "Location: Las Vegas",
      }),
    ).toBeInTheDocument();
  });

  it("keeps relationship traversal in panel history and resets it for external selections", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: "Book 1, 2 - Bob Version 2.0",
      }),
    );
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    const back = within(inspector).getByRole("button", { name: "Back" });
    const forward = within(inspector).getByRole("button", { name: "Forward" });
    expect(back).toBeDisabled();
    expect(forward).toBeDisabled();

    await user.click(
      within(inspector).getByRole("button", {
        name: "Location: New Handeltown",
      }),
    );
    expect(
      within(inspector).getByRole("heading", { name: "New Handeltown" }),
    ).toBeInTheDocument();
    expect(back).toBeEnabled();
    expect(forward).toBeDisabled();

    await user.click(back);
    expect(
      within(inspector).getByRole("heading", {
        name: "2 - Bob Version 2.0",
      }),
    ).toBeInTheDocument();
    expect(forward).toBeEnabled();
    await user.click(forward);
    expect(
      within(inspector).getByRole("heading", { name: "New Handeltown" }),
    ).toBeInTheDocument();

    await user.click(back);
    await user.click(
      within(inspector).getByRole("button", {
        name: "Lead character: Bob",
      }),
    );
    expect(
      within(inspector).getByRole("heading", { name: "Bob" }),
    ).toBeInTheDocument();
    expect(forward).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "Book 1, 1 - Bob Version 1.0",
      }),
    );
    expect(
      within(inspector).getByRole("heading", {
        name: "1 - Bob Version 1.0",
      }),
    ).toBeInTheDocument();
    expect(back).toBeDisabled();
    expect(forward).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    expect(
      within(inspector).getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(back).toBeDisabled();
    expect(forward).toBeDisabled();
  });

  it("clears chapter inspection in Date mode while preserving eligible object selections", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Book 1, 2 - Bob Version 2.0",
      }),
    );
    expect(
      within(
        screen.getByRole("complementary", { name: "Object inspector" }),
      ).getByText("Book 1 · Chapter 2"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(
      await screen.findByText("Chapter inspection closed in Date mode."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select a map marker or browser item to inspect its reader-safe details.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Inspector history" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chapter mode" }));
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(
      screen.getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chapter mode" }));
    const search = screen.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await user.type(search, "alpha centauri");
    await user.click(screen.getByRole("button", { name: /Alpha Centauri/ }));
    expect(
      screen.getByRole("heading", { name: "Alpha Centauri" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(
      screen.getByRole("heading", { name: "Alpha Centauri" }),
    ).toBeInTheDocument();
  });

  it("cannot retain chapter detail after the spoiler ceiling is lowered past it", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: "Book 1, 2 - Bob Version 2.0",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Read through"), "1.1");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );

    expect(
      await screen.findByText(
        "Selection cleared because the object is not eligible in this view.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select a map marker or browser item to inspect its reader-safe details.",
      ),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("complementary", { name: "Object inspector" }),
      ).queryByText("Book 1 · Chapter 2"),
    ).not.toBeInTheDocument();
  });

  it("uses the shared chapter inspector in compact layout and returns focus on Escape", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 1199px)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.1",
        viewChapter: "1.1",
        displayDate: "2016",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Book 1, 1 - Bob Version 1.0",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Selected object",
    });
    expect(
      within(dialog).getByRole("heading", {
        name: "1 - Bob Version 1.0",
      }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Selected object" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Inspect selection" }),
      ).toHaveFocus(),
    );
  });

  it("generates at most one world for zero-state and date-mode transitions", async () => {
    const generate = vi.spyOn(narrativeModel, "generateNarrativeWorld");
    const user = userEvent.setup();
    render(<App />);
    let expectedCalls = generate.mock.calls.length;

    await user.selectOptions(screen.getByLabelText("Read through"), "1.2");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );
    expect(generate).toHaveBeenCalledTimes(++expectedCalls);

    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(generate).toHaveBeenCalledTimes(++expectedCalls);

    await user.click(screen.getByRole("button", { name: "Chapter mode" }));
    expect(generate).toHaveBeenCalledTimes(++expectedCalls);

    await user.selectOptions(screen.getByLabelText("Knowledge through"), "");
    expect(generate).toHaveBeenCalledTimes(expectedCalls + 1);
    expect(narrativeRuntimePreparationCount()).toBe(1);
  });

  it("keeps DOM navigation available when astronomy coverage is missing", () => {
    vi.spyOn(narrativeMap, "projectNarrativeMap").mockReturnValueOnce({
      knownSystemIds: new Set(),
      missingAstronomySystemIds: new Set(["missing-anchor"]),
      narrativeSystemIdsByAstronomyId: new Map(),
      activeSystemIds: new Set(),
      contextSystems: [],
    });

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Astronomy coverage unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/missing-anchor/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select a map marker or browser item to inspect its reader-safe details.",
      ),
    ).toBeInTheDocument();
  });

  it("uses fixed light-year presentation without unit or measurement controls", () => {
    render(<App />);
    expect(screen.queryByLabelText("Distance unit")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "pc" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ly" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("map-scale-label")).toHaveTextContent("ly");
    expect(
      screen.queryByRole("button", { name: "Measure" }),
    ).not.toBeInTheDocument();
  });

  it("always exposes the accessible text-only backdrop credit", () => {
    render(<App />);
    expect(
      screen.getByRole("link", {
        name: /Astronomy backdrop: NASA\/Goddard Space Flight Center/i,
      }),
    ).toHaveAttribute("href", "https://svs.gsfc.nasa.gov/4851/");
  });

  it("uses SVG type icons on group headings and SVG bullets on object rows", () => {
    const { container } = render(<App />);
    expect(
      container.querySelector(
        'svg.group-type-icon[data-icon-type="star-systems"]',
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        'svg.group-type-icon[data-icon-type="other-locations"]',
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector("svg[data-item-bullet]"),
    ).toBeInTheDocument();
  });

  it("temporarily expands search matches without overwriting saved collapse state", async () => {
    const user = userEvent.setup();
    render(<App />);
    const group = screen.getByRole("button", {
      name: /Other Locations, 31 visible/,
    });
    await user.click(group);
    expect(group).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", { name: "Earth" }),
    ).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await user.type(search, "earth");
    expect(group).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Earth" })).toBeInTheDocument();
    await user.clear(search);
    expect(group).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(
        JSON.parse(
          window.localStorage.getItem("bobiverse.app-state.v1") ?? "{}",
        ).browserGroups["other-locations"],
      ).toBe(false),
    );
  });

  it("exposes only in-context astronomy through a nonempty search and labels it as non-narrative", async () => {
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await user.type(search, "alpha centauri");
    expect(screen.getByText("Nearby astronomy")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Alpha Centauri/ }));
    expect(
      screen.getByText("Not story-known at this view"),
    ).toBeInTheDocument();
    await user.clear(search);
    expect(screen.queryByText("Nearby astronomy")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Alpha Centauri" }),
    ).toBeInTheDocument();
  });

  it("shows last-seen and unmapped details, then clears an ineligible selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Read through"), "1.2");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );

    const characters = screen
      .getByRole("button", { name: /Characters, 3 visible/ })
      .getAttribute("aria-controls");
    const characterList = document.getElementById(characters!);
    await user.click(
      within(characterList!).getByRole("button", { name: /^BobActive/ }),
    );
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    expect(within(inspector).getByText("Last seen")).toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "New Handeltown" }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Knowledge through"), "1.1");
    expect(
      await screen.findByText(
        "Selection cleared because the object is not eligible in this view.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select a map marker or browser item to inspect its reader-safe details.",
      ),
    ).toBeInTheDocument();
  });
});

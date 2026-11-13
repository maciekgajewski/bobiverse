import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dateContextMapHarness = vi.hoisted(() => ({
  stubStarMap: false,
}));

vi.mock("../../src/components/MapScene", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/components/MapScene")>();
  return {
    ...actual,
    StarMap: (props: Parameters<typeof actual.StarMap>[0]) => {
      if (!dateContextMapHarness.stubStarMap) {
        return <actual.StarMap {...props} />;
      }
      return (
        <button
          type="button"
          data-testid="star-map-deselect"
          onClick={() => props.onDeselect()}
        >
          Deselect map
        </button>
      );
    },
  };
});

import App from "../../src/App";
import * as narrativeMap from "../../src/narrative/map";
import * as narrativeModel from "../../src/narrative/model";
import { narrativeRuntimePreparationCount } from "../../src/narrative/runtime";
import * as systemView from "../../src/system-view";

// The desktop timeline dock and the top bar both expose a "Read through"
// select; these tests drive the dock's control unless they say otherwise.
const dockReadThrough = () =>
  screen.getByLabelText("Read through", { selector: "#desktop-read-through" });
const compactMatchMedia = (query: string) => ({
  matches: query === "(max-width: 1199px)",
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe("atlas shell", () => {
  afterEach(() => {
    dateContextMapHarness.stubStarMap = false;
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });
  beforeEach(() => {
    window.localStorage.clear();
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
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/WebGL unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("Astronomy systems")).not.toBeInTheDocument();
  });

  it("uses reader-visible system names while retaining astronomy search aliases", async () => {
    const user = userEvent.setup();
    render(<App />);

    const search = screen.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await user.type(search, "Sol");
    await user.click(screen.getByRole("button", { name: "Solar System" }));

    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    expect(
      within(inspector).getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByText("Astronomy preferred name"),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByText("Sol", { selector: "dd" }),
    ).toBeInTheDocument();
  });

  it("offers the canonical Solar System view through DOM controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(screen.getByRole("button", { name: "Enter system" }));
    expect(
      screen.getByRole("button", { name: "Star Map" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return to map" }),
    ).toBeInTheDocument();
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    await user.click(
      within(inspector).getByRole("button", {
        name: "Inspect component: Sol",
      }),
    );
    expect(
      within(inspector).getByRole("heading", { name: "Sol" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Star Map" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enter system" }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Enter system" }));
    await user.click(screen.getByRole("button", { name: "Return to map" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enter system" }),
      ).toBeInTheDocument(),
    );
  });

  it("announces why a system view closes after its projection becomes ineligible", async () => {
    const originalEntryResolver =
      systemView.systemViewEntryForNarrativeSelection;
    const entryResolver = vi
      .spyOn(systemView, "systemViewEntryForNarrativeSelection")
      .mockImplementation(originalEntryResolver);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(screen.getByRole("button", { name: "Enter system" }));

    entryResolver.mockReturnValue(null);
    await user.selectOptions(dockReadThrough(), "1.1");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Returned to the interstellar map because this system is no longer available.",
      ),
    );
    expect(
      screen.queryByRole("button", { name: "Return to map" }),
    ).not.toBeInTheDocument();
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
      "bobiverse.app-state.v2",
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

    await user.selectOptions(dockReadThrough(), "1.1");
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
    await user.selectOptions(dockReadThrough(), "1.1");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );

    expect(generate).toHaveBeenCalledTimes(afterInitialLoad + 1);
  });

  it("selects an unlocked timeline chapter for inspection without a second projection", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
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
      within(inspector).getByText("Book 1 · We Are Legion (We are Bob)"),
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
      "bobiverse.app-state.v2",
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
      "bobiverse.app-state.v2",
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
      ).getByText("Book 1 · We Are Legion (We are Bob)"),
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

  it.each(["chapter", "date"] as const)(
    "opens an ancestor birth chapter from %s mode without changing the spoiler ceiling",
    async (mode) => {
      window.localStorage.setItem(
        "bobiverse.app-state.v2",
        JSON.stringify({
          furthestChapterRead: "1.20",
          viewChapter: "1.20",
          displayDate: "2145-12",
          mode,
          timelineZoom: 1,
          timelinePan: 0,
        }),
      );
      const user = userEvent.setup();
      render(<App />);
      const search = screen.getByRole("searchbox", {
        name: "Search visible objects",
      });
      await user.type(search, "Garfield");
      await user.click(
        screen.getByRole("button", { name: /^Garfield(?:Active)?$/ }),
      );
      const inspector = screen.getByRole("complementary", {
        name: "Object inspector",
      });
      await user.click(
        within(inspector).getByRole("button", { name: "Lineage" }),
      );
      expect(
        within(inspector)
          .getByRole("button", {
            name: "Birth or cloning chapter for Bill: Chapter 1.17",
          })
          .closest(".ancestor-copy"),
      ).toHaveTextContent("Chapter 1.17 · 2145");
      await user.click(
        within(inspector).getByRole("button", {
          name: "Birth or cloning chapter for Bill: Chapter 1.17",
        }),
      );

      expect(
        within(inspector).getByText("Book 1 · We Are Legion (We are Bob)"),
      ).toBeInTheDocument();
      const stored = JSON.parse(
        window.localStorage.getItem("bobiverse.app-state.v2")!,
      ) as Record<string, unknown>;
      expect(stored).toMatchObject({
        furthestChapterRead: "1.20",
        viewChapter: "1.17",
        mode: "chapter",
      });
    },
  );

  it("keeps ancestor-name traversal in inspector Back and Forward history", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.20",
        viewChapter: "1.20",
        displayDate: "2145",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await user.type(search, "Garfield");
    await user.click(
      screen.getByRole("button", { name: /^Garfield(?:Active)?$/ }),
    );
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    await user.click(
      within(inspector).getByRole("button", { name: "Lineage" }),
    );
    await user.click(
      within(inspector).getByRole("button", { name: "Character: Bill" }),
    );
    expect(
      within(inspector).getByRole("heading", { name: "Bill" }),
    ).toBeInTheDocument();
    const back = within(inspector).getByRole("button", { name: "Back" });
    const forward = within(inspector).getByRole("button", { name: "Forward" });
    expect(back).toBeEnabled();
    await user.click(back);
    expect(
      within(inspector).getByRole("heading", { name: "Garfield" }),
    ).toBeInTheDocument();
    expect(forward).toBeEnabled();
    await user.click(forward);
    expect(
      within(inspector).getByRole("heading", { name: "Bill" }),
    ).toBeInTheDocument();
  });

  it("cannot retain chapter detail after the spoiler ceiling is lowered past it", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
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
    await user.selectOptions(dockReadThrough(), "1.1");
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
      ).queryByText("Book 1 · We Are Legion (We are Bob)"),
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
      "bobiverse.app-state.v2",
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
    // Compact panels are opened from the menu, so focus returns to it.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus(),
    );
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      within(screen.getByRole("dialog", { name: "Menu" })).getByRole("button", {
        name: "Inspect selection",
      }),
    ).toBeInTheDocument();
  });

  const seedDateProgress = () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133-06-24",
        mode: "date",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(640);
  };
  const dateDot = (date: string, chapter: string) =>
    screen.getByRole("button", {
      name: `Story state 1 of 1 · ${date} · revealed in Chapter ${chapter}`,
    });

  it("replaces details with the exact Date context without changing non-empty inspector history or progress", async () => {
    seedDateProgress();
    const user = userEvent.setup();
    render(<App />);
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(within(inspector).getByRole("button", { name: "Sol" }));
    await user.click(within(inspector).getByRole("button", { name: "Back" }));
    expect(
      within(inspector).getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "Forward" }),
    ).toBeEnabled();

    await user.click(dateDot("24 June 2133", "1.2"));
    expect(within(inspector).getByText("Date context")).toBeInTheDocument();
    expect(
      within(inspector).getByRole("heading", {
        name: "24 June 2133",
      }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByText("Chapter 1.2", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByRole("heading", { name: "Activity at this date" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).queryByRole("navigation", {
        name: "Inspector history",
      }),
    ).not.toBeInTheDocument();
    expect(dockReadThrough()).toHaveValue("1.2");

    // Dismiss without selecting an object: both the current entry and the
    // existing forward branch must survive, not merely an empty history.
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(
      within(inspector).getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "Back" }),
    ).toBeDisabled();
    expect(
      within(inspector).getByRole("button", { name: "Forward" }),
    ).toBeEnabled();
    await user.click(
      within(inspector).getByRole("button", { name: "Forward" }),
    );
    expect(
      within(inspector).getByRole("heading", { name: "Sol" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "Forward" }),
    ).toBeDisabled();
    await user.click(within(inspector).getByRole("button", { name: "Back" }));

    await user.click(dateDot("2016", "1.1"));
    expect(
      within(inspector).getByRole("heading", { name: "2016" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByText("Chapter 1.1", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(inspector).queryByRole("heading", {
        name: "24 June 2133",
      }),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem("bobiverse.app-state.v2")!),
    ).toMatchObject({
      furthestChapterRead: "1.2",
      viewChapter: "1.2",
      displayDate: "2016",
      mode: "date",
    });
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    expect(
      within(inspector).queryByText("Date context"),
    ).not.toBeInTheDocument();
    expect(
      within(inspector).getByRole("heading", { name: "Solar System" }),
    ).toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "Back" }),
    ).toBeDisabled();
    expect(
      within(inspector).getByRole("button", { name: "Forward" }),
    ).toBeDisabled();
    expect(dockReadThrough()).toHaveValue("1.2");
  });

  it("opens and reopens standalone Date context in the compact inspector", async () => {
    seedDateProgress();
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
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      screen.queryByRole("button", { name: "Inspect selection" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Timeline and progress" }),
    );
    const timeline = screen.getByRole("dialog", {
      name: "Timeline and progress",
    });
    await user.click(
      within(timeline).getByRole("button", {
        name: "Story state 1 of 1 · 24 June 2133 · revealed in Chapter 1.2",
      }),
    );
    const inspector = await screen.findByRole("dialog", {
      name: "Selected object",
    });
    expect(within(inspector).getByText("Date context")).toBeInTheDocument();
    expect(
      within(inspector).getByRole("heading", {
        name: "24 June 2133",
      }),
    ).toBeInTheDocument();
    expect(
      within(inspector).queryByRole("navigation", {
        name: "Inspector history",
      }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    const menu = screen.getByRole("button", { name: "Menu" });
    await waitFor(() => expect(menu).toHaveFocus());
    await user.click(menu);
    await user.click(screen.getByRole("button", { name: "Inspect selection" }));
    expect(
      within(screen.getByRole("dialog", { name: "Selected object" })).getByText(
        "Date context",
      ),
    ).toBeInTheDocument();
  });

  it("clears Date context and retained selection/history when the map deselects", async () => {
    seedDateProgress();
    dateContextMapHarness.stubStarMap = true;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((
      type: string,
    ) =>
      type === "webgl" || type === "webgl2"
        ? ({} as RenderingContext)
        : null) as typeof HTMLCanvasElement.prototype.getContext);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId("star-map-deselect");
    const inspector = screen.getByRole("complementary", {
      name: "Object inspector",
    });
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(within(inspector).getByRole("button", { name: "Sol" }));
    expect(
      within(inspector).getByRole("button", { name: "Back" }),
    ).toBeEnabled();
    await user.click(dateDot("24 June 2133", "1.2"));
    expect(within(inspector).getByText("Date context")).toBeInTheDocument();
    await user.click(screen.getByTestId("star-map-deselect"));
    expect(
      within(inspector).queryByText("Date context"),
    ).not.toBeInTheDocument();
    expect(
      within(inspector).getByText(
        "Select a map marker or browser item to inspect its reader-safe details.",
      ),
    ).toBeInTheDocument();
    expect(
      within(inspector).queryByRole("navigation", {
        name: "Inspector history",
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    expect(
      within(inspector).getByRole("button", { name: "Back" }),
    ).toBeDisabled();
    expect(
      within(inspector).getByRole("button", { name: "Forward" }),
    ).toBeDisabled();
    expect(dockReadThrough()).toHaveValue("1.2");
  });

  it("does not persist active Date context on reload or resurrect it after Date-mode exit", async () => {
    seedDateProgress();
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(dateDot("2016", "1.1"));
    expect(screen.getByRole("heading", { name: "2016" })).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem("bobiverse.app-state.v2")!),
    ).toMatchObject({
      furthestChapterRead: "1.2",
      viewChapter: "1.2",
      displayDate: "2016",
      mode: "date",
    });
    // Reload while the Date context is still active, not after dismissing it.
    view.unmount();
    render(<App />);
    expect(screen.getByRole("button", { name: "Date mode" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(dateDot("2016", "1.1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Date context")).not.toBeInTheDocument();
    await user.click(dateDot("2016", "1.1"));
    expect(screen.getByText("Date context")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chapter mode" }));
    expect(screen.queryByText("Date context")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem("bobiverse.app-state.v2")!),
    ).toMatchObject({
      furthestChapterRead: "1.2",
      viewChapter: "1.2",
      displayDate: "2133-06-24",
      mode: "chapter",
    });
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(screen.queryByText("Date context")).not.toBeInTheDocument();
    await user.click(dateDot("24 June 2133", "1.2"));
    await user.click(screen.getByRole("button", { name: "Chapter mode" }));
    await user.click(screen.getByRole("button", { name: "Date mode" }));
    expect(dateDot("24 June 2133", "1.2")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("Date context")).not.toBeInTheDocument();
    expect(dockReadThrough()).toHaveValue("1.2");
  });

  it("generates at most one world for zero-state and date-mode transitions", async () => {
    const generate = vi.spyOn(narrativeModel, "generateNarrativeWorld");
    const user = userEvent.setup();
    render(<App />);
    let expectedCalls = generate.mock.calls.length;

    await user.selectOptions(dockReadThrough(), "1.2");
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
      systemStatuses: new Map(),
      contextSystems: [],
      astronomySearchAliasesByNarrativeId: new Map(),
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

  it("exposes the accessible text-only backdrop credit from the astronomy notice", async () => {
    const user = userEvent.setup();
    render(<App />);
    const chip = screen.getByRole("button", {
      name: /^Astronomy data credits:\s*NASA\/GSFC SVS\s·\sESA\/Gaia\/DPAC$/,
    });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-expanded", "true");
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
    const humanRow = screen.getByRole("button", { name: "Human" });
    expect(humanRow.querySelector("[data-species-item-bullet]")).toHaveStyle({
      backgroundColor: "#4DD9FF",
    });
    expect(
      humanRow.querySelector("[data-item-bullet]"),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Solar System" })
        .querySelector("[data-item-bullet]"),
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
          window.localStorage.getItem("bobiverse.app-state.v2") ?? "{}",
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
    await user.type(search, "proxima centauri");
    expect(screen.getByText("Nearby astronomy")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Alpha Centauri/ }),
    ).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "HD 128620");
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
    await user.selectOptions(dockReadThrough(), "1.2");
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
  it("confirms a top-bar Read through choice before revealing and keeps the dock in step", async () => {
    const user = userEvent.setup();
    render(<App />);
    const topbar = screen.getByLabelText("Read through", {
      selector: "#topbar-read-through",
    });
    await user.selectOptions(topbar, "1.1");
    const confirmation = screen.getByRole("dialog", {
      name: "Confirm read progress",
    });
    expect(
      within(confirmation).getByRole("button", {
        name: "Confirm read through",
      }),
    ).toHaveFocus();
    expect(dockReadThrough()).toHaveValue("");
    await user.click(
      within(confirmation).getByRole("button", { name: "Cancel" }),
    );
    expect(topbar).toHaveValue("");
    await waitFor(() => expect(topbar).toHaveFocus());

    await user.selectOptions(topbar, "1.1");
    await user.click(
      screen.getByRole("button", { name: "Confirm read through" }),
    );
    expect(topbar).toHaveValue("1.1");
    expect(dockReadThrough()).toHaveValue("1.1");
    expect(
      screen.queryByRole("dialog", { name: "Confirm read progress" }),
    ).not.toBeInTheDocument();
  });

  it("opens compact commands from the menu drawer and returns focus to the menu", async () => {
    vi.stubGlobal("matchMedia", compactMatchMedia);
    const user = userEvent.setup();
    render(<App />);
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await user.click(menu);
    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(within(drawer).getByRole("button", { name: "Close" })).toHaveFocus();
    expect(within(drawer).getByLabelText("Knowledge through")).toBeDisabled();
    expect(
      within(drawer).getByRole("button", { name: "Chapter mode" }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const name of [
      "Browse objects",
      "Timeline and progress",
      "Reset view",
    ]) {
      expect(within(drawer).getByRole("button", { name })).toBeEnabled();
    }
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Menu" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(menu).toHaveFocus());

    await user.click(menu);
    await user.click(screen.getByRole("button", { name: "Browse objects" }));
    expect(
      screen.getByRole("dialog", { name: "Object browser" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Menu" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(menu).toHaveFocus());

    await user.click(menu);
    await user.click(screen.getByRole("button", { name: "Browse objects" }));
    await user.click(document.querySelector(".compact-panel-backdrop")!);
    expect(
      screen.queryByRole("dialog", { name: "Object browser" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(menu).toHaveFocus());

    await user.click(menu);
    await user.click(
      screen.getByRole("button", { name: "Timeline and progress" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Timeline and progress" }),
    ).toBeInTheDocument();
    await user.click(document.querySelector(".compact-panel-backdrop")!);
    expect(
      screen.queryByRole("dialog", { name: "Timeline and progress" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(menu).toHaveFocus());

    await user.click(menu);
    await user.click(
      within(screen.getByRole("dialog", { name: "Menu" })).getByRole("button", {
        name: "Reset view",
      }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Menu" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(menu).toHaveFocus());
  });

  it("keeps Knowledge through in the compact menu in Date mode", async () => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
    vi.stubGlobal("matchMedia", compactMatchMedia);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    let drawer = screen.getByRole("dialog", { name: "Menu" });
    await user.click(within(drawer).getByRole("button", { name: "Date mode" }));
    if (!screen.queryByRole("dialog", { name: "Menu" })) {
      await user.click(screen.getByRole("button", { name: "Menu" }));
    }
    drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(
      within(drawer).getByRole("button", { name: "Date mode" }),
    ).toHaveAttribute("aria-pressed", "true");
    const knowledge = within(drawer).getByLabelText("Knowledge through");
    expect(knowledge).toBeEnabled();
    expect(knowledge).toHaveValue("1.2");
    await user.selectOptions(knowledge, "1.1");
    expect(knowledge).toHaveValue("1.1");
    expect(
      within(drawer).getByRole("button", { name: "Chapter mode" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("puts Reset view on the map as one labelled icon control", async () => {
    const user = userEvent.setup();
    render(<App />);
    const map = screen.getByRole("region", {
      name: "Interactive three dimensional nearby stellar-system map",
    });
    const reset = within(map).getByRole("button", { name: "Reset view" });
    expect(reset).toBeEnabled();
    expect(reset.querySelector("svg.reset-view-icon")).toBeInTheDocument();
    expect(reset).not.toHaveTextContent("Reset view");
    expect(screen.getAllByRole("button", { name: "Reset view" })).toHaveLength(
      1,
    );
    expect(
      within(document.querySelector<HTMLElement>(".topbar")!).queryByRole(
        "button",
        {
          name: "Reset view",
        },
      ),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /^Solar System(?:Active)?$/ }),
    );
    await user.click(screen.getByRole("button", { name: "Enter system" }));
    expect(reset).toBeDisabled();
  });

  it("closes the expanded astronomy notice with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    const chip = screen.getByRole("button", {
      name: /^Astronomy data credits:\s*NASA\/GSFC SVS\s·\sESA\/Gaia\/DPAC$/,
    });
    expect(chip).not.toHaveAttribute("aria-controls");
    await user.click(chip);
    const card = screen.getByRole("region", { name: "Astronomy data credits" });
    expect(chip).toHaveAttribute("aria-controls", card.id);
    expect(card).toHaveTextContent(/mission Gaia/);
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("region", { name: "Astronomy data credits" }),
    ).not.toBeInTheDocument();
    expect(chip).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(chip).toHaveFocus());
  });
});

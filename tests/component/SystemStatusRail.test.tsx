import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusRail, SystemStatusTooltip } from "../../src/components/MapScene";

const humanPresentation = {
  styleId: "human",
  iconPath: "/human.svg",
  colour: "#fff",
  displayName: "Human",
};

afterEach(cleanup);

describe("system status rail", () => {
  it("renders role, overflow, and standalone status text with decorative icons", () => {
    render(
      <StatusRail
        status={{
          pairs: [{ speciesId: "species:human", role: "inhabited_homeworld" }],
          overflowCount: 2,
          possibleColonyTarget: true,
          neutralProminentInstallation: true,
        }}
        speciesPresentations={new Map([["species:human", humanPresentation]])}
      />,
    );
    expect(
      screen.getByRole("group", { name: "System status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "species:human: inhabited homeworld",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "2 additional species statuses" }),
    ).toHaveTextContent("+2");
    expect(
      screen.getByRole("img", { name: "Possible colony target" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Prominent installation" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(4);
    const pair = screen.getByRole("img", {
      name: "species:human: inhabited homeworld",
    });
    const glyphs = pair.querySelectorAll(".system-status-glyph");
    expect(glyphs).toHaveLength(2);
    expect(glyphs[0]).toHaveStyle({
      backgroundColor: "#fff",
      maskImage: 'url("/human.svg")',
    });
    expect(glyphs[1]).toHaveStyle({
      maskImage: 'url("/assets/system-markers/homeworld.svg")',
    });
  });

  it("renders each visible status as one labelled tooltip row", () => {
    render(
      <SystemStatusTooltip
        status={{
          pairs: [{ speciesId: "species:human", role: "inhabited_homeworld" }],
          overflowCount: 1,
          possibleColonyTarget: true,
          neutralProminentInstallation: false,
        }}
        speciesPresentations={
          new Map([
            ["species:human", humanPresentation],
            [
              "species:other",
              { ...humanPresentation, displayName: "Other", colour: "#abc" },
            ],
          ])
        }
      />,
    );
    expect(
      screen.getByRole("img", { name: "Human homeworld" }),
    ).toHaveTextContent("Human homeworld");
    expect(screen.queryByRole("img", { name: "Other colony" })).toBeNull();
    expect(
      screen.getByRole("img", { name: "Possible colony target" }),
    ).toHaveTextContent("Possible colony target");
  });

  it("uses the bordered rail itself as the expanded tooltip surface", () => {
    const status = {
      pairs: [
        {
          speciesId: "species:human",
          role: "inhabited_homeworld" as const,
        },
      ],
      overflowCount: 0,
      possibleColonyTarget: false,
      neutralProminentInstallation: false,
    };
    render(
      <StatusRail
        status={status}
        speciesPresentations={new Map([["species:human", humanPresentation]])}
        expanded
        expandedContent={
          <div className="map-tooltip">
            <div className="map-tooltip-header">Solar System</div>
            <SystemStatusTooltip
              status={status}
              speciesPresentations={
                new Map([["species:human", humanPresentation]])
              }
            />
          </div>
        }
      />,
    );

    const rail = screen.getByRole("group", { name: "System status" });
    expect(rail).toHaveClass("system-status-rail", "expanded");
    expect(rail).toHaveTextContent("Solar System");
    expect(rail).toHaveTextContent("Human homeworld");
    expect(
      screen.queryByRole("img", {
        name: "species:human: inhabited homeworld",
      }),
    ).toBeNull();
  });
});

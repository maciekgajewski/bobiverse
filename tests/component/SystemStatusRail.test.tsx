import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusRail } from "../../src/components/MapScene";

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
        speciesPresentations={
          new Map([
            [
              "species:human",
              { styleId: "human", iconPath: "/human.svg", colour: "#fff" },
            ],
          ])
        }
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
});

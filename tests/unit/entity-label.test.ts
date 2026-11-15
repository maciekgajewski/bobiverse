import { describe, expect, it } from "vitest";
import {
  disambiguatedAdjacentLabels,
  disambiguatedEntityLabel,
} from "../../src/narrative/entity-label";

describe("disambiguatedEntityLabel", () => {
  const system = {
    name: "Epsilon Eridani",
    entity_type: "location",
    kind: "star_system",
  };
  const star = {
    name: "Epsilon Eridani",
    entity_type: "location",
    kind: "star",
  };
  const skunkworks = {
    name: "Bill's skunkworks",
    entity_type: "location",
    kind: "locale",
  };
  const sol = {
    name: "Sol",
    entity_type: "location",
    kind: "star",
  };

  it("qualifies a same-named primary star in a system's Contains list", () => {
    expect(disambiguatedEntityLabel(star, "Epsilon Eridani")).toBe(
      "Epsilon Eridani (star)",
    );
  });

  it("qualifies the parent system when inspecting that star", () => {
    expect(disambiguatedEntityLabel(system, "Epsilon Eridani")).toBe(
      "Epsilon Eridani (star system)",
    );
  });

  it("leaves uniquely named children unqualified", () => {
    expect(disambiguatedEntityLabel(skunkworks, "Epsilon Eridani")).toBe(
      "Bill's skunkworks",
    );
    expect(disambiguatedEntityLabel(sol, "Solar System")).toBe("Sol");
  });

  it("leaves the bare name when there is no current name or kind", () => {
    expect(disambiguatedEntityLabel(star, undefined)).toBe("Epsilon Eridani");
    expect(
      disambiguatedEntityLabel(
        { name: "Epsilon Eridani", entity_type: "location" },
        "Epsilon Eridani",
      ),
    ).toBe("Epsilon Eridani");
  });

  it("qualifies adjacent same-named crumbs on both sides, including the last", () => {
    expect(disambiguatedAdjacentLabels([system, star])).toEqual([
      "Epsilon Eridani (star system)",
      "Epsilon Eridani (star)",
    ]);
  });

  it("leaves a single crumb and uniquely named neighbours unqualified", () => {
    expect(disambiguatedAdjacentLabels([system])).toEqual(["Epsilon Eridani"]);
    expect(disambiguatedAdjacentLabels([system, star, skunkworks])).toEqual([
      "Epsilon Eridani (star system)",
      "Epsilon Eridani (star)",
      "Bill's skunkworks",
    ]);
    expect(
      disambiguatedAdjacentLabels([
        { name: "Solar System", entity_type: "location", kind: "star_system" },
        sol,
        { name: "Earth", entity_type: "location", kind: "planet" },
      ]),
    ).toEqual(["Solar System", "Sol", "Earth"]);
  });

  it("leaves same-named crumbs bare when a kind is missing", () => {
    expect(
      disambiguatedAdjacentLabels([
        {
          name: "Epsilon Eridani",
          entity_type: "location",
          kind: "star_system",
        },
        { name: "Epsilon Eridani", entity_type: "location" },
      ]),
    ).toEqual(["Epsilon Eridani (star system)", "Epsilon Eridani"]);
  });
});

import { describe, expect, it } from "vitest";
import { disambiguatedEntityLabel } from "../../src/narrative/entity-label";

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
});

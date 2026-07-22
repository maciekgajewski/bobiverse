import { describe, expect, it } from "vitest";
import { nearbySystems, validateNearbySystems } from "../../src/domain/data";

describe("nearby-system runtime data", () => {
  it("contains the expected offline map marker count", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    expect(nearbySystems.systems).toHaveLength(21);
    expect(
      nearbySystems.systems.filter((system) => system.id !== "sol"),
    ).toHaveLength(20);
  });

  it("rejects altered render coordinates rather than treating scene values as truth", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const altered = structuredClone(nearbySystems);
    altered.systems[1].render_position.x += 0.1;
    expect(() => validateNearbySystems(altered)).toThrow(
      "Render mapping mismatch",
    );
  });

  it("keeps reviewed CNS5 distance fixtures stable after transformation", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const barnard = nearbySystems.systems.find(
      (system) => system.id === "barnards-star",
    );
    const sirius = nearbySystems.systems.find(
      (system) => system.id === "sirius",
    );
    expect(barnard?.distance_from_sol_pc).toBeCloseTo(1.828072732906, 10);
    expect(sirius?.distance_from_sol_pc).toBeCloseTo(2.67015145977, 10);
  });

  it("requires sourced visual properties for every rendered component", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    for (const system of nearbySystems.systems) {
      for (const component of system.components) {
        expect(component.visual.radius_solar).toBeGreaterThan(0);
        expect(component.visual.spectral_class).not.toEqual("");
        expect(component.visual.provenance.radius.catalogue).not.toEqual("");
        expect(
          component.visual.provenance.spectral_class.catalogue,
        ).not.toEqual("");
      }
    }
    expect(nearbySystems.systems[0]?.components).toMatchObject([
      { id: "solar:sol", visual: { spectral_class: "G2V", radius_solar: 1 } },
    ]);
  });
});

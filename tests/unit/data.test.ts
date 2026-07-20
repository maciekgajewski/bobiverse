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
});

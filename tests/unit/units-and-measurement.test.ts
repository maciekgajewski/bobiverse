import { describe, expect, it } from "vitest";
import { nearbySystems } from "../../src/domain/data";
import { measurementDistancePc } from "../../src/domain/measurement";
import {
  LIGHT_YEARS_PER_PARSEC,
  convertParsecs,
  formatDistance,
} from "../../src/domain/units";

describe("units and system measurement", () => {
  it("converts presentation values without changing canonical pc", () => {
    expect(convertParsecs(1, "ly")).toBe(LIGHT_YEARS_PER_PARSEC);
    expect(convertParsecs(1, "pc")).toBe(1);
    expect(formatDistance(1, "ly")).toBe("3.26 ly");
  });

  it("calculates an actual system separation from canonical positions", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const sol = nearbySystems.systems.find((system) => system.id === "sol");
    const alpha = nearbySystems.systems.find(
      (system) => system.id === "alpha-centauri",
    );
    expect(measurementDistancePc(sol, alpha)).toBeCloseTo(
      alpha?.distance_from_sol_pc ?? 0,
      10,
    );
  });
});

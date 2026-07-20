import { describe, expect, it } from "vitest";
import { nearbySystems } from "../../src/domain/data";
import { measurementDistancePc } from "../../src/domain/measurement";
import {
  LIGHT_YEARS_PER_PARSEC,
  calculateMapScale,
  convertParsecs,
  formatDistance,
  niceScaleDistance,
} from "../../src/domain/units";

describe("units and system measurement", () => {
  it("converts presentation values without changing canonical pc", () => {
    expect(convertParsecs(1, "ly")).toBe(LIGHT_YEARS_PER_PARSEC);
    expect(convertParsecs(1, "pc")).toBe(1);
    expect(formatDistance(1, "ly")).toBe("3.26 ly");
  });

  it("uses readable 1–2–5 scale distances", () => {
    expect(niceScaleDistance(0.73)).toBe(1);
    expect(niceScaleDistance(2.01)).toBe(5);
    expect(niceScaleDistance(36)).toBe(50);
  });

  it("adapts the map ruler's physical value and pixel width as camera width changes", () => {
    expect(calculateMapScale(10, 400, "pc")).toEqual({
      displayDistance: 2,
      pixelWidth: 80,
    });
    expect(calculateMapScale(20, 400, "pc")).toEqual({
      displayDistance: 5,
      pixelWidth: 100,
    });
    expect(calculateMapScale(12, 400, "pc")).toEqual({
      displayDistance: 5,
      pixelWidth: 167,
    });
    expect(calculateMapScale(10, 400, "ly").displayDistance).toBe(10);
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

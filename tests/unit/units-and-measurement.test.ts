import { describe, expect, it } from "vitest";
import { nearbySystems } from "../../src/domain/data";
import { measurementDistancePc } from "../../src/domain/measurement";
import {
  LIGHT_YEARS_PER_PARSEC,
  calculateMapScale,
  convertParsecsToLightYears,
  formatDistance,
  niceScaleDistance,
} from "../../src/domain/units";

describe("units and system measurement", () => {
  it("converts canonical parsecs to the fixed light-year presentation", () => {
    expect(convertParsecsToLightYears(1)).toBe(LIGHT_YEARS_PER_PARSEC);
    expect(formatDistance(1)).toBe("3.26 ly");
  });

  it("uses readable 1–2–5 scale distances", () => {
    expect(niceScaleDistance(0.73)).toBe(1);
    expect(niceScaleDistance(2.01)).toBe(5);
    expect(niceScaleDistance(36)).toBe(50);
  });

  it("adapts the map ruler's physical value and pixel width as camera width changes", () => {
    expect(calculateMapScale(10, 400)).toEqual({
      displayDistance: 10,
      pixelWidth: 123,
    });
    expect(calculateMapScale(20, 400)).toEqual({
      displayDistance: 20,
      pixelWidth: 123,
    });
    expect(calculateMapScale(12, 400)).toEqual({
      displayDistance: 10,
      pixelWidth: 102,
    });
  });

  it("calculates an actual system separation from canonical positions", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const sol = nearbySystems.systems.find((system) => system.id === "sol");
    const alpha = nearbySystems.systems.find(
      (system) => system.id === "stellar-system-005413",
    );
    expect(sol).toBeDefined();
    expect(alpha).toBeDefined();
    expect(alpha?.distance_from_sol_pc).toBeGreaterThan(1);
    expect(measurementDistancePc(sol, alpha)).toBeCloseTo(
      alpha!.distance_from_sol_pc,
      10,
    );
  });
});

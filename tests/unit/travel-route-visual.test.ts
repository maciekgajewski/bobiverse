import { describe, expect, it } from "vitest";
import {
  advanceTravelPulseOffset,
  travelRouteOpacity,
} from "../../src/domain/travel-route-visual";

describe("travel route presentation", () => {
  it("advances pulses from departure toward arrival without React state", () => {
    expect(advanceTravelPulseOffset(0, 0.5, false)).toBeLessThan(0);
    expect(advanceTravelPulseOffset(-1, 0.5, false)).toBeLessThan(-1);
  });

  it("freezes pulse motion for reduced-motion presentation", () => {
    expect(advanceTravelPulseOffset(-0.4, 2, true)).toBe(-0.4);
  });

  it("keeps newer route beams monotonically brighter", () => {
    expect(travelRouteOpacity(0)).toBeLessThan(travelRouteOpacity(0.5));
    expect(travelRouteOpacity(0.5)).toBeLessThan(travelRouteOpacity(1));
  });
});

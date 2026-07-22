import { describe, expect, it } from "vitest";
import {
  FOCUS_DURATION_MAX_MS,
  FOCUS_DURATION_MIN_MS,
  easeInOutQuad,
  focusDurationMs,
} from "../../src/domain/camera-motion";

describe("camera focus motion", () => {
  it("uses a distance-aware duration within the approved bounds", () => {
    expect(focusDurationMs(0)).toBe(FOCUS_DURATION_MIN_MS);
    expect(focusDurationMs(5)).toBe(575);
    expect(focusDurationMs(100)).toBe(FOCUS_DURATION_MAX_MS);
  });

  it("uses a bounded ease-in-out curve", () => {
    expect(easeInOutQuad(-1)).toBe(0);
    expect(easeInOutQuad(0.5)).toBe(0.5);
    expect(easeInOutQuad(2)).toBe(1);
    expect(easeInOutQuad(0.25)).toBeLessThan(0.25);
    expect(easeInOutQuad(0.75)).toBeGreaterThan(0.75);
  });
});

import { describe, expect, it } from "vitest";
import {
  FOCUS_DURATION_MAX_MS,
  FOCUS_DURATION_MIN_MS,
  easeInOutQuad,
  focusDurationMs,
  perspectiveWorldWidthAtTarget,
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

  it("keeps scale tied to the live controls target through pan and deselection", () => {
    const defaultCamera = { x: 10.5, y: 8, z: 12 };
    const origin = { x: 0, y: 0, z: 0 };
    const groombridgeTarget = {
      x: -1.517742782184,
      y: -1.12710608953,
      z: -3.01892951699,
    };
    const focusedCamera = {
      x: defaultCamera.x + groombridgeTarget.x,
      y: defaultCamera.y + groombridgeTarget.y,
      z: defaultCamera.z + groombridgeTarget.z,
    };
    const initialWidth = perspectiveWorldWidthAtTarget(
      defaultCamera,
      origin,
      47,
      16 / 9,
    );
    const widthAfterFocusAndDeselect = perspectiveWorldWidthAtTarget(
      focusedCamera,
      groombridgeTarget,
      47,
      16 / 9,
    );
    const pan = { x: 2, y: -1, z: 0.5 };
    const widthAfterPan = perspectiveWorldWidthAtTarget(
      {
        x: focusedCamera.x + pan.x,
        y: focusedCamera.y + pan.y,
        z: focusedCamera.z + pan.z,
      },
      {
        x: groombridgeTarget.x + pan.x,
        y: groombridgeTarget.y + pan.y,
        z: groombridgeTarget.z + pan.z,
      },
      47,
      16 / 9,
    );
    expect(widthAfterFocusAndDeselect).toBeCloseTo(initialWidth, 12);
    expect(widthAfterPan).toBeCloseTo(initialWidth, 12);
  });
});

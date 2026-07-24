import { describe, expect, it } from "vitest";
import {
  INITIAL_CAMERA_FRAME_MARGIN,
  cameraPositionForFraming,
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

  it("fits all known systems within the initial screen-edge margin", async () => {
    const { nearbySystems } = await import("../../src/domain/data");
    const direction = { x: 10.5, y: 8, z: 12 };
    const camera = cameraPositionForFraming(
      nearbySystems!.systems.map((system) => system.render_position),
      direction,
      47,
      16 / 9,
    );
    const distance = Math.hypot(camera.x, camera.y, camera.z);
    const normalizedDirection = {
      x: direction.x / Math.hypot(direction.x, direction.y, direction.z),
      y: direction.y / Math.hypot(direction.x, direction.y, direction.z),
      z: direction.z / Math.hypot(direction.x, direction.y, direction.z),
    };
    const forward = {
      x: -normalizedDirection.x,
      y: -normalizedDirection.y,
      z: -normalizedDirection.z,
    };
    const unnormalizedRight = {
      x: -forward.z,
      y: 0,
      z: forward.x,
    };
    const rightLength = Math.hypot(
      unnormalizedRight.x,
      unnormalizedRight.y,
      unnormalizedRight.z,
    );
    const right = {
      x: unnormalizedRight.x / rightLength,
      y: unnormalizedRight.y / rightLength,
      z: unnormalizedRight.z / rightLength,
    };
    const up = {
      x: right.y * forward.z - right.z * forward.y,
      y: right.z * forward.x - right.x * forward.z,
      z: right.x * forward.y - right.y * forward.x,
    };
    const verticalLimit = Math.tan((47 * Math.PI) / 360);
    const horizontalLimit = verticalLimit * (16 / 9);
    const safeNdcLimit = 1 - 2 * INITIAL_CAMERA_FRAME_MARGIN;

    for (const { render_position: point } of nearbySystems!.systems) {
      const alongDirection =
        point.x * normalizedDirection.x +
        point.y * normalizedDirection.y +
        point.z * normalizedDirection.z;
      const depth = distance - alongDirection;
      const horizontal =
        (point.x * right.x + point.y * right.y + point.z * right.z) /
        (depth * horizontalLimit);
      const vertical =
        (point.x * up.x + point.y * up.y + point.z * up.z) /
        (depth * verticalLimit);
      expect(Math.abs(horizontal)).toBeLessThanOrEqual(safeNdcLimit + 1e-12);
      expect(Math.abs(vertical)).toBeLessThanOrEqual(safeNdcLimit + 1e-12);
    }
  });
});

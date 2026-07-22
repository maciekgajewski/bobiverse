import { describe, expect, it } from "vitest";
import {
  GALACTIC_PLANE_SCENE_ROTATION,
  euclideanDistancePc,
  toRenderPosition,
} from "../../src/domain/coordinates";

describe("canonical Galactic coordinate mapping", () => {
  it("maps known Galactic axes into the documented right-handed Three.js axes", () => {
    expect(toRenderPosition({ xg: 1, yg: 0, zg: 0 })).toEqual({
      x: 1,
      y: 0,
      z: -0,
    });
    expect(toRenderPosition({ xg: 0, yg: 1, zg: 0 })).toEqual({
      x: 0,
      y: 0,
      z: -1,
    });
    expect(toRenderPosition({ xg: 0, yg: 0, zg: 1 })).toEqual({
      x: 0,
      y: 1,
      z: -0,
    });
  });

  it("measures solely in canonical coordinates", () => {
    expect(
      euclideanDistancePc({ xg: 0, yg: 0, zg: 0 }, { xg: 3, yg: 4, zg: 12 }),
    ).toBe(13);
  });

  it("keeps the Galactic Zg=0 plane in GridHelper's default scene X/Z plane", () => {
    expect(GALACTIC_PLANE_SCENE_ROTATION).toEqual([0, 0, 0]);
    expect(toRenderPosition({ xg: 4, yg: -7, zg: 0 }).y).toBe(0);
  });
});

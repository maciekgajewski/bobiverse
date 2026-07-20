import { describe, expect, it } from "vitest";
import {
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
});

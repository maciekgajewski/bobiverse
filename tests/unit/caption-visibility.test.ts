import { describe, expect, it } from "vitest";
import {
  CAPTION_MIN_OPACITY,
  resolveCaptionOpacities,
} from "../../src/domain/caption-visibility";

const candidate = (
  id: string,
  x: number,
  depth: number,
  priority = 0,
  visible = true,
) => ({ id, priority, x, y: 100, depth, visible });

describe("caption collision opacity", () => {
  it("keeps non-overlapping captions fully opaque and excludes out-of-frustum candidates", () => {
    const opacities = resolveCaptionOpacities([
      candidate("near", 100, -0.5),
      candidate("separate", 300, 0.5),
      candidate("outside", 500, 0, 0, false),
    ]);

    expect([...opacities]).toEqual([
      ["near", 1],
      ["separate", 1],
    ]);
    expect(opacities.has("outside")).toBe(false);
  });

  it("fades connected overlap groups by deterministic camera-depth rank", () => {
    const opacities = resolveCaptionOpacities([
      candidate("fourth", 400, 0.8),
      candidate("third", 300, 0.4),
      candidate("second", 200, 0),
      candidate("nearest", 100, -0.4),
    ]);

    expect(opacities.get("nearest")).toBe(1);
    expect(opacities.get("second")).toBe(0.65);
    expect(opacities.get("third")).toBe(CAPTION_MIN_OPACITY);
    expect(opacities.get("fourth")).toBe(CAPTION_MIN_OPACITY);
  });

  it("uses stable IDs to break equal-depth ties", () => {
    const opacities = resolveCaptionOpacities([
      candidate("zeta", 110, 0),
      candidate("alpha", 100, 0),
    ]);

    expect(opacities.get("alpha")).toBe(1);
    expect(opacities.get("zeta")).toBe(0.65);
  });

  it("combines transitive overlaps with selected, hovered, and active slots", () => {
    const opacities = resolveCaptionOpacities([
      candidate("nearest-ordinary", 100, -0.8),
      candidate("active", 200, -0.4, 1),
      candidate("hovered", 300, 0, 2),
      candidate("selected", 400, 0.4, 3),
      candidate("deep-ordinary", 500, 0.8),
    ]);

    expect([...opacities]).toEqual([
      ["nearest-ordinary", 1],
      ["active", 1],
      ["hovered", CAPTION_MIN_OPACITY],
      ["selected", 1],
      ["deep-ordinary", CAPTION_MIN_OPACITY],
    ]);
  });
});

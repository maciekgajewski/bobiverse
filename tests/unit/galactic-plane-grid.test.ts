import { describe, expect, it } from "vitest";
import {
  GALACTIC_GRID_AXIS_STRENGTH,
  GALACTIC_GRID_FADE_END,
  GALACTIC_GRID_FADE_START,
  GALACTIC_GRID_GRAZING_FADE_END,
  GALACTIC_GRID_GRAZING_FADE_START,
  GALACTIC_GRID_LINE_STRENGTH,
  galacticGridOpacityAtGrazingAngle,
  galacticGridOpacityAtPlanarDistance,
} from "../../src/domain/galactic-plane-grid";
import { GALACTIC_GRID_MATERIAL_SIDE } from "../../src/components/GalacticPlaneGrid";
import { DoubleSide } from "three";

describe("Galactic-plane grid distance fade", () => {
  it("renders both the upper and lower Galactic-plane faces", () => {
    expect(GALACTIC_GRID_MATERIAL_SIDE).toBe(DoubleSide);
  });

  it("is fully visible close to the camera and absent at the far boundary", () => {
    expect(galacticGridOpacityAtPlanarDistance(0)).toBe(1);
    expect(galacticGridOpacityAtPlanarDistance(GALACTIC_GRID_FADE_START)).toBe(
      1,
    );
    expect(galacticGridOpacityAtPlanarDistance(GALACTIC_GRID_FADE_END)).toBe(0);
    expect(
      galacticGridOpacityAtPlanarDistance(GALACTIC_GRID_FADE_END + 10),
    ).toBe(0);
  });

  it("smoothly fades only across the documented planar distance range", () => {
    const midpoint = (GALACTIC_GRID_FADE_START + GALACTIC_GRID_FADE_END) / 2;
    expect(galacticGridOpacityAtPlanarDistance(midpoint)).toBeCloseTo(0.5);
    expect(galacticGridOpacityAtPlanarDistance(midpoint - 2)).toBeGreaterThan(
      galacticGridOpacityAtPlanarDistance(midpoint + 2),
    );
  });

  it("uses whisper-strength ordinary lines and restrained axes", () => {
    expect(GALACTIC_GRID_LINE_STRENGTH).toBe(0.17);
    expect(GALACTIC_GRID_AXIS_STRENGTH).toBe(0.26);
    expect(GALACTIC_GRID_LINE_STRENGTH).toBeLessThan(
      GALACTIC_GRID_AXIS_STRENGTH,
    );
  });

  it("smoothly suppresses grazing views in either Galactic hemisphere", () => {
    expect(
      galacticGridOpacityAtGrazingAngle(GALACTIC_GRID_GRAZING_FADE_START),
    ).toBe(0);
    expect(
      galacticGridOpacityAtGrazingAngle(GALACTIC_GRID_GRAZING_FADE_END),
    ).toBe(1);
    const midpoint =
      (GALACTIC_GRID_GRAZING_FADE_START + GALACTIC_GRID_GRAZING_FADE_END) / 2;
    expect(galacticGridOpacityAtGrazingAngle(midpoint)).toBeCloseTo(0.5);
    expect(galacticGridOpacityAtGrazingAngle(midpoint)).toBe(
      galacticGridOpacityAtGrazingAngle(-midpoint),
    );
  });
});

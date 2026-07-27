import { describe, expect, it } from "vitest";
import {
  COMPONENT_OFFSET_ELEVATION_MAX,
  COMPONENT_OFFSET_RADIUS_MAX,
  COMPONENT_OFFSET_RADIUS_MIN,
  STAR_DISTANCE_FADE_END,
  STAR_DISTANCE_FADE_START,
  STAR_DISTANCE_FAR_BRIGHTNESS,
  STAR_SPRITE_FRAGMENT_SHADER,
  colorFamilyColor,
  componentOffset,
  selectionFrameSegments,
  starDistanceAttenuation,
} from "../../src/domain/star-visual";
import type { Component } from "../../src/domain/types";

const component = (id: string): Component => ({
  id,
  gaia_source_id: id.split(":")[1] ?? null,
  designation: id,
  icrs: {
    ra_deg: null,
    dec_deg: null,
    epoch_year: null,
    parallax_mas: null,
    parallax_error_mas: null,
  },
  astrometry_quality: {
    parallax_over_error: null,
    visibility_periods_used: null,
    ruwe: null,
  },
  photometry: {
    g_magnitude: null,
    bp_rp: null,
  },
  visual: {
    color_family: "yellow",
    marker_radius: 0.09,
    derivation: "test",
  },
});

describe("star visual encodings", () => {
  it("uses the fixed Gaia colour-family palette", () => {
    expect(colorFamilyColor("blue")).toBe("#9bbcff");
    expect(colorFamilyColor("blue-white")).toBe("#c6d8ff");
    expect(colorFamilyColor("yellow")).toBe("#ffd884");
    expect(colorFamilyColor("red")).toBe("#ff6b55");
    expect(colorFamilyColor("neutral")).toBe("#d8e6ff");
  });

  it("attenuates additive sprite contribution exactly once", () => {
    expect(starDistanceAttenuation(STAR_DISTANCE_FADE_START)).toBe(1);
    expect(starDistanceAttenuation(STAR_DISTANCE_FADE_END)).toBeCloseTo(
      STAR_DISTANCE_FAR_BRIGHTNESS,
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "gl_FragColor = vec4(uColor * (halo + core * 0.75), alpha);",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).not.toContain(
      "(halo + core * 0.75) * attenuation",
    );
  });

  it("keeps multi-source decorative offsets stable and non-zero", () => {
    const first = componentOffset(component("gaia-dr3:1"), 0, 2);
    expect(componentOffset(component("gaia-dr3:1"), 0, 2)).toEqual(first);
    expect(first).not.toEqual([0, 0, 0]);
    const horizontalRadius = Math.hypot(first[0], first[2]);
    expect(horizontalRadius).toBeGreaterThanOrEqual(
      COMPONENT_OFFSET_RADIUS_MIN,
    );
    expect(horizontalRadius).toBeLessThanOrEqual(COMPONENT_OFFSET_RADIUS_MAX);
    expect(Math.abs(first[1])).toBeLessThanOrEqual(
      COMPONENT_OFFSET_ELEVATION_MAX,
    );
    expect(componentOffset(component("gaia-dr3:1"), 0, 1)).toEqual([0, 0, 0]);
  });

  it("keeps Groombridge 34's decorative components within the restored envelope", () => {
    const first = componentOffset(
      component("gaia-dr3:385334196532776576"),
      0,
      2,
    );
    const second = componentOffset(
      component("gaia-dr3:385334230892516480"),
      1,
      2,
    );
    expect(
      Math.hypot(
        first[0] - second[0],
        first[1] - second[1],
        first[2] - second[2],
      ),
    ).toBeLessThanOrEqual(0.104);
  });

  it("defines corner-only selection-frame segments in the billboard plane", () => {
    const segments = selectionFrameSegments(0.27, 0.07);
    expect(segments).toHaveLength(4);
    expect(segments[0]).toEqual([-0.27, 0.2, 0, -0.27, 0.27, 0, -0.2, 0.27, 0]);
    expect(segments.flat().filter((_, index) => index % 3 === 2)).toEqual(
      Array(12).fill(0),
    );
  });
});

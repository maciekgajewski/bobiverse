import { describe, expect, it } from "vitest";
import {
  ASTRONOMY_CONTEXT_EMPHASIS,
  NARRATIVE_CORE_HALO_SCALE,
  NARRATIVE_VISIBLE_FOOTPRINT_SCALE,
  COMPONENT_OFFSET_ELEVATION_MAX,
  COMPONENT_OFFSET_RADIUS_MAX,
  COMPONENT_OFFSET_RADIUS_MIN,
  NARRATIVE_MARKER_COLOR,
  STAR_DISTANCE_FADE_END,
  STAR_DISTANCE_FADE_START,
  STAR_DISTANCE_FAR_BRIGHTNESS,
  STAR_SPRITE_FRAGMENT_SHADER,
  colorFamilyColor,
  componentOffset,
  componentPickRadius,
  componentVisibleRadius,
  narrativeMarkerGeometry,
  narrativeRingSegments,
  selectionFrameSegments,
  starDistanceAttenuation,
  starOpticalVariation,
} from "../../src/domain/star-visual";
import type { Component } from "../../src/domain/types";

const component = (id: string): Component => ({
  id,
  gaia_source_id: id.split(":")[1] ?? null,
  cns5_id: null,
  source_identities: [id],
  gaia_enrichment: null,
  c20pc_enrichment: null,
  object_class: null,
  designation: id,
  identifiers: {
    gaia_dr3_source_id: id.split(":")[1] ?? null,
    gcns_source_id: null,
    cns5_id: null,
    gj_id: null,
    hip_id: null,
    cns5_component_id: null,
    cns6_system_id: null,
    c20pc_source_key: null,
    wise_id: null,
    twomass_id: null,
    published_name: null,
  },
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
    intensity: 1,
    pick_radius: 0.09,
    derivation: "test",
    source_facts: {
      effective_temperature_k: null,
      spectral_type: null,
      bp_rp: null,
      wds_spectral_type: null,
      c20pc_effective_temperature_k: null,
      c20pc_spectral_type: null,
      object_class: null,
    },
  },
  provenance: { position: null, catalogues: [], enrichment: null },
});

describe("star visual encodings", () => {
  it("uses the reference cyan for every narrative map mark", () => {
    expect(NARRATIVE_MARKER_COLOR).toBe("#67cacd");
  });

  it("uses the fixed Gaia colour-family palette", () => {
    expect(colorFamilyColor("blue")).toBe("#9bbcff");
    expect(colorFamilyColor("blue-white")).toBe("#c6d8ff");
    expect(colorFamilyColor("yellow")).toBe("#ffd884");
    expect(colorFamilyColor("red")).toBe("#ff6b55");
    expect(colorFamilyColor("neutral")).toBe("#d8e6ff");
    expect(colorFamilyColor("infrared-cool")).toBe("#725a82");
    expect(colorFamilyColor("infrared-warm")).toBe("#9a6548");
  });

  it("attenuates additive sprite contribution exactly once", () => {
    expect(starDistanceAttenuation(STAR_DISTANCE_FADE_START)).toBe(1);
    expect(starDistanceAttenuation(STAR_DISTANCE_FADE_END)).toBeCloseTo(
      STAR_DISTANCE_FAR_BRIGHTNESS,
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "float baseAlpha = min(shape * attenuation * uIntensity, 1.0);",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "float alpha = baseAlpha * uEmphasis;",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).not.toContain(
      "luminousColor * attenuation",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain("uniform float uIntensity;");
    expect(STAR_SPRITE_FRAGMENT_SHADER.match(/\* uIntensity/g)).toHaveLength(1);
    expect(STAR_SPRITE_FRAGMENT_SHADER.match(/\* uEmphasis/g)).toHaveLength(1);
  });

  it("derives deterministic bounded expressive optics from stable identity", () => {
    const first = starOpticalVariation("gaia-dr3:1", 1);
    expect(starOpticalVariation("gaia-dr3:1", 1)).toEqual(first);
    expect(starOpticalVariation("gaia-dr3:2", 1)).not.toEqual(first);
    expect(first.coreRadius).toBeGreaterThanOrEqual(0.15);
    expect(first.coreRadius).toBeLessThanOrEqual(0.22);
    expect(first.haloRadius).toBeGreaterThanOrEqual(0.52);
    expect(first.haloRadius).toBeLessThanOrEqual(0.72);
    expect(first.primaryRayLength).toBeLessThanOrEqual(0.82);
    expect(first.secondaryRayLength).toBeLessThanOrEqual(0.58);
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "float footprint = 1.0 - smoothstep(0.94, 1.0, distanceFromCenter);",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain("float halo = pow(");
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain("fwidth(primaryAxis) * 0.42");
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain("max(uRays.x, 0.0001)");
  });

  it("keeps faint ultracool optics compact and rayless", () => {
    const optics = starOpticalVariation("c20pc:brown-dwarf", 0.25);
    expect(optics.primaryRayLength).toBe(0);
    expect(optics.primaryRayStrength).toBe(0);
    expect(optics.secondaryRayLength).toBe(0);
    expect(optics.secondaryRayStrength).toBe(0);
  });

  it("uses one bounded context emphasis without changing colour families", () => {
    expect(ASTRONOMY_CONTEXT_EMPHASIS).toBe(0.25);
    expect(ASTRONOMY_CONTEXT_EMPHASIS).toBeGreaterThan(0);
    expect(ASTRONOMY_CONTEXT_EMPHASIS).toBeLessThan(1);
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "float baseAlpha = min(shape * attenuation * uIntensity, 1.0);",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "float alpha = baseAlpha * uEmphasis;",
    );
    expect(
      STAR_SPRITE_FRAGMENT_SHADER.indexOf("float baseAlpha = min("),
    ).toBeLessThan(
      STAR_SPRITE_FRAGMENT_SHADER.indexOf(
        "float alpha = baseAlpha * uEmphasis;",
      ),
    );
  });

  it("enlarges the complete known presentation with proportional rays", () => {
    expect(NARRATIVE_CORE_HALO_SCALE).toBe(1.25);
    expect(NARRATIVE_CORE_HALO_SCALE).toBeGreaterThan(1);
    expect(NARRATIVE_VISIBLE_FOOTPRINT_SCALE).toBe(2);
    expect(NARRATIVE_CORE_HALO_SCALE * NARRATIVE_VISIBLE_FOOTPRINT_SCALE).toBe(
      2.5,
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "uniform float uCoreHaloScale;",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "uCoreHalo.x * uCoreHaloScale",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain(
      "uCoreHalo.y * uCoreHaloScale",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).not.toContain(
      "uRays.x * uCoreHaloScale",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).not.toContain(
      "uRays.z * uCoreHaloScale",
    );
    const ordinary = component("gaia-dr3:known");
    expect(componentVisibleRadius(ordinary, false)).toBe(0.09);
    expect(componentVisibleRadius(ordinary, true)).toBe(0.18);
    expect(componentPickRadius(ordinary)).toBe(0.09);
  });

  it("keeps the brown-dwarf hit target at ordinary marker size", () => {
    const brownDwarf = component("cns5:2194");
    brownDwarf.visual.marker_radius = 0.05;
    brownDwarf.visual.pick_radius = 0.09;
    expect(componentPickRadius(brownDwarf)).toBe(0.09);
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

  it("uses screen-space segmented rings without changing system coordinates", () => {
    const segments = narrativeRingSegments(0.26, 0.17);
    expect(segments).toHaveLength(4);
    expect(segments.every((segment) => segment.length === 5)).toBe(true);
    expect(segments.flat().every((point) => point[2] === 0)).toBe(true);
    expect(
      Math.max(...segments.flat().map((point) => Math.abs(point[0]))),
    ).toBeCloseTo(0.26);
    expect(
      Math.max(...segments.flat().map((point) => Math.abs(point[1]))),
    ).toBeCloseTo(0.17);
  });

  it("removes ordinary known geometry while preserving active geometry", () => {
    expect(narrativeMarkerGeometry(false)).toEqual({
      ringRadii: [],
      tick: null,
    });
    expect(narrativeMarkerGeometry(true)).toEqual({
      ringRadii: [
        [0.23, 0.15],
        [0.29, 0.19],
      ],
      tick: [0.21, 0.29],
    });
  });
});

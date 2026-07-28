import { describe, expect, it } from "vitest";
import {
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
  narrativeMarkerGeometry,
  narrativeRingSegments,
  selectionFrameSegments,
  starDistanceAttenuation,
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
      "gl_FragColor = vec4(uColor * (halo + core * 0.75), alpha);",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).not.toContain(
      "(halo + core * 0.75) * attenuation",
    );
    expect(STAR_SPRITE_FRAGMENT_SHADER).toContain("uniform float uIntensity;");
    expect(STAR_SPRITE_FRAGMENT_SHADER.match(/\* uIntensity/g)).toHaveLength(1);
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

  it("keeps known and active narrative marker geometry distinct", () => {
    expect(narrativeMarkerGeometry(false)).toEqual({
      ringRadii: [[0.26, 0.17]],
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

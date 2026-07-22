import { describe, expect, it } from "vitest";
import {
  COMPONENT_OFFSET_ELEVATION_MAX,
  COMPONENT_OFFSET_RADIUS_MAX,
  COMPONENT_OFFSET_RADIUS_MIN,
  MARKER_RADIUS_MAX,
  MARKER_RADIUS_MIN,
  componentOffset,
  markerRadius,
  selectionFrameSegments,
  spectralColor,
} from "../../src/domain/star-visual";
import type { Component } from "../../src/domain/types";

const component = (id: string): Component => ({
  id,
  cns5_id: 1,
  gj: null,
  component: null,
  gaia_dr3_id: null,
  hip_id: null,
  g_magnitude: null,
  icrs: {
    ra_deg: null,
    dec_deg: null,
    epoch_year: null,
    parallax_mas: null,
    parallax_error_mas: null,
    position_bibcode: null,
    parallax_bibcode: null,
  },
  visual: {
    spectral_class: "G2V",
    radius_solar: 1,
    provenance: {
      spectral_class: { catalogue: "test", record_id: id },
      radius: { catalogue: "test", record_id: id },
    },
  },
});

describe("star visual encodings", () => {
  it("uses the conventional spectral palette, including white dwarfs", () => {
    expect(spectralColor("B1V")).toBe("#b8ccff");
    expect(spectralColor("G2V")).toBe("#ffd884");
    expect(spectralColor("M4V")).toBe("#ff6b55");
    expect(spectralColor("T1V")).toBe("#ff6b55");
    expect(spectralColor("DA2.5")).toBe("#d9ecff");
  });

  it("maps physical radius with a bounded square-root scale", () => {
    expect(markerRadius(0)).toBe(MARKER_RADIUS_MIN);
    expect(markerRadius(100)).toBe(MARKER_RADIUS_MAX);
    expect(markerRadius(1)).toBeGreaterThan(markerRadius(0.25));
    expect(markerRadius(1) - markerRadius(0.25)).toBeGreaterThan(
      markerRadius(2.25) - markerRadius(1),
    );
  });

  it("keeps multi-star decorative offsets stable and non-zero", () => {
    const first = componentOffset(component("cns5:1"), 0, 2);
    expect(componentOffset(component("cns5:1"), 0, 2)).toEqual(first);
    expect(first).not.toEqual([0, 0, 0]);
    const horizontalRadius = Math.hypot(first[0], first[2]);
    expect(horizontalRadius).toBeGreaterThanOrEqual(
      COMPONENT_OFFSET_RADIUS_MIN,
    );
    expect(horizontalRadius).toBeLessThanOrEqual(COMPONENT_OFFSET_RADIUS_MAX);
    expect(Math.abs(first[1])).toBeLessThanOrEqual(
      COMPONENT_OFFSET_ELEVATION_MAX,
    );
    expect(componentOffset(component("cns5:1"), 0, 1)).toEqual([0, 0, 0]);
  });

  it("keeps Groombridge 34's decorative components within the restored envelope", () => {
    const first = componentOffset(component("cns5:89"), 0, 2);
    const second = componentOffset(component("cns5:90"), 1, 2);
    expect(
      Math.hypot(
        first[0] - second[0],
        first[1] - second[1],
        first[2] - second[2],
      ),
    ).toBeLessThanOrEqual(0.052);
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

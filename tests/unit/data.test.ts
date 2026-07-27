import { describe, expect, it } from "vitest";
import { mapDisplayConfig } from "../../src/domain/config";
import { nearbySystems, validateNearbySystems } from "../../src/domain/data";

describe("Gaia neighbourhood runtime data", () => {
  it("contains the complete pinned Sol neighbourhood", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    expect(nearbySystems.systems).toHaveLength(71);
    expect(nearbySystems.systems[0]?.id).toBe("sol");
    expect(nearbySystems.metadata.coverage).toEqual([
      {
        anchor_id: "sol",
        anchor_position_pc: { xg: 0, yg: 0, zg: 0 },
        radius_ly: mapDisplayConfig.context_radius_ly,
        source_record_count: 73,
        system_count: 70,
      },
    ]);
  });

  it("uses the one owned context-radius configuration", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    expect(nearbySystems.metadata.configuration.context_radius_ly).toBe(
      mapDisplayConfig.context_radius_ly,
    );
  });

  it("rejects altered render coordinates rather than treating scene values as truth", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const altered = structuredClone(nearbySystems);
    altered.systems[1]!.render_position.x += 0.1;
    expect(() => validateNearbySystems(altered)).toThrow(
      "Render mapping mismatch",
    );
  });

  it("requires complete, typed runtime source provenance", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const altered = structuredClone(nearbySystems);
    altered.metadata.source.acknowledgement = "";
    expect(() => validateNearbySystems(altered)).toThrow();
  });

  it("keeps a pinned Gaia distance fixture stable after transformation", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const barnard = nearbySystems.systems.find(
      (system) => system.id === "barnards-star",
    );
    expect(barnard?.distance_from_sol_pc).toBeCloseTo(1.828233981356, 10);
    expect(barnard?.components[0]?.gaia_source_id).toBe("4472832130942575872");
  });

  it("keeps reviewed Gaia components in one stellar-system node", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const groombridge = nearbySystems.systems.find(
      (system) => system.id === "groombridge-34",
    );
    expect(groombridge?.components.map((component) => component.id)).toEqual([
      "gaia-dr3:385334196532776576",
      "gaia-dr3:385334230892516480",
    ]);
  });

  it("rejects component astrometry inconsistent with its reviewed system", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const altered = structuredClone(nearbySystems);
    const groombridge = altered.systems.find(
      (system) => system.id === "groombridge-34",
    );
    if (!groombridge) throw new Error("Groombridge 34 fixture is missing");
    groombridge.components[0]!.icrs.parallax_mas = 47;
    expect(() => validateNearbySystems(altered)).toThrow(
      "Component distance mismatch for gaia-dr3:385334196532776576",
    );
  });

  it("retains Gaia photometry and explicit approximate visual cues", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    for (const system of nearbySystems.systems.slice(1)) {
      for (const component of system.components) {
        expect(component.gaia_source_id).toMatch(/^[0-9]+$/);
        expect(component.visual.marker_radius).toBeGreaterThan(0);
        expect(component.visual.derivation).toContain("Gaia DR3");
      }
    }
    expect(nearbySystems.systems[0]?.components).toMatchObject([
      {
        id: "generated:sol",
        gaia_source_id: null,
        visual: { color_family: "yellow", marker_radius: 0.09 },
      },
    ]);
  });
});

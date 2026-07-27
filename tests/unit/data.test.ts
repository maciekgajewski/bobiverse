import { describe, expect, it } from "vitest";
import { mapDisplayConfig } from "../../src/domain/config";
import { nearbySystems, validateNearbySystems } from "../../src/domain/data";

describe("reconciled astronomy runtime data", () => {
  it("contains the generated Sol neighbourhood and its coverage proof", () => {
    expect(nearbySystems).not.toBeNull();
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    expect(nearbySystems.systems).toHaveLength(97);
    expect(nearbySystems.systems[0]?.id).toBe("sol");
    expect(nearbySystems.metadata.coverage).toEqual([
      {
        anchor_id: "sol",
        anchor_position_pc: { xg: 0, yg: 0, zg: 0 },
        radius_ly: mapDisplayConfig.context_radius_ly,
        source_record_count: 118,
        system_count: 96,
        gcns_boundary_pc: 100,
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

  it("requires provenance from every active catalogue", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const altered = structuredClone(nearbySystems);
    altered.metadata.sources.cns5.acknowledgement = "";
    expect(() => validateNearbySystems(altered)).toThrow();
  });

  it("keeps a source-backed Barnard distance fixture stable", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const barnard = nearbySystems.systems.find(
      (system) => system.name === "Barnard's Star",
    );
    expect(barnard?.distance_from_sol_pc).toBeCloseTo(1.83800015242, 10);
    expect(barnard?.components[0]?.gaia_source_id).toBe("4472832130942575872");
  });

  it("keeps reviewed multiple components in one stellar-system node", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const alpha = nearbySystems.systems.find(
      (system) => system.name === "Alpha Centauri",
    );
    expect(alpha?.components.map((component) => component.designation)).toEqual(
      ["Alpha Centauri A", "Alpha Centauri B", "Proxima Centauri"],
    );
  });

  it("rejects component astrometry inconsistent with its reviewed system", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    const altered = structuredClone(nearbySystems);
    const groombridge = altered.systems.find(
      (system) => system.name === "Groombridge 34",
    );
    if (!groombridge) throw new Error("Groombridge 34 fixture is missing");
    groombridge.components[0]!.icrs.parallax_mas = 47;
    expect(() => validateNearbySystems(altered)).toThrow(
      "Component distance mismatch",
    );
  });

  it("retains nullable enrichment and explicit approximate visual cues", () => {
    if (!nearbySystems) throw new Error("Fixture dataset failed validation");
    for (const system of nearbySystems.systems.slice(1)) {
      for (const component of system.components) {
        expect(component.visual.marker_radius).toBeGreaterThan(0);
        expect(component.visual.derivation).toMatch(/^(Gaia DR3|Reviewed WDS)/);
        expect(component.visual.derivation).toMatch(/approximate|fixed bands/);
      }
    }
    expect(nearbySystems.systems[0]?.components).toMatchObject([
      {
        id: "stellar-component-sol",
        gaia_source_id: null,
        visual: { color_family: "yellow", marker_radius: 0.09 },
      },
    ]);
  });
});

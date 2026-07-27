import { z } from "zod";
import rawData from "../data/nearby-systems.json";
import { mapDisplayConfig } from "./config";
import { toRenderPosition } from "./coordinates";
import type { NearbySystemsData } from "./types";

const finite = z.number().refine(Number.isFinite, "must be finite");
const position = z.object({ xg: finite, yg: finite, zg: finite });
const renderPosition = z.object({ x: finite, y: finite, z: finite });
const colorFamily = z.enum([
  "blue",
  "blue-white",
  "white",
  "yellow",
  "orange",
  "red",
  "neutral",
]);
const component = z.object({
  id: z.string().min(1),
  gaia_source_id: z
    .string()
    .regex(/^[0-9]+$/)
    .nullable(),
  cns5_id: z.string().min(1).nullable(),
  source_identities: z.array(z.string().min(1)),
  gaia_enrichment: z
    .object({
      phot_g_mean_mag: finite.nullable(),
      phot_bp_mean_mag: finite.nullable(),
      phot_rp_mean_mag: finite.nullable(),
      bp_rp: finite.nullable(),
      radial_velocity_km_s: finite.nullable(),
      radial_velocity_error_km_s: finite.nullable(),
      phot_variable_flag: z.string().nullable(),
      non_single_star: z.string().nullable(),
      effective_temperature_k: finite.nullable(),
      logg_gspphot: finite.nullable(),
      luminosity_solar: finite.nullable(),
      radius_solar: finite.nullable(),
      spectral_type: z.string().nullable(),
      star_class_probability: finite.nullable(),
      variability_class: z.string().nullable(),
      variability_class_score: finite.nullable(),
    })
    .nullable(),
  designation: z.string().min(1),
  identifiers: z.object({
    gaia_dr3_source_id: z.string().nullable(),
    gcns_source_id: z.string().nullable(),
    cns5_id: z.string().nullable(),
    gj_id: z.string().nullable(),
    hip_id: z.string().nullable(),
    cns5_component_id: z.string().nullable(),
    cns6_system_id: z.string().nullable(),
  }),
  icrs: z.object({
    ra_deg: finite.nullable(),
    dec_deg: finite.nullable(),
    epoch_year: finite.nullable(),
    parallax_mas: finite.nullable(),
    parallax_error_mas: finite.nullable(),
  }),
  astrometry_quality: z.object({
    parallax_over_error: finite.nullable(),
    visibility_periods_used: z.number().int().nullable(),
    ruwe: finite.nullable(),
  }),
  photometry: z.object({
    g_magnitude: finite.nullable(),
    bp_rp: finite.nullable(),
  }),
  visual: z.object({
    color_family: colorFamily,
    marker_radius: finite.positive(),
    derivation: z.string().min(1),
    source_facts: z.object({
      effective_temperature_k: finite.nullable(),
      spectral_type: z.string().nullable(),
      bp_rp: finite.nullable(),
      wds_spectral_type: z.string().nullable(),
    }),
  }),
  provenance: z.object({
    position: z.string().nullable(),
    catalogues: z.array(z.string()),
    enrichment: z.string().nullable(),
  }),
});

const dataSchema = z.object({
  schema_version: z.literal("3.0.0"),
  metadata: z.object({
    generated_at: z.string().min(1),
    coordinate_frame: z.literal("Sun-centered Galactic Cartesian"),
    units: z.literal("pc"),
    render_mapping: z.literal("scene.x=Xg; scene.y=Zg; scene.z=-Yg"),
    sources: z.object({
      gcns: z.object({
        normalised_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        row_count: z.number().int().nonnegative(),
        acknowledgement: z.string().min(1),
      }),
      cns5: z.object({
        normalised_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        row_count: z.number().int().nonnegative(),
        acknowledgement: z.string().min(1),
      }),
      gaia_dr3: z.object({
        normalised_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        row_count: z.number().int().nonnegative(),
        acknowledgement: z.string().min(1),
      }),
      wds: z.object({
        snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        candidate_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        row_count: z.number().int().positive(),
        candidate_row_count: z.number().int().nonnegative(),
        acknowledgement: z.string().min(1),
      }),
    }),
    configuration: z.object({
      context_radius_ly: finite.positive(),
    }),
    coverage: z
      .array(
        z.object({
          anchor_id: z.string().min(1),
          anchor_position_pc: position,
          radius_ly: finite.positive(),
          system_count: z.number().int().nonnegative(),
          source_record_count: z.number().int().nonnegative(),
          gcns_boundary_pc: z.literal(100),
        }),
      )
      .min(1),
  }),
  systems: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        alternates: z.array(z.string().min(1)),
        position_pc: position,
        render_position: renderPosition,
        distance_from_sol_pc: finite.nonnegative(),
        distance_uncertainty_pc: finite.nonnegative().nullable(),
        components: z.array(component).min(1),
        provenance: z.object({
          catalogues: z.array(z.string()),
          source_object_ids: z.array(z.string()),
          adopted_component_id: z.string().min(1),
          review_version: z.string().min(1),
          wds_designations: z.array(
            z.object({
              wds_coordinate: z.string().min(1),
              discoverer: z.string().min(1),
              components: z.string(),
              component_ids: z.array(z.string().min(1)).min(1),
              membership_action: z.enum(["confirm", "replace"]),
              reason: z.string().min(1),
            }),
          ),
        }),
      }),
    )
    .min(1)
    .max(2_000),
});

export function validateNearbySystems(candidate: unknown): NearbySystemsData {
  const data = dataSchema.parse(candidate) as NearbySystemsData;
  if (
    data.metadata.configuration.context_radius_ly !==
    mapDisplayConfig.context_radius_ly
  ) {
    throw new Error("Runtime context radius differs from map-display config.");
  }
  const ids = new Set(data.systems.map((system) => system.id));
  if (ids.size !== data.systems.length || data.systems[0]?.id !== "sol") {
    throw new Error("Expected Sol first and unique stellar-system IDs.");
  }
  for (const system of data.systems) {
    const expected = toRenderPosition(system.position_pc);
    if (
      expected.x !== system.render_position.x ||
      expected.y !== system.render_position.y ||
      expected.z !== system.render_position.z
    ) {
      throw new Error(`Render mapping mismatch for ${system.id}.`);
    }
    for (const systemComponent of system.components) {
      const parallaxMas = systemComponent.icrs.parallax_mas;
      if (parallaxMas === null) continue;
      const componentDistancePc = 1000 / parallaxMas;
      const allowedDistanceDeltaPc = Math.max(
        0.1,
        system.distance_from_sol_pc * 0.05,
      );
      if (
        Math.abs(componentDistancePc - system.distance_from_sol_pc) >
        allowedDistanceDeltaPc
      ) {
        throw new Error(
          `Component distance mismatch for ${systemComponent.id} in ${system.id}.`,
        );
      }
    }
  }
  return data;
}

export const nearbySystemsResult: {
  data: NearbySystemsData | null;
  error: string | null;
} = (() => {
  try {
    return { data: validateNearbySystems(rawData), error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unknown dataset validation error.",
    };
  }
})();

export const nearbySystems = nearbySystemsResult.data;

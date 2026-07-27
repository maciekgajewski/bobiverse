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
  designation: z.string().min(1),
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
  }),
});

const dataSchema = z.object({
  schema_version: z.literal("2.0.0"),
  metadata: z.object({
    generated_at: z.string().min(1),
    coordinate_frame: z.literal("Sun-centered Galactic Cartesian"),
    units: z.literal("pc"),
    render_mapping: z.literal("scene.x=Xg; scene.y=Zg; scene.z=-Yg"),
    source: z.object({
      catalogue: z.string().min(1),
      release: z.string().min(1),
      archive_url: z.url(),
      documentation_url: z.url(),
      retrieved_at: z.string().min(1),
      acknowledgement: z.string().min(1),
      snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/),
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
          catalogue: z.string().min(1),
          release: z.string().optional(),
          source_object_ids: z.array(z.string().regex(/^[0-9]+$/)),
          adopted_source_object_id: z
            .string()
            .regex(/^[0-9]+$/)
            .optional(),
          transformation: z.string().optional(),
          review_version: z.string().optional(),
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

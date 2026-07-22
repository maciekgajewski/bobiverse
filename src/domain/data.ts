import { z } from "zod";
import rawData from "../data/nearby-systems.json";
import { toRenderPosition } from "./coordinates";
import type { NearbySystemsData } from "./types";

const finite = z.number().refine(Number.isFinite, "must be finite");
const position = z.object({ xg: finite, yg: finite, zg: finite });
const renderPosition = z.object({ x: finite, y: finite, z: finite });
const propertyProvenance = z.object({
  catalogue: z.string().min(1),
  release: z.string().optional(),
  record_id: z.string().min(1),
  reference: z.string().optional(),
});
const component = z.object({
  id: z.string().min(1),
  cns5_id: z.number().int(),
  gj: z.string().nullable(),
  component: z.string().nullable(),
  gaia_dr3_id: z.string().nullable(),
  hip_id: z.number().int().nullable(),
  g_magnitude: finite.nullable(),
  icrs: z.object({
    ra_deg: finite.nullable(),
    dec_deg: finite.nullable(),
    epoch_year: finite.nullable(),
    parallax_mas: finite.nullable(),
    parallax_error_mas: finite.nullable(),
    position_bibcode: z.string().nullable(),
    parallax_bibcode: z.string().nullable(),
  }),
  visual: z.object({
    spectral_class: z.string().min(1),
    radius_solar: finite.positive(),
    provenance: z.object({
      spectral_class: propertyProvenance,
      radius: propertyProvenance,
    }),
  }),
});

const dataSchema = z.object({
  schema_version: z.literal("1.0.0"),
  metadata: z.object({
    generated_at: z.string(),
    coordinate_frame: z.literal("Sun-centered Galactic Cartesian"),
    units: z.literal("pc"),
    render_mapping: z.literal("scene.x=Xg; scene.y=Zg; scene.z=-Yg"),
    source: z.object({
      catalogue: z.string(),
      release: z.string(),
      acknowledgement: z.string(),
    }),
  }),
  systems: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        alternates: z.array(z.string()),
        position_pc: position,
        render_position: renderPosition,
        distance_from_sol_pc: finite,
        distance_uncertainty_pc: finite.nullable(),
        components: z.array(component),
        provenance: z.object({
          catalogue: z.string(),
          release: z.string().optional(),
          source_object_ids: z.array(z.string()),
          adopted_source_object_id: z.string().optional(),
          transformation: z.string().optional(),
          review_version: z.string().optional(),
        }),
      }),
    )
    .length(21),
});

export function validateNearbySystems(candidate: unknown): NearbySystemsData {
  const data = dataSchema.parse(candidate) as NearbySystemsData;
  const ids = new Set(data.systems.map((system) => system.id));
  if (ids.size !== 21 || !ids.has("sol"))
    throw new Error("Expected Sol and 20 unique nearby systems.");
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

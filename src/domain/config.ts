import { z } from "zod";
import rawConfig from "../../data/config/map-display.json";

const configSchema = z.object({
  schema_version: z.literal("1.0.0"),
  context_radius_ly: z.number().finite().positive(),
});

export const mapDisplayConfig = configSchema.parse(rawConfig);

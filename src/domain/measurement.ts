import { euclideanDistancePc } from "./coordinates";
import type { StellarSystem } from "./types";

export function measurementDistancePc(
  first: StellarSystem | undefined,
  second: StellarSystem | undefined,
): number | null {
  if (!first || !second || first.id === second.id) return null;
  return euclideanDistancePc(first.position_pc, second.position_pc);
}

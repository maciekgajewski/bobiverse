import type { DistanceUnit } from "./types";

export const LIGHT_YEARS_PER_PARSEC = 3.261563777;

export function convertParsecs(valuePc: number, unit: DistanceUnit): number {
  return unit === "ly" ? valuePc * LIGHT_YEARS_PER_PARSEC : valuePc;
}

export function formatDistance(
  valuePc: number,
  unit: DistanceUnit,
  precision = 2,
): string {
  return `${convertParsecs(valuePc, unit).toFixed(precision)} ${unit}`;
}

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

/** Chooses a readable 1–2–5 value in the caller's presentation unit. */
export function niceScaleDistance(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function calculateMapScale(
  worldWidthPc: number,
  viewportWidthPx: number,
  unit: DistanceUnit,
): { displayDistance: number; pixelWidth: number } {
  const desiredDisplayDistance = convertParsecs(worldWidthPc / 5, unit);
  const displayDistance = niceScaleDistance(desiredDisplayDistance);
  const displayWidth =
    (displayDistance / convertParsecs(worldWidthPc, unit)) * viewportWidthPx;
  return {
    displayDistance,
    pixelWidth: Math.round(Math.max(36, displayWidth)),
  };
}

export const LIGHT_YEARS_PER_PARSEC = 3.261563777;
export const DISPLAY_DISTANCE_UNIT = "ly";

export function convertParsecsToLightYears(valuePc: number): number {
  return valuePc * LIGHT_YEARS_PER_PARSEC;
}

export function formatDistance(valuePc: number, precision = 2): string {
  return `${convertParsecsToLightYears(valuePc).toFixed(
    precision,
  )} ${DISPLAY_DISTANCE_UNIT}`;
}

/** Chooses a readable 1–2–5 value in the fixed presentation unit. */
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
): { displayDistance: number; pixelWidth: number } {
  const desiredDisplayDistance = convertParsecsToLightYears(worldWidthPc / 5);
  const displayDistance = niceScaleDistance(desiredDisplayDistance);
  const displayWidth =
    (displayDistance / convertParsecsToLightYears(worldWidthPc)) *
    viewportWidthPx;
  return {
    displayDistance,
    pixelWidth: Math.round(Math.max(36, displayWidth)),
  };
}

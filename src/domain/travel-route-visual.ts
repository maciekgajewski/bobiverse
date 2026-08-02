export const TRAVEL_ROUTE_PULSE_SPEED = 0.42;

export function travelRouteOpacity(age: number): number {
  return 0.28 + Math.max(0, Math.min(1, age)) * 0.56;
}

/**
 * LineMaterial evaluates distance from the departure endpoint plus dashOffset.
 * Decreasing the offset therefore advances the visible pulse toward arrival.
 */
export function advanceTravelPulseOffset(
  current: number,
  deltaSeconds: number,
  reducedMotion: boolean,
): number {
  return reducedMotion
    ? current
    : current - Math.max(0, deltaSeconds) * TRAVEL_ROUTE_PULSE_SPEED;
}

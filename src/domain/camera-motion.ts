export const FOCUS_DURATION_MIN_MS = 300;
export const FOCUS_DURATION_MAX_MS = 850;

export function focusDurationMs(travelDistance: number): number {
  const normalizedDistance = Math.min(Math.max(travelDistance, 0) / 10, 1);
  return (
    FOCUS_DURATION_MIN_MS +
    normalizedDistance * (FOCUS_DURATION_MAX_MS - FOCUS_DURATION_MIN_MS)
  );
}

export function easeInOutQuad(progress: number): number {
  const limitedProgress = Math.min(Math.max(progress, 0), 1);
  return limitedProgress < 0.5
    ? 2 * limitedProgress * limitedProgress
    : 1 - (-2 * limitedProgress + 2) ** 2 / 2;
}

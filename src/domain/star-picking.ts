export const COARSE_POINTER_PICK_RADIUS_PX = 22;
export const FINE_POINTER_PICK_RADIUS_PX = 10;
/** Pointerup commits a pick only when movement stays below this CSS-pixel slop. */
export const PICK_DRAG_THRESHOLD_PX = 10;

export interface ScreenPickCandidate {
  systemId: string;
  componentId: string;
  x: number;
  y: number;
  /** Projected half-size of the 0.09 pc pick quad, in CSS pixels. */
  pickRadiusPx: number;
  /** Camera-to-centre distance, used only as a tie-break. */
  depth: number;
}

export interface ScreenPickPoint {
  x: number;
  y: number;
}

export function pointerPickRadiusPx(coarse: boolean): number {
  return coarse ? COARSE_POINTER_PICK_RADIUS_PX : FINE_POINTER_PICK_RADIUS_PX;
}

export function effectivePickRadiusPx(
  baseRadiusPx: number,
  projectedPickRadiusPx: number,
): number {
  return Math.max(baseRadiusPx, projectedPickRadiusPx);
}

export function pointerMovedBeyondPickThreshold(
  start: ScreenPickPoint,
  end: ScreenPickPoint,
  thresholdPx = PICK_DRAG_THRESHOLD_PX,
): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) >= thresholdPx;
}

/**
 * Nearest projected component centre within its effective radius wins.
 * Camera depth breaks ties. Candidates the caller marks unpickable must
 * already have been omitted (locked, spoiler-hidden, or out of the
 * zoomed cluster).
 */
export function nearestScreenPick(
  candidates: readonly ScreenPickCandidate[],
  point: ScreenPickPoint,
  baseRadiusPx: number,
): ScreenPickCandidate | null {
  let closest: ScreenPickCandidate | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    const radius = effectivePickRadiusPx(baseRadiusPx, candidate.pickRadiusPx);
    if (distance > radius) continue;
    if (
      distance < closestDistance ||
      (distance === closestDistance &&
        closest !== null &&
        candidate.depth < closest.depth)
    ) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest;
}

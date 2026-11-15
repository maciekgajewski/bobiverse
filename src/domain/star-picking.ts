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

/** Ignore a following caption click for this long after a tracked pointerup. */
export const CAPTION_CLICK_DEDUPE_MS = 500;

export interface PickPointer {
  id: number;
  x: number;
  y: number;
}

export interface PickGestureUp {
  /** Start of the single-pointer gesture if this up may commit a pick. */
  mayPickFrom: PickPointer | null;
  /** True if this pointer was part of a pick gesture or a suppressed pinch. */
  tracked: boolean;
}

/**
 * First pointer on the map starts a pick gesture. A second pointer cancels
 * it and suppresses picks until every tracked pointer is up, so a pinch
 * whose first finger stays still does not select on release.
 */
export function createPickGesture() {
  let start: PickPointer | null = null;
  let suppressed = false;
  const activeIds = new Set<number>();

  return {
    pointerDown(pointer: PickPointer, onMap: boolean): void {
      if (start !== null || suppressed || activeIds.size > 0) {
        activeIds.add(pointer.id);
        if (activeIds.size > 1) {
          start = null;
          suppressed = true;
        }
        return;
      }
      if (!onMap) return;
      activeIds.add(pointer.id);
      start = { id: pointer.id, x: pointer.x, y: pointer.y };
    },
    pointerUp(pointerId: number): PickGestureUp {
      if (!activeIds.has(pointerId)) {
        return { mayPickFrom: null, tracked: false };
      }
      const mayPickFrom =
        !suppressed && start !== null && start.id === pointerId ? start : null;
      activeIds.delete(pointerId);
      if (mayPickFrom) start = null;
      if (activeIds.size === 0) {
        start = null;
        suppressed = false;
      }
      return { mayPickFrom, tracked: true };
    },
    pointerCancel(pointerId: number): void {
      if (!activeIds.has(pointerId)) return;
      activeIds.delete(pointerId);
      if (start?.id === pointerId) start = null;
      if (activeIds.size === 0) {
        start = null;
        suppressed = false;
        return;
      }
      start = null;
      suppressed = true;
    },
  };
}

export function createCaptionClickDedupe(windowMs = CAPTION_CLICK_DEDUPE_MS) {
  let untilMs = 0;
  return {
    /** Call after any tracked pointerup so a following caption click is skipped. */
    rememberPointerUp(nowMs: number): void {
      untilMs = nowMs + windowMs;
    },
    shouldSkip(nowMs: number): boolean {
      return nowMs < untilMs;
    },
  };
}

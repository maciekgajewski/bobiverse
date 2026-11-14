export type SheetSnap = "peek" | "half" | "full";
export const SHEET_SNAPS: readonly SheetSnap[] = ["peek", "half", "full"];

/** Same cut as the compact-landscape CSS: phones on their side get a drawer. */
export const SIDE_DRAWER_QUERY = "(max-width: 1199px) and (max-height: 500px)";

// Mirrors the snap heights in src/styles.css (.detail-sheet[data-snap]).
const PEEK_HEIGHT_PX = 152;
const HALF_FRACTION = 0.5;
// Pointer travel before a press on the handle becomes a drag, and the travel
// that moves one snap even when the nearest snap is still the starting one.
export const DRAG_START_PX = 6;
const STEP_DRAG_PX = 40;

export function cycleSnap(snap: SheetSnap): SheetSnap {
  return snap === "peek" ? "half" : snap === "half" ? "full" : "peek";
}

export function stepSnap(snap: SheetSnap, direction: 1 | -1): SheetSnap {
  const index = SHEET_SNAPS.indexOf(snap) + direction;
  return SHEET_SNAPS[Math.min(SHEET_SNAPS.length - 1, Math.max(0, index))]!;
}

export function snapHeights(): Record<SheetSnap, number> {
  const viewport = window.innerHeight;
  const topbar =
    document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 52;
  const full = Math.max(PEEK_HEIGHT_PX, viewport - topbar);
  return {
    peek: Math.min(PEEK_HEIGHT_PX, full),
    half: Math.min(Math.round(viewport * HALF_FRACTION), full),
    full,
  };
}

/** The snap a drag that ended at this height and travel settles on. */
export function settleSnap(
  start: SheetSnap,
  height: number,
  travel: number,
  heights: Record<SheetSnap, number>,
): SheetSnap {
  let nearest: SheetSnap = start;
  for (const snap of SHEET_SNAPS) {
    if (Math.abs(heights[snap] - height) < Math.abs(heights[nearest] - height))
      nearest = snap;
  }
  if (nearest === start && Math.abs(travel) >= STEP_DRAG_PX)
    return stepSnap(start, travel < 0 ? 1 : -1);
  return nearest;
}

export function isSideDrawer(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(SIDE_DRAWER_QUERY).matches
  );
}

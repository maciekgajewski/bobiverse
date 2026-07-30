/** Distance, in scene units, at which the Galactic-plane grid begins to fade. */
export const GALACTIC_GRID_FADE_START = 10;

/** Distance, in scene units, at which the Galactic-plane grid is fully invisible. */
export const GALACTIC_GRID_FADE_END = 28;
export const GALACTIC_GRID_LINE_STRENGTH = 0.17;
export const GALACTIC_GRID_AXIS_STRENGTH = 0.26;
export const GALACTIC_GRID_GRAZING_FADE_START = 0.04;
export const GALACTIC_GRID_GRAZING_FADE_END = 0.22;

/**
 * Keeps the orientation grid useful near the viewer without competing with the
 * permanent distant-sky backdrop. Distance is measured within the Galactic plane.
 */
export function galacticGridOpacityAtPlanarDistance(distance: number): number {
  if (distance <= GALACTIC_GRID_FADE_START) return 1;
  if (distance >= GALACTIC_GRID_FADE_END) return 0;
  const progress =
    (distance - GALACTIC_GRID_FADE_START) /
    (GALACTIC_GRID_FADE_END - GALACTIC_GRID_FADE_START);
  return 1 - progress * progress * (3 - 2 * progress);
}

/** Suppresses the grid smoothly when the sight line becomes parallel to the plane. */
export function galacticGridOpacityAtGrazingAngle(
  viewNormalDot: number,
): number {
  const absoluteViewNormalDot = Math.abs(viewNormalDot);
  if (absoluteViewNormalDot <= GALACTIC_GRID_GRAZING_FADE_START) return 0;
  if (absoluteViewNormalDot >= GALACTIC_GRID_GRAZING_FADE_END) return 1;
  const progress =
    (absoluteViewNormalDot - GALACTIC_GRID_GRAZING_FADE_START) /
    (GALACTIC_GRID_GRAZING_FADE_END - GALACTIC_GRID_GRAZING_FADE_START);
  return progress * progress * (3 - 2 * progress);
}

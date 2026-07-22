import type { GalacticPosition, RenderPosition } from "./types";

/** GridHelper's default X/Z plane is canonical Zg=0 after the scene mapping. */
export const GALACTIC_PLANE_SCENE_ROTATION = Object.freeze([0, 0, 0] as const);

/** Maps canonical Sun-centered Galactic pc coordinates into Three.js's Y-up space. */
export function toRenderPosition(position: GalacticPosition): RenderPosition {
  return { x: position.xg, y: position.zg, z: -position.yg };
}

export function euclideanDistancePc(
  a: GalacticPosition,
  b: GalacticPosition,
): number {
  return Math.hypot(a.xg - b.xg, a.yg - b.yg, a.zg - b.zg);
}

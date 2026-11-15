import { DoubleSide, type Material, type Object3D } from "three";

export interface RenderMaterialStats {
  /** Distinct materials attached to objects in the scene graph. */
  materials: number;
  /** Sum of `material.version` over those materials. */
  materialVersionSum: number;
  /** Materials that three.js would draw in two passes. */
  twoPassMaterials: number;
}

/**
 * three.js draws a transparent, double-sided material twice (back faces, then
 * front faces) unless `forceSinglePass` is set. Before each pass it sets
 * `material.needsUpdate`, which bumps `material.version` and makes the
 * renderer re-derive that material's program parameters on every frame.
 */
export function isTwoPassMaterial(material: Material): boolean {
  return (
    material.transparent &&
    material.side === DoubleSide &&
    !material.forceSinglePass
  );
}

export function collectRenderMaterialStats(
  root: Object3D,
): RenderMaterialStats {
  const materials = new Set<Material>();
  root.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (!material) return;
    for (const entry of Array.isArray(material) ? material : [material]) {
      materials.add(entry);
    }
  });
  let materialVersionSum = 0;
  let twoPassMaterials = 0;
  for (const material of materials) {
    materialVersionSum += material.version;
    if (isTwoPassMaterial(material)) twoPassMaterials += 1;
  }
  return { materials: materials.size, materialVersionSum, twoPassMaterials };
}

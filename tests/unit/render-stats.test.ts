import {
  DoubleSide,
  FrontSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
} from "three";
import { describe, expect, it } from "vitest";
import {
  collectRenderMaterialStats,
  isTwoPassMaterial,
} from "../../src/domain/render-stats";

describe("render material stats", () => {
  it("flags only transparent double-sided materials without forceSinglePass", () => {
    const twoPass = new MeshBasicMaterial({
      transparent: true,
      side: DoubleSide,
    });
    expect(isTwoPassMaterial(twoPass)).toBe(true);
    twoPass.forceSinglePass = true;
    expect(isTwoPassMaterial(twoPass)).toBe(false);
    expect(
      isTwoPassMaterial(
        new MeshBasicMaterial({ transparent: true, side: FrontSide }),
      ),
    ).toBe(false);
    expect(isTwoPassMaterial(new MeshBasicMaterial({ side: DoubleSide }))).toBe(
      false,
    );
    // three.js ShaderMaterial defaults to a single pass.
    expect(
      isTwoPassMaterial(
        new ShaderMaterial({ transparent: true, side: DoubleSide }),
      ),
    ).toBe(false);
  });

  it("counts shared and hidden materials once and sums their versions", () => {
    const scene = new Scene();
    const geometry = new PlaneGeometry(1, 1);
    const shared = new MeshBasicMaterial({
      transparent: true,
      side: DoubleSide,
    });
    const hidden = new Mesh(geometry, shared);
    hidden.visible = false;
    scene.add(new Mesh(geometry, shared), hidden);
    scene.add(new Mesh(geometry, new MeshBasicMaterial()));
    const before = collectRenderMaterialStats(scene);
    expect(before.materials).toBe(2);
    expect(before.twoPassMaterials).toBe(1);
    shared.needsUpdate = true;
    expect(collectRenderMaterialStats(scene).materialVersionSum).toBe(
      before.materialVersionSum + 1,
    );
  });
});

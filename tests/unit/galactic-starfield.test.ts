import { describe, expect, it } from "vitest";
import {
  backdropPositionForCamera,
  galacticSkyCoordinateForSceneDirection,
  galacticSkyTextureUv,
  sceneDirectionForGalacticSky,
} from "../../src/domain/galactic-starfield";

const degrees = (value: number) => (value * Math.PI) / 180;

describe("Galactic starfield orientation contract", () => {
  it("maps the Galactic centre to +scene.x and the source-image midpoint", () => {
    const direction = sceneDirectionForGalacticSky(0, 0);
    expect(direction).toEqual({ x: 1, y: 0, z: -0 });
    expect(
      galacticSkyTextureUv(galacticSkyCoordinateForSceneDirection(direction)),
    ).toEqual({
      u: 0.5,
      v: 0.5,
    });
  });

  it("maps Galactic north to +scene.y", () => {
    const direction = sceneDirectionForGalacticSky(0, degrees(90));
    expect(direction.x).toBeCloseTo(0);
    expect(direction.y).toBe(1);
    expect(direction.z).toBeCloseTo(0);
    expect(
      galacticSkyTextureUv(galacticSkyCoordinateForSceneDirection(direction)).v,
    ).toBeCloseTo(0);
  });

  it("maps l=90 degrees to -scene.z and left of the texture midpoint", () => {
    const direction = sceneDirectionForGalacticSky(degrees(90), 0);
    expect(direction.x).toBeCloseTo(0);
    expect(direction.y).toBe(0);
    expect(direction.z).toBe(-1);
    expect(
      galacticSkyTextureUv(galacticSkyCoordinateForSceneDirection(direction)),
    ).toEqual({
      u: 0.25,
      v: 0.5,
    });
  });

  it("follows only camera position, never its rotation", () => {
    const camera = { x: 5, y: -2, z: 8 };
    expect(backdropPositionForCamera(camera)).toEqual(camera);
    expect(backdropPositionForCamera(camera)).not.toBe(camera);
  });
});

/**
 * Contract for the Deep Star Maps Galactic equirectangular texture.
 *
 * The scene frame is X = Xg, Y = Zg, Z = -Yg.  The source image places
 * longitude zero at its horizontal midpoint and increases longitude to the
 * left, so its U coordinate decreases as Galactic longitude increases.
 */
export interface SceneDirection {
  x: number;
  y: number;
  z: number;
}

export interface GalacticSkyCoordinate {
  longitudeRadians: number;
  latitudeRadians: number;
}

export interface TextureUv {
  u: number;
  v: number;
}

export const GALACTIC_STARFIELD_ASSET = "milkyway_2020_4k_gal.exr" as const;
export const GALACTIC_STARFIELD_SOURCE_URL =
  "https://svs.gsfc.nasa.gov/4851/" as const;
export const GALACTIC_STARFIELD_UI_CREDIT =
  "Astronomy backdrop: NASA/Goddard Space Flight Center Scientific Visualization Studio, Deep Star Maps 2020; Gaia DR2: ESA/Gaia/DPAC." as const;

/** Converts canonical Galactic longitude and latitude to a scene direction. */
export function sceneDirectionForGalacticSky(
  longitudeRadians: number,
  latitudeRadians: number,
): SceneDirection {
  const cosLatitude = Math.cos(latitudeRadians);
  return {
    x: cosLatitude * Math.cos(longitudeRadians),
    y: Math.sin(latitudeRadians),
    z: -cosLatitude * Math.sin(longitudeRadians),
  };
}

/** Inverse of the scene mapping used by the Galactic sky dome. */
export function galacticSkyCoordinateForSceneDirection(
  direction: SceneDirection,
): GalacticSkyCoordinate {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (length === 0) throw new Error("A Galactic sky direction cannot be zero.");
  const xg = direction.x / length;
  const yg = -direction.z / length;
  const zg = direction.y / length;
  return {
    longitudeRadians: Math.atan2(yg, xg),
    latitudeRadians: Math.asin(zg),
  };
}

/**
 * Maps Galactic coordinates to the source plate-carree image.  U uses the
 * documented left-increasing longitude; V places Galactic north at the top.
 */
export function galacticSkyTextureUv(
  coordinate: GalacticSkyCoordinate,
): TextureUv {
  const u = (((0.5 - coordinate.longitudeRadians / (2 * Math.PI)) % 1) + 1) % 1;
  return { u, v: 0.5 - coordinate.latitudeRadians / Math.PI };
}

/** The dome is translated with the camera but never rotated with it. */
export function backdropPositionForCamera(
  cameraPosition: SceneDirection,
): SceneDirection {
  return { ...cameraPosition };
}

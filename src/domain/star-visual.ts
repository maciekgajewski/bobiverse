import type { ColorFamily, Component } from "./types";

export const COMPONENT_OFFSET_RADIUS_MIN = 0.036;
export const COMPONENT_OFFSET_RADIUS_MAX = 0.0576;
export const COMPONENT_OFFSET_ELEVATION_MAX = 0.0216;
export const STAR_DISTANCE_FADE_START = 6;
export const STAR_DISTANCE_FADE_END = 45;
export const STAR_DISTANCE_FAR_BRIGHTNESS = 0.35;
export const ASTRONOMY_CONTEXT_EMPHASIS = 0.25;
export const NARRATIVE_CORE_HALO_SCALE = 1.25;
export const NARRATIVE_VISIBLE_FOOTPRINT_SCALE = 2;
/** Reference-design cyan used for narrative-known, active, and selected map marks. */
export const NARRATIVE_MARKER_COLOR = "#67cacd";

export interface StarOpticalVariation {
  coreRadius: number;
  haloRadius: number;
  haloFalloff: number;
  primaryRayLength: number;
  primaryRayStrength: number;
  secondaryRayLength: number;
  secondaryRayStrength: number;
  rayTipSoftness: number;
}

const COLOR_FAMILIES: Record<ColorFamily, string> = {
  blue: "#9bbcff",
  "blue-white": "#c6d8ff",
  white: "#fff8e7",
  yellow: "#ffd884",
  orange: "#ffac69",
  red: "#ff6b55",
  neutral: "#d8e6ff",
  "infrared-cool": "#725a82",
  "infrared-warm": "#9a6548",
} as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function starDistanceAttenuation(cameraDistance: number): number {
  const progress = clamp(
    (cameraDistance - STAR_DISTANCE_FADE_START) /
      (STAR_DISTANCE_FADE_END - STAR_DISTANCE_FADE_START),
    0,
    1,
  );
  const smoothed = progress * progress * (3 - 2 * progress);
  return 1 - smoothed * (1 - STAR_DISTANCE_FAR_BRIGHTNESS);
}

export const STAR_SPRITE_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uEmphasis;
uniform float uCoreHaloScale;
uniform vec4 uCoreHalo;
uniform vec4 uRays;
varying vec2 vUv;
varying float vCameraDistance;

void main() {
  vec2 point = (vUv - 0.5) * 2.0;
  float distanceFromCenter = length(point);
  float footprint = 1.0 - smoothstep(0.94, 1.0, distanceFromCenter);
  float core = 1.0 - smoothstep(
    uCoreHalo.x * 0.42 * uCoreHaloScale,
    uCoreHalo.x * uCoreHaloScale,
    distanceFromCenter
  );
  float halo = pow(
    max(1.0 - distanceFromCenter / (uCoreHalo.y * uCoreHaloScale), 0.0),
    uCoreHalo.z
  );
  float primaryAxis = min(abs(point.x), abs(point.y));
  float primaryReach = max(abs(point.x), abs(point.y));
  float primaryWidth = max(
    fwidth(primaryAxis) * 0.42,
    mix(0.028, 0.006, clamp(primaryReach / max(uRays.x, 0.001), 0.0, 1.0))
  );
  float primaryRays = (1.0 - smoothstep(primaryWidth * 0.35, primaryWidth, primaryAxis))
    * (1.0 - smoothstep(
      max(uRays.x - uCoreHalo.w, 0.0),
      max(uRays.x, 0.0001),
      primaryReach
    ))
    * uRays.y;
  vec2 diagonal = vec2(point.x + point.y, point.x - point.y) * 0.70710678;
  float secondaryAxis = min(abs(diagonal.x), abs(diagonal.y));
  float secondaryReach = max(abs(diagonal.x), abs(diagonal.y));
  float secondaryWidth = max(
    fwidth(secondaryAxis) * 0.32,
    mix(0.018, 0.004, clamp(secondaryReach / max(uRays.z, 0.001), 0.0, 1.0))
  );
  float secondaryRays = (1.0 - smoothstep(secondaryWidth * 0.35, secondaryWidth, secondaryAxis))
    * (1.0 - smoothstep(
      max(uRays.z - uCoreHalo.w, 0.0),
      max(uRays.z, 0.0001),
      secondaryReach
    ))
    * uRays.w;
  float attenuation = 1.0 - smoothstep(${STAR_DISTANCE_FADE_START.toFixed(1)}, ${STAR_DISTANCE_FADE_END.toFixed(1)}, vCameraDistance) * ${(1 - STAR_DISTANCE_FAR_BRIGHTNESS).toFixed(2)};
  float shape = (halo * 0.5 + core * 1.1 + primaryRays * 0.5 + secondaryRays * 0.3) * footprint;
  float baseAlpha = min(shape * attenuation * uIntensity, 1.0);
  float alpha = baseAlpha * uEmphasis;
  vec3 luminousColor = mix(uColor, vec3(1.0), core * 0.62);
  gl_FragColor = vec4(luminousColor, alpha);
}
`;

export function colorFamilyColor(colorFamily: ColorFamily): string {
  return COLOR_FAMILIES[colorFamily];
}

export function componentPickRadius(component: Component): number {
  return Math.max(component.visual.marker_radius, component.visual.pick_radius);
}

export function componentVisibleRadius(
  component: Component,
  narrativeKnown: boolean,
): number {
  return (
    component.visual.marker_radius *
    (narrativeKnown ? NARRATIVE_VISIBLE_FOOTPRINT_SCALE : 1)
  );
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

/**
 * Derives bounded decorative optics from accepted presentation inputs and stable
 * component identity. These values are not physical stellar properties.
 */
export function starOpticalVariation(
  componentId: string,
  intensity: number,
): StarOpticalVariation {
  const hash = stableHash(componentId);
  const seed = hash / 0xffffffff;
  const secondarySeed = ((hash >>> 11) & 0xffff) / 0xffff;
  const prominence = clamp(intensity * (0.82 + seed * 0.36), 0, 1);
  const primaryRayStrength = smoothstep(0.32, 0.72, prominence);
  const secondaryRayStrength = smoothstep(0.7, 0.98, prominence);
  return {
    coreRadius: 0.15 + seed * 0.07,
    haloRadius: 0.52 + secondarySeed * 0.2,
    haloFalloff: 2.8 + seed * 1.4,
    primaryRayLength:
      primaryRayStrength === 0
        ? 0
        : (0.46 + secondarySeed * 0.36) * primaryRayStrength,
    primaryRayStrength,
    secondaryRayLength:
      secondaryRayStrength === 0
        ? 0
        : (0.34 + seed * 0.24) * secondaryRayStrength,
    secondaryRayStrength,
    rayTipSoftness: 0.07 + secondarySeed * 0.09,
  };
}

export function componentOffset(
  component: Component,
  index: number,
  componentCount: number,
): [number, number, number] {
  if (componentCount <= 1) return [0, 0, 0];
  const hash = stableHash(component.id);
  const angle =
    ((hash % 360) * Math.PI) / 180 + (index * Math.PI * 2) / componentCount;
  const radius = COMPONENT_OFFSET_RADIUS_MIN + ((hash >>> 9) % 4) * 0.0072;
  const elevation =
    (((hash >>> 17) % 7) - 3) * (COMPONENT_OFFSET_ELEVATION_MAX / 3);
  return [Math.cos(angle) * radius, elevation, Math.sin(angle) * radius];
}

export function selectionFrameSegments(
  half: number,
  corner: number,
): number[][] {
  return [
    [-half, half - corner, 0, -half, half, 0, -half + corner, half, 0],
    [half - corner, half, 0, half, half, 0, half, half - corner, 0],
    [-half, -half + corner, 0, -half, -half, 0, -half + corner, -half, 0],
    [half - corner, -half, 0, half, -half, 0, half, -half + corner, 0],
  ];
}

/** Screen-space ring segments for narrative state; they never alter map coordinates. */
export function narrativeRingSegments(
  horizontalRadius: number,
  verticalRadius: number,
): Array<Array<[number, number, number]>> {
  return Array.from({ length: 4 }, (_, index) => {
    const start = (index * Math.PI * 2) / 4 + 0.1;
    const end = ((index + 1) * Math.PI * 2) / 4 - 0.1;
    return Array.from({ length: 5 }, (_, pointIndex) => {
      const angle = start + ((end - start) * pointIndex) / 4;
      return [
        Math.cos(angle) * horizontalRadius,
        Math.sin(angle) * verticalRadius,
        0,
      ];
    });
  });
}

export function narrativeMarkerGeometry(active: boolean): {
  ringRadii: Array<[number, number]>;
  tick: [number, number] | null;
} {
  return active
    ? {
        ringRadii: [
          [0.23, 0.15],
          [0.29, 0.19],
        ],
        tick: [0.21, 0.29],
      }
    : { ringRadii: [], tick: null };
}

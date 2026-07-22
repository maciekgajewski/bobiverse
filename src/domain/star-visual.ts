import type { Component } from "./types";

export const MARKER_RADIUS_MIN = 0.065;
export const MARKER_RADIUS_MAX = 0.16;
export const VISUAL_RADIUS_MIN_SOLAR = 0.01;
export const VISUAL_RADIUS_MAX_SOLAR = 3;
export const COMPONENT_OFFSET_RADIUS_MIN = 0.036;
export const COMPONENT_OFFSET_RADIUS_MAX = 0.0576;
export const COMPONENT_OFFSET_ELEVATION_MAX = 0.0216;
export const STAR_DISTANCE_FADE_START = 6;
export const STAR_DISTANCE_FADE_END = 45;
export const STAR_DISTANCE_FAR_BRIGHTNESS = 0.35;

const SPECTRAL_COLORS = {
  O: "#9bbcff",
  B: "#b8ccff",
  A: "#e4edff",
  F: "#fff8e7",
  G: "#ffd884",
  K: "#ffac69",
  M: "#ff6b55",
  whiteDwarf: "#d9ecff",
  unknown: "#d8e6ff",
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
varying vec2 vUv;
varying float vCameraDistance;

void main() {
  float distanceFromCenter = length(vUv - 0.5) * 2.0;
  float halo = pow(max(1.0 - distanceFromCenter, 0.0), 2.2);
  float core = smoothstep(0.5, 0.0, distanceFromCenter);
  float attenuation = 1.0 - smoothstep(${STAR_DISTANCE_FADE_START.toFixed(1)}, ${STAR_DISTANCE_FADE_END.toFixed(1)}, vCameraDistance) * ${(1 - STAR_DISTANCE_FAR_BRIGHTNESS).toFixed(2)};
  float alpha = (halo * 0.7 + core * 0.3) * attenuation;
  gl_FragColor = vec4(uColor * (halo + core * 0.75), alpha);
}
`;

export function spectralColor(spectralClass: string): string {
  const normalized = spectralClass.trim().toUpperCase();
  if (normalized.startsWith("D")) return SPECTRAL_COLORS.whiteDwarf;
  if (["L", "T", "Y"].includes(normalized[0] ?? "")) {
    return SPECTRAL_COLORS.M;
  }
  const family = normalized[0] as keyof typeof SPECTRAL_COLORS;
  return SPECTRAL_COLORS[family] ?? SPECTRAL_COLORS.unknown;
}

export function markerRadius(radiusSolar: number): number {
  const limitedRadius = clamp(
    radiusSolar,
    VISUAL_RADIUS_MIN_SOLAR,
    VISUAL_RADIUS_MAX_SOLAR,
  );
  const minimum = Math.sqrt(VISUAL_RADIUS_MIN_SOLAR);
  const maximum = Math.sqrt(VISUAL_RADIUS_MAX_SOLAR);
  const normalized = (Math.sqrt(limitedRadius) - minimum) / (maximum - minimum);
  return (
    MARKER_RADIUS_MIN + normalized * (MARKER_RADIUS_MAX - MARKER_RADIUS_MIN)
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

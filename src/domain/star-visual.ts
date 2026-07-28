import type { ColorFamily, Component } from "./types";

export const COMPONENT_OFFSET_RADIUS_MIN = 0.036;
export const COMPONENT_OFFSET_RADIUS_MAX = 0.0576;
export const COMPONENT_OFFSET_ELEVATION_MAX = 0.0216;
export const STAR_DISTANCE_FADE_START = 6;
export const STAR_DISTANCE_FADE_END = 45;
export const STAR_DISTANCE_FAR_BRIGHTNESS = 0.35;
/** Reference-design cyan used for narrative-known, active, and selected map marks. */
export const NARRATIVE_MARKER_COLOR = "#67cacd";

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
varying vec2 vUv;
varying float vCameraDistance;

void main() {
  float distanceFromCenter = length(vUv - 0.5) * 2.0;
  float halo = pow(max(1.0 - distanceFromCenter, 0.0), 2.2);
  float core = smoothstep(0.5, 0.0, distanceFromCenter);
  float attenuation = 1.0 - smoothstep(${STAR_DISTANCE_FADE_START.toFixed(1)}, ${STAR_DISTANCE_FADE_END.toFixed(1)}, vCameraDistance) * ${(1 - STAR_DISTANCE_FAR_BRIGHTNESS).toFixed(2)};
  float alpha = (halo * 0.7 + core * 0.3) * attenuation * uIntensity;
  gl_FragColor = vec4(uColor * (halo + core * 0.75), alpha);
}
`;

export function colorFamilyColor(colorFamily: ColorFamily): string {
  return COLOR_FAMILIES[colorFamily];
}

export function componentPickRadius(component: Component): number {
  return Math.max(component.visual.marker_radius, component.visual.pick_radius);
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
    : { ringRadii: [[0.26, 0.17]], tick: null };
}

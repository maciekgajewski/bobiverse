import type { Component } from "./types";

export const MARKER_RADIUS_MIN = 0.065;
export const MARKER_RADIUS_MAX = 0.16;
export const VISUAL_RADIUS_MIN_SOLAR = 0.01;
export const VISUAL_RADIUS_MAX_SOLAR = 3;
export const COMPONENT_OFFSET_RADIUS_MIN = 0.018;
export const COMPONENT_OFFSET_RADIUS_MAX = 0.0288;
export const COMPONENT_OFFSET_ELEVATION_MAX = 0.0108;

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
  const radius = COMPONENT_OFFSET_RADIUS_MIN + ((hash >>> 9) % 4) * 0.0036;
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

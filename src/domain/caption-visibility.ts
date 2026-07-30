export interface CaptionCandidate {
  id: string;
  priority: number;
  x: number;
  y: number;
  visible: boolean;
}

/** Reserves selected, hovered-tooltip, and active slots above ordinary captions. */
export function resolveCaptionVisibility(
  candidates: readonly CaptionCandidate[],
  labelWidth = 144,
  labelHeight = 26,
): ReadonlySet<string> {
  const labels: { x: number; y: number }[] = [];
  const visible = new Set<string>();
  for (const candidate of [...candidates].sort(
    (left, right) =>
      right.priority - left.priority || left.id.localeCompare(right.id),
  )) {
    if (!candidate.visible) continue;
    const collides = labels.some(
      (label) =>
        Math.abs(label.x - candidate.x) < labelWidth &&
        Math.abs(label.y - candidate.y) < labelHeight,
    );
    if (candidate.priority > 0 || !collides) {
      visible.add(candidate.id);
      labels.push(candidate);
    }
  }
  return visible;
}

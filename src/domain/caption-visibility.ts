export interface CaptionCandidate {
  id: string;
  priority: number;
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

export const CAPTION_MIN_OPACITY = 0.3;
export const CAPTION_OPACITY_STEP = 0.35;

function overlaps(
  left: CaptionCandidate,
  right: CaptionCandidate,
  labelWidth: number,
  labelHeight: number,
): boolean {
  return (
    Math.abs(left.x - right.x) < labelWidth &&
    Math.abs(left.y - right.y) < labelHeight
  );
}

/**
 * Keeps every in-frustum caption mounted and fades deeper members of each connected
 * screen-space overlap group. Active and selected captions remain fully opaque;
 * hovered candidates still occupy their group rank while their tooltip is shown.
 */
export function resolveCaptionOpacities(
  candidates: readonly CaptionCandidate[],
  labelWidth = 144,
  labelHeight = 26,
): ReadonlyMap<string, number> {
  const visibleCandidates = candidates.filter((candidate) => candidate.visible);
  const byId = new Map(
    visibleCandidates.map((candidate) => [candidate.id, candidate]),
  );
  const visited = new Set<string>();
  const opacities = new Map<string, number>();

  for (const seed of [...visibleCandidates].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    if (visited.has(seed.id)) continue;
    const group: CaptionCandidate[] = [];
    const pending = [seed];
    visited.add(seed.id);
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) continue;
      group.push(current);
      for (const candidate of byId.values()) {
        if (
          !visited.has(candidate.id) &&
          overlaps(current, candidate, labelWidth, labelHeight)
        ) {
          visited.add(candidate.id);
          pending.push(candidate);
        }
      }
    }

    group
      .sort(
        (left, right) =>
          left.depth - right.depth || left.id.localeCompare(right.id),
      )
      .forEach((candidate, rank) => {
        const depthOpacity =
          rank >= 2 ? CAPTION_MIN_OPACITY : 1 - CAPTION_OPACITY_STEP * rank;
        const forcedOpaque =
          candidate.priority === 1 || candidate.priority === 3;
        opacities.set(candidate.id, forcedOpaque ? 1 : depthOpacity);
      });
  }

  return opacities;
}

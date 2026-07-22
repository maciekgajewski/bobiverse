interface MarkerIntersection {
  distance: number;
  object: {
    userData: {
      systemId?: unknown;
    };
  };
}

export function closestMarkerSystemId(
  intersections: readonly MarkerIntersection[],
): string | null {
  let closestId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const intersection of intersections) {
    const systemId = intersection.object.userData.systemId;
    if (
      typeof systemId !== "string" ||
      !Number.isFinite(intersection.distance) ||
      intersection.distance >= closestDistance
    ) {
      continue;
    }
    closestId = systemId;
    closestDistance = intersection.distance;
  }

  return closestId;
}

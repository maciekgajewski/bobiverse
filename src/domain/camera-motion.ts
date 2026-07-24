export const FOCUS_DURATION_MIN_MS = 300;
export const FOCUS_DURATION_MAX_MS = 850;
export const INITIAL_CAMERA_FRAME_MARGIN = 0.1;

interface Point3 {
  x: number;
  y: number;
  z: number;
}

function dot(left: Point3, right: Point3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function cross(left: Point3, right: Point3): Point3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

function normalized(vector: Point3): Point3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length === 0) throw new Error("Camera direction must be non-zero.");
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

/**
 * Returns a camera position along a documented viewing direction that fits every
 * point around the origin within the requested screen-edge margin.
 */
export function cameraPositionForFraming(
  points: readonly Point3[],
  viewingDirection: Point3,
  effectiveVerticalFovDegrees: number,
  aspectRatio: number,
  margin = INITIAL_CAMERA_FRAME_MARGIN,
): Point3 {
  if (points.length === 0) return viewingDirection;
  if (!(aspectRatio > 0))
    throw new Error("Camera aspect ratio must be positive.");
  if (!(margin >= 0 && margin < 0.5)) {
    throw new Error("Camera frame margin must be between 0 and 0.5.");
  }

  const direction = normalized(viewingDirection);
  const forward = { x: -direction.x, y: -direction.y, z: -direction.z };
  const worldUp = { x: 0, y: 1, z: 0 };
  const right = normalized(cross(forward, worldUp));
  const up = cross(right, forward);
  const verticalFovRadians = (effectiveVerticalFovDegrees * Math.PI) / 180;
  const verticalLimit = Math.tan(verticalFovRadians / 2) * (1 - 2 * margin);
  const horizontalLimit = verticalLimit * aspectRatio;

  const distance = Math.max(
    ...points.flatMap((point) => {
      const alongDirection = dot(point, direction);
      return [
        alongDirection + Math.abs(dot(point, right)) / horizontalLimit,
        alongDirection + Math.abs(dot(point, up)) / verticalLimit,
      ];
    }),
  );

  return {
    x: direction.x * distance,
    y: direction.y * distance,
    z: direction.z * distance,
  };
}

export function focusDurationMs(travelDistance: number): number {
  const normalizedDistance = Math.min(Math.max(travelDistance, 0) / 10, 1);
  return (
    FOCUS_DURATION_MIN_MS +
    normalizedDistance * (FOCUS_DURATION_MAX_MS - FOCUS_DURATION_MIN_MS)
  );
}

export function easeInOutQuad(progress: number): number {
  const limitedProgress = Math.min(Math.max(progress, 0), 1);
  return limitedProgress < 0.5
    ? 2 * limitedProgress * limitedProgress
    : 1 - (-2 * limitedProgress + 2) ** 2 / 2;
}

export function perspectiveWorldWidthAtTarget(
  cameraPosition: Point3,
  controlsTarget: Point3,
  effectiveVerticalFovDegrees: number,
  aspectRatio: number,
): number {
  const targetDistance = Math.hypot(
    cameraPosition.x - controlsTarget.x,
    cameraPosition.y - controlsTarget.y,
    cameraPosition.z - controlsTarget.z,
  );
  const verticalFovRadians = (effectiveVerticalFovDegrees * Math.PI) / 180;
  return 2 * targetDistance * Math.tan(verticalFovRadians / 2) * aspectRatio;
}

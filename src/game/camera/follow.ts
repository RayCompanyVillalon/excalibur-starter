export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CameraFollowConfig {
  deadzone: Point;
  /** Exponential smoothing rate, in 1/seconds. */
  smoothing: number;
}

/** Keep a camera focus inside the world, or center it if the world is smaller. */
export function clampFocus(value: number, halfViewport: number, worldSize: number): number {
  if (worldSize <= halfViewport * 2) {
    return worldSize / 2;
  }
  return Math.min(worldSize - halfViewport, Math.max(halfViewport, value));
}

/**
 * Follow `target` with a deadzone, then clamp to the world bounds.
 *
 * The camera only moves once the target leaves the deadzone, which stops small
 * movements from shaking the view. Smoothing is frame-rate independent.
 */
export function followCamera(
  current: Point,
  target: Point,
  viewport: Size,
  world: Size,
  config: CameraFollowConfig,
  dtMs: number,
): Point {
  const halfWidth = viewport.width / 2;
  const halfHeight = viewport.height / 2;

  let desiredX = current.x;
  let desiredY = current.y;

  if (target.x > current.x + config.deadzone.x) {
    desiredX = target.x - config.deadzone.x;
  } else if (target.x < current.x - config.deadzone.x) {
    desiredX = target.x + config.deadzone.x;
  }

  if (target.y > current.y + config.deadzone.y) {
    desiredY = target.y - config.deadzone.y;
  } else if (target.y < current.y - config.deadzone.y) {
    desiredY = target.y + config.deadzone.y;
  }

  desiredX = clampFocus(desiredX, halfWidth, world.width);
  desiredY = clampFocus(desiredY, halfHeight, world.height);

  const t = 1 - Math.exp(-config.smoothing * (dtMs / 1000));
  const x = current.x + (desiredX - current.x) * t;
  const y = current.y + (desiredY - current.y) * t;

  return {
    x: clampFocus(x, halfWidth, world.width),
    y: clampFocus(y, halfHeight, world.height),
  };
}

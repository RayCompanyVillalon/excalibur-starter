/** Clamp `value` into the inclusive range [`min`, `max`]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Move `current` toward `target` by at most `delta`.
 * Used for acceleration and friction so movement is frame-rate independent.
 */
export function approach(current: number, target: number, delta: number): number {
  const step = Math.max(0, delta);
  if (current < target) {
    return Math.min(current + step, target);
  }
  if (current > target) {
    return Math.max(current - step, target);
  }
  return target;
}

/** Snap values below `epsilon` to zero, so tiny drift doesn't accumulate. */
export function deadzone(value: number, epsilon = 0.01): number {
  return Math.abs(value) < epsilon ? 0 : value;
}

/** Linear interpolation from `a` to `b` by `t` in [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent smoothing toward `target`.
 * `rate` is in 1/seconds; larger values snap faster.
 */
export function damp(current: number, target: number, rate: number, dtSeconds: number): number {
  return lerp(current, target, 1 - Math.exp(-rate * dtSeconds));
}

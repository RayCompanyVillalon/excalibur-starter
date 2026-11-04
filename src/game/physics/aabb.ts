/** Axis-aligned rectangle in world pixels. */
export interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function aabb(x: number, y: number, width: number, height: number): Aabb {
  return { x, y, width, height };
}

/**
 * Strict overlap test: rectangles that only share an edge do not overlap.
 * This matters for collision resolution, where resting on a surface must
 * not count as being inside it.
 */
export function overlaps(a: Aabb, b: Aabb): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function containsPoint(box: Aabb, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

/** Horizontal center of a box. */
export function centerX(box: Aabb): number {
  return box.x + box.width / 2;
}

/** Vertical center of a box. */
export function centerY(box: Aabb): number {
  return box.y + box.height / 2;
}

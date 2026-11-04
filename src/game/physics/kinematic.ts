import { type Aabb, overlaps } from './aabb';

/** A moving rectangle driven by velocity, resolved against static solids. */
export interface KinematicBody {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

export interface MoveResult {
  onGround: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

/** Largest distance (px) moved per collision substep. */
const MAX_SUBSTEP = 8;

export function bodyAabb(body: KinematicBody): Aabb {
  return { x: body.x, y: body.y, width: body.width, height: body.height };
}

/**
 * Integrate `body` for `dtSeconds` and push it out of any solid it enters.
 *
 * Movement is axis-separated (X, then Y) and sub-stepped, which keeps fast
 * falls from tunnelling through thin platforms and makes landing/wall contact
 * deterministic enough to unit test.
 */
export function moveAndCollide(
  body: KinematicBody,
  solids: readonly Aabb[],
  dtSeconds: number,
  maxSubstep = MAX_SUBSTEP,
): MoveResult {
  const dx = body.vx * dtSeconds;
  const dy = body.vy * dtSeconds;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxSubstep));
  const stepX = dx / steps;
  const stepY = dy / steps;

  const result: MoveResult = { onGround: false, hitCeiling: false, hitWall: false };

  for (let i = 0; i < steps; i += 1) {
    if (stepX !== 0) {
      body.x += stepX;
      if (resolveAxis(body, solids, 'x', stepX)) {
        result.hitWall = true;
      }
    }

    if (stepY !== 0) {
      body.y += stepY;
      if (resolveAxis(body, solids, 'y', stepY)) {
        if (stepY > 0) {
          result.onGround = true;
        } else {
          result.hitCeiling = true;
        }
      }
    }
  }

  // Standing still produces no Y movement, so probe just below the feet.
  if (!result.onGround && probeGround(body, solids)) {
    result.onGround = true;
  }

  return result;
}

function resolveAxis(
  body: KinematicBody,
  solids: readonly Aabb[],
  axis: 'x' | 'y',
  direction: number,
): boolean {
  const box = bodyAabb(body);
  let target: number | null = null;

  for (const solid of solids) {
    if (!overlaps(box, solid)) {
      continue;
    }

    let candidate: number;
    if (axis === 'x') {
      candidate = direction > 0 ? solid.x - body.width : solid.x + solid.width;
    } else {
      candidate = direction > 0 ? solid.y - body.height : solid.y + solid.height;
    }

    if (target === null) {
      target = candidate;
    } else {
      target = direction > 0 ? Math.min(target, candidate) : Math.max(target, candidate);
    }
  }

  if (target === null) {
    return false;
  }

  if (axis === 'x') {
    body.x = target;
    body.vx = 0;
  } else {
    body.y = target;
    body.vy = 0;
  }
  return true;
}

function probeGround(body: KinematicBody, solids: readonly Aabb[]): boolean {
  const probe: Aabb = {
    x: body.x,
    y: body.y + 1,
    width: body.width,
    height: body.height,
  };
  return solids.some((solid) => overlaps(probe, solid));
}

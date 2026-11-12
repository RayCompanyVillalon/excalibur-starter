import { GAME } from '../config';
import { approach } from '../math';
import type { Aabb } from '../physics/aabb';
import { moveAndCollide, type KinematicBody } from '../physics/kinematic';

/** Per-frame input, already reduced to platformer intent. */
export interface Intent {
  /** -1, 0 or 1. */
  moveX: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  /** Shift pressed this frame. */
  dashPressed: boolean;
}

export interface PlayerState {
  body: KinematicBody;
  onGround: boolean;
  /** Milliseconds of coyote time left after walking off a ledge. */
  coyoteMs: number;
  /** Milliseconds a jump press stays queued before landing. */
  jumpBufferMs: number;
  jumpHeld: boolean;
  facing: 1 | -1;
  /** Milliseconds of dash left; 0 means not dashing. */
  dashMsLeft: number;
  /** Milliseconds before another dash is allowed. */
  dashCooldownMs: number;
  dashDir: 1 | -1;
  /** One air dash per airtime, refreshed when the player touches ground. */
  airDashReady: boolean;
}

/** Build a player standing with its feet at `spawn` (bottom-center). */
export function createPlayerState(spawn: { x: number; y: number }): PlayerState {
  const { width, height } = GAME.player;
  return {
    body: {
      x: spawn.x - width / 2,
      y: spawn.y - height,
      width,
      height,
      vx: 0,
      vy: 0,
    },
    onGround: false,
    coyoteMs: 0,
    jumpBufferMs: 0,
    jumpHeld: false,
    facing: 1,
    dashMsLeft: 0,
    dashCooldownMs: 0,
    dashDir: 1,
    airDashReady: true,
  };
}

/**
 * Advance the player one fixed step. Mutates and returns `state`, so callers
 * can keep one state object per player.
 */
export function stepPlayer(
  state: PlayerState,
  intent: Intent,
  solids: readonly Aabb[],
  dtMs: number,
): PlayerState {
  const dt = dtMs / 1000;
  const cfg = GAME.player;
  const dashCfg = GAME.dash;

  // Timers. While grounded, coyote time is topped up so a jump is always
  // available; once airborne it counts down.
  state.coyoteMs = state.onGround ? cfg.coyoteMs : Math.max(0, state.coyoteMs - dtMs);
  state.jumpBufferMs = intent.jumpPressed
    ? cfg.jumpBufferMs
    : Math.max(0, state.jumpBufferMs - dtMs);
  state.dashCooldownMs = Math.max(0, state.dashCooldownMs - dtMs);
  state.dashMsLeft = Math.max(0, state.dashMsLeft - dtMs);
  if (state.onGround) {
    state.airDashReady = true;
  }

  if (intent.moveX !== 0) {
    state.facing = intent.moveX > 0 ? 1 : -1;
  }

  // Start a dash: grounded dashes are free, air dashes are once per airtime.
  if (
    intent.dashPressed &&
    state.dashMsLeft <= 0 &&
    state.dashCooldownMs <= 0 &&
    (state.onGround || state.airDashReady)
  ) {
    state.dashMsLeft = dashCfg.durationMs;
    state.dashCooldownMs = dashCfg.cooldownMs;
    state.dashDir = intent.moveX > 0 ? 1 : intent.moveX < 0 ? -1 : state.facing;
    state.facing = state.dashDir;
    if (!state.onGround) {
      state.airDashReady = false;
    }
  }

  const dashing = state.dashMsLeft > 0;

  if (dashing) {
    // A dash is a flat burst: no gravity, no steering, no jump.
    state.body.vx = state.dashDir * dashCfg.speed;
    state.body.vy = 0;
  } else {
    // Horizontal acceleration toward the run speed.
    const targetVx = intent.moveX * cfg.runSpeed;
    let accel: number;
    if (state.onGround) {
      accel = intent.moveX !== 0 ? cfg.groundAccel : cfg.groundFriction;
    } else {
      accel = intent.moveX !== 0 ? cfg.airAccel : cfg.airDrag;
    }
    state.body.vx = approach(state.body.vx, targetVx, accel * dt);

    // Jump when a buffered press meets grounded or coyote time.
    if (state.jumpBufferMs > 0 && state.coyoteMs > 0) {
      state.body.vy = -cfg.jumpSpeed;
      state.jumpBufferMs = 0;
      state.coyoteMs = 0;
      state.onGround = false;
      state.jumpHeld = true;
    }

    // Releasing early cuts the jump short for variable height.
    if (state.jumpHeld && !intent.jumpHeld) {
      if (state.body.vy < 0) {
        state.body.vy *= cfg.jumpCut;
      }
      state.jumpHeld = false;
    }
    if (state.body.vy >= 0) {
      state.jumpHeld = false;
    }

    // Gravity, capped at terminal velocity.
    state.body.vy = Math.min(
      state.body.vy + GAME.physics.gravity * dt,
      GAME.physics.maxFallSpeed,
    );
  }

  const result = moveAndCollide(state.body, solids, dt);
  state.onGround = result.onGround;

  // Slamming into a wall or ceiling ends the dash early.
  if (dashing && (result.hitWall || result.hitCeiling)) {
    state.dashMsLeft = 0;
  }
  if (state.onGround) {
    state.airDashReady = true;
  }

  return state;
}

/**
 * Launch the player upward after stomping an enemy. Any active dash is
 * cancelled so the bounce reads as a clean hop rather than a flat burst.
 */
export function bouncePlayer(state: PlayerState, speed: number): void {
  state.body.vy = -speed;
  state.dashMsLeft = 0;
  state.onGround = false;
  state.jumpHeld = false;
  state.coyoteMs = 0;
  state.jumpBufferMs = 0;
}

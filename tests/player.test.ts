import { describe, expect, it } from 'vitest';
import { GAME } from '../src/game/config';
import { aabb } from '../src/game/physics/aabb';
import {
  createPlayerState,
  stepPlayer,
  type Intent,
  type PlayerState,
} from '../src/game/player/controller';

const DT = 1000 / 60;
const GROUND = aabb(0, 100, 2000, 40);
const SPAWN = { x: 100, y: 100 };

const IDLE: Intent = { moveX: 0, jumpPressed: false, jumpHeld: false };

/** A player resting on the ground with coyote time topped up. */
function grounded(): PlayerState {
  const state = createPlayerState(SPAWN);
  state.onGround = true;
  state.coyoteMs = GAME.player.coyoteMs;
  return state;
}

function airborne(y: number, vy = 0): PlayerState {
  const state = createPlayerState(SPAWN);
  state.body.y = y;
  state.body.vy = vy;
  state.onGround = false;
  return state;
}

describe('stepPlayer', () => {
  it('accelerates to the run speed', () => {
    const state = grounded();
    const run: Intent = { moveX: 1, jumpPressed: false, jumpHeld: false };

    for (let i = 0; i < 60; i += 1) {
      stepPlayer(state, run, [GROUND], DT);
    }

    expect(state.body.vx).toBeCloseTo(GAME.player.runSpeed, 0);
    expect(state.body.x).toBeGreaterThan(SPAWN.x - GAME.player.width / 2);
  });

  it('applies gravity in the air', () => {
    const state = airborne(0);
    stepPlayer(state, IDLE, [], DT);

    expect(state.body.vy).toBeGreaterThan(0);
    expect(state.body.y).toBeGreaterThan(0);
  });

  it('caps fall speed at terminal velocity', () => {
    const state = airborne(0, 5000);
    stepPlayer(state, IDLE, [], 1000);

    expect(state.body.vy).toBe(GAME.physics.maxFallSpeed);
  });

  it('jumps from the ground', () => {
    const state = grounded();
    stepPlayer(state, { moveX: 0, jumpPressed: true, jumpHeld: true }, [GROUND], DT);

    expect(state.body.vy).toBeLessThan(-GAME.player.jumpSpeed + 100);
    expect(state.onGround).toBe(false);
  });

  it('cuts the jump short when the button is released', () => {
    const state = grounded();
    stepPlayer(state, { moveX: 0, jumpPressed: true, jumpHeld: true }, [GROUND], DT);
    const peakSpeed = state.body.vy;

    stepPlayer(state, { moveX: 0, jumpPressed: false, jumpHeld: false }, [GROUND], DT);

    expect(state.body.vy).toBeGreaterThan(peakSpeed);
    expect(state.body.vy).toBeGreaterThan(-GAME.player.jumpSpeed * 0.6);
  });

  it('allows a jump just after walking off a ledge (coyote time)', () => {
    const state = grounded();
    state.onGround = false;
    state.coyoteMs = GAME.player.coyoteMs;

    stepPlayer(state, IDLE, [], 50);
    expect(state.coyoteMs).toBeGreaterThan(0);

    stepPlayer(state, { moveX: 0, jumpPressed: true, jumpHeld: true }, [], DT);
    expect(state.body.vy).toBeLessThan(0);
  });

  it('refuses the jump once coyote time has expired', () => {
    const state = airborne(0);
    state.coyoteMs = 0;

    stepPlayer(state, { moveX: 0, jumpPressed: true, jumpHeld: true }, [], DT);

    expect(state.body.vy).toBeGreaterThan(0);
  });

  it('queues a jump pressed just before landing (jump buffer)', () => {
    const state = airborne(100 - GAME.player.height - 5);
    stepPlayer(state, { moveX: 0, jumpPressed: true, jumpHeld: true }, [GROUND], DT);
    expect(state.jumpBufferMs).toBeGreaterThan(0);

    let jumped = false;
    for (let i = 0; i < 20 && !jumped; i += 1) {
      stepPlayer(state, { moveX: 0, jumpPressed: false, jumpHeld: true }, [GROUND], DT);
      if (state.body.vy < 0) {
        jumped = true;
      }
    }

    expect(jumped).toBe(true);
  });

  it('lands on the ground and clears vertical speed', () => {
    const state = airborne(100 - GAME.player.height - 20, 300);

    for (let i = 0; i < 30 && !state.onGround; i += 1) {
      stepPlayer(state, IDLE, [GROUND], DT);
    }

    expect(state.onGround).toBe(true);
    expect(state.body.vy).toBe(0);
    expect(state.body.y).toBe(100 - GAME.player.height);
  });
});

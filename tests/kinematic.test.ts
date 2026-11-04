import { describe, expect, it } from 'vitest';
import { aabb } from '../src/game/physics/aabb';
import { moveAndCollide, type KinematicBody } from '../src/game/physics/kinematic';

const WIDTH = 24;
const HEIGHT = 40;

function body(x: number, y: number, vx = 0, vy = 0): KinematicBody {
  return { x, y, width: WIDTH, height: HEIGHT, vx, vy };
}

describe('moveAndCollide', () => {
  const ground = aabb(0, 100, 400, 20);

  it('lands exactly on top of a solid and stops falling', () => {
    const player = body(10, 0, 0, 400);
    const result = moveAndCollide(player, [ground], 1);

    expect(player.y).toBe(100 - HEIGHT);
    expect(player.vy).toBe(0);
    expect(result.onGround).toBe(true);
  });

  it('does not tunnel through a thin platform at high speed', () => {
    const player = body(10, 0, 0, 5000);
    const result = moveAndCollide(player, [ground], 0.05);

    expect(player.y).toBe(100 - HEIGHT);
    expect(result.onGround).toBe(true);
  });

  it('stops flush against a wall', () => {
    const wall = aabb(200, 0, 20, 400);
    const player = body(0, 0, 500, 0);
    const result = moveAndCollide(player, [wall], 0.5);

    expect(player.x).toBe(200 - WIDTH);
    expect(player.vx).toBe(0);
    expect(result.hitWall).toBe(true);
  });

  it('stops flush under a ceiling', () => {
    const ceiling = aabb(0, 0, 400, 20);
    const player = body(10, 100, 0, -500);
    const result = moveAndCollide(player, [ceiling], 0.5);

    expect(player.y).toBe(20);
    expect(player.vy).toBe(0);
    expect(result.hitCeiling).toBe(true);
  });

  it('is grounded when resting on a surface', () => {
    const player = body(10, 100 - HEIGHT);
    const result = moveAndCollide(player, [ground], 1 / 60);

    expect(result.onGround).toBe(true);
  });

  it('is not grounded after walking off a ledge', () => {
    const ledge = aabb(0, 100, 50, 20);
    const player = body(100, 100 - HEIGHT);
    const result = moveAndCollide(player, [ledge], 1 / 60);

    expect(result.onGround).toBe(false);
  });

  it('does not move when velocity is zero', () => {
    const player = body(10, 60);
    const result = moveAndCollide(player, [ground], 1 / 60);

    expect(player.x).toBe(10);
    expect(player.y).toBe(60);
    expect(result.onGround).toBe(true);
  });
});

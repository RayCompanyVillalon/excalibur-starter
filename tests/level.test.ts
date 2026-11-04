import { describe, expect, it } from 'vitest';
import { GAME } from '../src/game/config';
import { LEVEL_MAP, parseLevel } from '../src/game/level/level';
import type { Aabb } from '../src/game/physics/aabb';

describe('parseLevel', () => {
  const level = parseLevel(LEVEL_MAP);

  it('sizes the world in tiles and pixels', () => {
    expect(level.tile).toBe(GAME.world.tile);
    expect(level.width).toBe(60);
    expect(level.height).toBe(24);
    expect(level.widthPx).toBe(60 * GAME.world.tile);
    expect(level.heightPx).toBe(24 * GAME.world.tile);
  });

  it('places the spawn at the bottom-center of the P tile', () => {
    expect(level.spawn.x).toBe(2.5 * GAME.world.tile);
    expect(level.spawn.y).toBe(21 * GAME.world.tile);
  });

  it('places the goal on the G tile', () => {
    expect(level.goal.x).toBe(55 * GAME.world.tile);
    expect(level.goal.y).toBe(8 * GAME.world.tile);
    expect(level.goal.width).toBe(GAME.world.tile);
    expect(level.goal.height).toBe(GAME.world.tile);
  });

  it('merges horizontal runs of solid tiles', () => {
    const byRow = new Map<number, Aabb[]>();
    for (const solid of level.solids) {
      const row = byRow.get(solid.y) ?? [];
      row.push(solid);
      byRow.set(solid.y, row);
    }

    expect(byRow.size).toBeGreaterThan(0);
    for (const row of byRow.values()) {
      row.sort((a, b) => a.x - b.x);
      for (let i = 1; i < row.length; i += 1) {
        const previous = row[i - 1]!;
        const current = row[i]!;
        expect(previous.x + previous.width).toBeLessThan(current.x);
      }
    }
  });

  it('does not include spawn or goal tiles in the solids', () => {
    const spawnTile = { x: 2 * GAME.world.tile, y: 20 * GAME.world.tile };
    const goalTile = { x: 55 * GAME.world.tile, y: 8 * GAME.world.tile };
    const hits = (tile: { x: number; y: number }) =>
      level.solids.some(
        (solid) =>
          solid.x <= tile.x &&
          solid.x + solid.width >= tile.x + GAME.world.tile &&
          solid.y === tile.y,
      );

    expect(hits(spawnTile)).toBe(false);
    expect(hits(goalTile)).toBe(false);
  });
});

describe('parseLevel validation', () => {
  it('pads short rows with air', () => {
    const level = parseLevel(['P.G']);
    expect(level.width).toBe(3);
    expect(level.solids).toHaveLength(0);
    expect(level.goal.x).toBe(2 * GAME.world.tile);
  });

  it('rejects unknown tiles', () => {
    expect(() => parseLevel(['P?G'])).toThrow(/Unknown level tile/);
  });

  it('requires a spawn', () => {
    expect(() => parseLevel(['G'])).toThrow(/spawn/);
  });

  it('requires a goal', () => {
    expect(() => parseLevel(['P'])).toThrow(/goal/);
  });

  it('rejects duplicate spawns', () => {
    expect(() => parseLevel(['PPG'])).toThrow(/more than one spawn/);
  });

  it('rejects duplicate goals', () => {
    expect(() => parseLevel(['PGG'])).toThrow(/more than one goal/);
  });

  it('rejects empty maps', () => {
    expect(() => parseLevel([])).toThrow(/empty/);
  });
});

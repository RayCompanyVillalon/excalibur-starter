import { describe, expect, it } from 'vitest';
import { GAME } from '../src/game/config';
import { parseLevel } from '../src/game/level/level';
import { LEVELS } from '../src/game/level/levels';
import type { Aabb } from '../src/game/physics/aabb';

describe('parseLevel', () => {
  const level = parseLevel(LEVELS[0]!.map);

  it('sizes the world in tiles and pixels', () => {
    expect(level.tile).toBe(GAME.world.tile);
    expect(level.width).toBe(140);
    expect(level.height).toBe(32);
    expect(level.widthPx).toBe(140 * GAME.world.tile);
    expect(level.heightPx).toBe(32 * GAME.world.tile);
  });

  it('places the spawn at the bottom-center of the P tile', () => {
    expect(level.spawn.x).toBe(2.5 * GAME.world.tile);
    expect(level.spawn.y).toBe(29 * GAME.world.tile);
  });

  it('places the goal on the G tile', () => {
    expect(level.goal.x).toBe(137 * GAME.world.tile);
    expect(level.goal.y).toBe(15 * GAME.world.tile);
    expect(level.goal.width).toBe(GAME.world.tile);
    expect(level.goal.height).toBe(GAME.world.tile);
  });

  it('collects spikes and the ingredient', () => {
    expect(level.spikes).toHaveLength(7);
    expect(level.collectibles).toHaveLength(1);
    expect(level.collectibles[0]).toEqual({ x: 90.5 * GAME.world.tile, y: 6.5 * GAME.world.tile });
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

  it('does not include spawn, goal, spike or ingredient tiles in the solids', () => {
    const tiles = [
      { x: 2 * GAME.world.tile, y: 28 * GAME.world.tile },
      { x: 137 * GAME.world.tile, y: 15 * GAME.world.tile },
      { x: 6 * GAME.world.tile, y: 28 * GAME.world.tile },
      { x: 90 * GAME.world.tile, y: 6 * GAME.world.tile },
    ];
    const hits = (tile: { x: number; y: number }) =>
      level.solids.some(
        (solid) =>
          solid.y === tile.y &&
          solid.x <= tile.x &&
          solid.x + solid.width >= tile.x + GAME.world.tile,
      );

    for (const tile of tiles) {
      expect(hits(tile)).toBe(false);
    }
  });
});

describe('Level 2', () => {
  const info = LEVELS[1]!;
  const level = parseLevel(info.map);

  it('is longer and taller than Level 1', () => {
    expect(level.width).toBe(180);
    expect(level.height).toBe(36);
    expect(info.ingredient).toBe('Tomato');
  });

  it('carries the tomato above the tower ledge', () => {
    expect(level.collectibles).toHaveLength(1);
    expect(level.collectibles[0]).toEqual({
      x: 122.5 * GAME.world.tile,
      y: 7.5 * GAME.world.tile,
    });
    expect(level.spikes).toHaveLength(8);
  });

  it('ships mushrooms, land mines and moving hazards', () => {
    const count = (marker: string): number =>
      info.map.reduce(
        (total, row) => total + [...row].filter((cell) => cell === marker).length,
        0,
      );

    expect(count('M')).toBe(8);
    expect(count('L')).toBe(7);
    expect(info.platforms?.length).toBe(4);
    expect(info.saws?.length).toBe(4);
    expect(info.cannons?.length).toBe(3);
  });

  it('keeps enemies and mines off the solid tiles', () => {
    for (let row = 0; row < info.map.length; row += 1) {
      const line = info.map[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'M' && line[col] !== 'L') {
          continue;
        }
        expect((info.map[row + 1] ?? '')[col]).toBe('#');
      }
    }
  });
});

describe('Level 3', () => {
  const info = LEVELS[2]!;
  const level = parseLevel(info.map);

  it('is the biggest level so far and rewards the lettuce', () => {
    expect(level.width).toBe(200);
    expect(level.height).toBe(40);
    expect(info.ingredient).toBe('Lettuce');
  });

  it('keeps every map row the same width', () => {
    expect(new Set(info.map.map((row) => row.length)).size).toBe(1);
  });

  it('carries the lettuce above the tower', () => {
    expect(level.collectibles).toHaveLength(1);
    expect(level.collectibles[0]).toEqual({
      x: 128.5 * GAME.world.tile,
      y: 12.5 * GAME.world.tile,
    });
  });

  it('ships mushrooms, mines, spikes and moving hazards', () => {
    const count = (marker: string): number =>
      info.map.reduce(
        (total, row) => total + [...row].filter((cell) => cell === marker).length,
        0,
      );

    expect(count('M')).toBe(9);
    expect(count('L')).toBe(10);
    expect(count('S')).toBe(33);
    expect(info.platforms?.length).toBe(4);
    expect(info.saws?.length).toBe(7);
    expect(info.cannons?.length).toBe(3);
  });

  it('defines the worm arena on the final ground run', () => {
    expect(info.boss).toEqual({ left: 40, right: 193, groundRow: 37 });
    expect(info.boss!.right).toBeLessThan(level.width);
    expect(info.boss!.groundRow).toBeLessThan(level.height);
  });

  it('keeps enemies and mines off the solid tiles', () => {
    for (let row = 0; row < info.map.length; row += 1) {
      const line = info.map[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'M' && line[col] !== 'L') {
          continue;
        }
        expect((info.map[row + 1] ?? '')[col]).toBe('#');
      }
    }
  });
});

describe('parseLevel validation', () => {
  it('pads short rows with air', () => {
    const level = parseLevel(['P.G']);
    expect(level.width).toBe(3);
    expect(level.solids).toHaveLength(0);
    expect(level.goal.x).toBe(2 * GAME.world.tile);
  });

  it('accepts enemy and land-mine markers as air', () => {
    const level = parseLevel(['P.MG', 'L...']);
    expect(level.solids).toHaveLength(0);
    expect(level.spawn.x).toBe(0.5 * GAME.world.tile);
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

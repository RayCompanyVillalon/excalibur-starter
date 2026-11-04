import { describe, expect, it } from 'vitest';
import { autotile, decorationFor, isSolid } from '../src/game/level/terrain';

function gridFrom(rows: readonly string[]): boolean[][] {
  return rows.map((row) => [...row].map((cell) => cell === '#'));
}

describe('isSolid', () => {
  it('reads inside the grid', () => {
    const grid = gridFrom(['.#', '..']);
    expect(isSolid(grid, 1, 0)).toBe(true);
    expect(isSolid(grid, 0, 0)).toBe(false);
  });

  it('treats out-of-bounds cells as air', () => {
    const grid = gridFrom(['#']);
    expect(isSolid(grid, -1, 0)).toBe(false);
    expect(isSolid(grid, 0, 5)).toBe(false);
  });
});

describe('autotile', () => {
  it('picks the grass top for an isolated block', () => {
    const grid = gridFrom(['.', '#', '.']);
    expect(autotile(grid, 0, 1)).toEqual({ column: 0, row: 0 });
  });

  it('picks the middle row when covered above and below', () => {
    const grid = gridFrom(['#', '#', '#']);
    expect(autotile(grid, 0, 1)).toEqual({ column: 0, row: 1 });
  });

  it('picks the bottom row when nothing is below', () => {
    const grid = gridFrom(['#', '#', '.']);
    expect(autotile(grid, 0, 1)).toEqual({ column: 0, row: 2 });
  });

  it('picks the right edge when the right neighbour is air', () => {
    const grid = gridFrom(['##.', '##.', '##.']);
    expect(autotile(grid, 0, 1)).toEqual({ column: 0, row: 1 });
    expect(autotile(grid, 1, 1)).toEqual({ column: 2, row: 1 });
  });

  it('picks the centre tile for a fully surrounded block', () => {
    const grid = gridFrom(['###', '###', '###']);
    expect(autotile(grid, 1, 1)).toEqual({ column: 1, row: 1 });
  });
});

describe('decorationFor', () => {
  it('is deterministic', () => {
    for (let col = 0; col < 20; col += 1) {
      expect(decorationFor(col, 5)).toEqual(decorationFor(col, 5));
    }
  });

  it('only returns decoration rows from the atlas', () => {
    for (let col = 0; col < 60; col += 1) {
      for (let row = 0; row < 24; row += 1) {
        const decor = decorationFor(col, row);
        if (decor) {
          expect(decor.row).toBeGreaterThanOrEqual(3);
          expect(decor.row).toBeLessThanOrEqual(6);
          expect(decor.column).toBeGreaterThanOrEqual(0);
          expect(decor.column).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('leaves some surfaces bare', () => {
    const values = Array.from({ length: 200 }, (_, i) => decorationFor(i, 9));
    expect(values.some((value) => value === null)).toBe(true);
    expect(values.some((value) => value !== null)).toBe(true);
  });
});

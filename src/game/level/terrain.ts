import type { ImageSource } from 'excalibur';

import { GAME } from '../config';
import type { LevelData } from './level';

/** Atlas layout of the C32 ground sheet: 3x7 tiles of 16x16. */
const CORE_COLS = 3;

const DECOR_ROWS = [3, 4, 5, 6] as const;

export interface AtlasCell {
  column: number;
  row: number;
}

/** True when a map cell is solid; out-of-bounds is treated as air. */
export function isSolid(grid: readonly boolean[][], col: number, row: number): boolean {
  return grid[row]?.[col] ?? false;
}

/**
 * Pick a 3x3 block tile from the ground atlas based on which neighbours are
 * solid. Row 0 is the grass top, 1 the middle and 2 the shaded bottom; column
 * 0/1/2 is the left/center/right edge.
 */
export function autotile(grid: readonly boolean[][], col: number, row: number): AtlasCell {
  const up = isSolid(grid, col, row - 1);
  const down = isSolid(grid, col, row + 1);
  const left = isSolid(grid, col - 1, row);
  const right = isSolid(grid, col + 1, row);

  const atlasRow = !up ? 0 : !down ? 2 : 1;
  const atlasColumn = !left ? 0 : !right ? 2 : 1;

  return { column: atlasColumn, row: atlasRow };
}

/** Small deterministic hash so decorations are stable between runs. */
function hash(col: number, row: number): number {
  let value = (col * 374761393 + row * 668265263) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

/**
 * Pick an optional decoration tile that grows on top of a grass surface.
 * Rows 3-6 of the atlas are tufts, rocks, plants and grass.
 */
export function decorationFor(col: number, row: number): AtlasCell | null {
  const roll = hash(col, row) % 100;
  if (roll >= 38) {
    return null;
  }

  const decorRow = DECOR_ROWS[hash(row, col) % DECOR_ROWS.length] ?? 3;
  const decorColumn = hash(col + 7, row + 3) % CORE_COLS;
  return { column: decorColumn, row: decorRow };
}

/**
 * Composite the whole level into one canvas: terrain with autotiled edges,
 * plus deterministic surface decorations. Returns the canvas so the scene can
 * wrap it in an Excalibur sprite.
 */
export function renderTerrain(level: LevelData, sheet: ImageSource): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = level.widthPx;
  canvas.height = level.heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const image = sheet.image;
  const cell = level.tile;
  const srcSize = GAME.art.tile;
  const dstSize = srcSize * GAME.art.scale;

  for (let row = 0; row < level.height; row += 1) {
    for (let col = 0; col < level.width; col += 1) {
      if (!isSolid(level.grid, col, row)) {
        continue;
      }
      const atlas = autotile(level.grid, col, row);
      ctx.drawImage(
        image,
        atlas.column * srcSize,
        atlas.row * srcSize,
        srcSize,
        srcSize,
        col * cell,
        row * cell,
        dstSize,
        dstSize,
      );
    }
  }

  // Decorations sit in the air cell directly above a grass surface.
  for (let row = 1; row < level.height; row += 1) {
    for (let col = 0; col < level.width; col += 1) {
      if (!isSolid(level.grid, col, row) || isSolid(level.grid, col, row - 1)) {
        continue;
      }
      const decor = decorationFor(col, row);
      if (!decor) {
        continue;
      }
      ctx.drawImage(
        image,
        decor.column * srcSize,
        decor.row * srcSize,
        srcSize,
        srcSize,
        col * cell,
        (row - 1) * cell,
        dstSize,
        dstSize,
      );
    }
  }

  return canvas;
}

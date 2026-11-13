import type { ImageSource } from 'excalibur';

import { GAME } from '../config';
import type { LevelData } from './level';

/** Atlas layout of the C32 ground sheet: 3x7 tiles of 16x16. */
const CORE_COLS = 3;

const DECOR_ROWS = [3, 4, 5, 6] as const;

/** Widest texture a chunk may use. Keeps every GPU happy (max size 2048). */
export const TERRAIN_CHUNK_WIDTH = 2048;

export interface AtlasCell {
  column: number;
  row: number;
}

export interface TerrainChunk {
  /** World-space x of this chunk's left edge. */
  x: number;
  canvas: HTMLCanvasElement;
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
 * Composite the level into horizontal chunks: terrain with autotiled edges,
 * plus deterministic surface decorations.
 *
 * Painting straight into the chunks (instead of one level-sized canvas and
 * then copying) keeps peak memory low: Level 3 is 6400×1280 px, which is 32 MB
 * of RGBA for the full canvas alone.
 */
export function renderTerrainChunks(
  level: LevelData,
  sheet: ImageSource,
  chunkWidth = TERRAIN_CHUNK_WIDTH,
): TerrainChunk[] {
  const chunks: TerrainChunk[] = [];

  for (let x = 0; x < level.widthPx; x += chunkWidth) {
    const width = Math.min(chunkWidth, level.widthPx - x);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = level.heightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    ctx.imageSmoothingEnabled = false;

    paintTerrain(ctx, level, sheet.image, x, width);
    chunks.push({ x, canvas });
  }

  return chunks;
}

/** Draw the terrain and decorations that fall inside `[offsetX, offsetX+width)`. */
function paintTerrain(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  image: CanvasImageSource,
  offsetX: number,
  width: number,
): void {
  const cell = level.tile;
  const srcSize = GAME.art.tile;
  const dstSize = srcSize * GAME.art.scale;
  const firstCol = Math.max(0, Math.floor(offsetX / cell));
  const lastCol = Math.min(level.width - 1, Math.ceil((offsetX + width) / cell) - 1);
  const drawX = (col: number): number => col * cell - offsetX;

  for (let row = 0; row < level.height; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
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
        drawX(col),
        row * cell,
        dstSize,
        dstSize,
      );
    }
  }

  // Decorations sit in the air cell directly above a grass surface.
  for (let row = 1; row < level.height; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
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
        drawX(col),
        (row - 1) * cell,
        dstSize,
        dstSize,
      );
    }
  }
}

import { GAME } from '../config';
import { aabb, type Aabb } from '../physics/aabb';

/**
 * Tile legend: `#` solid, `.` air, `P` spawn, `G` goal, `S` spikes,
 * `C` collectible ingredient, `M` enemy spawn, `L` land mine,
 * `T` stalactite hanging from the solid tile above.
 * Rows may be shorter than the widest row; they are padded with air.
 */
export interface LevelData {
  width: number;
  height: number;
  widthPx: number;
  heightPx: number;
  tile: number;
  solids: Aabb[];
  /** Row-major occupancy grid used for autotiling and decorations. */
  grid: boolean[][];
  /** Feet position (bottom-center of the spawn tile). */
  spawn: { x: number; y: number };
  goal: Aabb;
  /** Spike tiles that kill the player on contact. */
  spikes: Aabb[];
  /** Collectible ingredient positions (center of each tile). */
  collectibles: Array<{ x: number; y: number }>;
}

const SOLID = '#';
const SPAWN = 'P';
const GOAL = 'G';
const SPIKE = 'S';
const COLLECTIBLE = 'C';
const MUSHROOM = 'M';
const LAND_MINE = 'L';
const STALACTITE = 'T';
const GOBLIN = 'K';
const BEAR_TRAP = 'B';
const AIR = '.';

export function parseLevel(rows: readonly string[], tile = GAME.world.tile): LevelData {
  if (rows.length === 0) {
    throw new Error('Level map is empty');
  }

  const height = rows.length;
  const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  if (width === 0) {
    throw new Error('Level map has no columns');
  }

  const solids: Aabb[] = [];
  const grid: boolean[][] = [];
  const spikes: Aabb[] = [];
  const collectibles: Array<{ x: number; y: number }> = [];
  let spawn: { x: number; y: number } | null = null;
  let goal: Aabb | null = null;

  for (let row = 0; row < height; row += 1) {
    const line = rows[row] ?? '';
    const solidRow = new Array<boolean>(width).fill(false);
    grid.push(solidRow);
    let runStart = -1;

    for (let col = 0; col < width; col += 1) {
      const cell = line[col] ?? AIR;

      if (cell !== SOLID && runStart !== -1) {
        solids.push(aabb(runStart * tile, row * tile, (col - runStart) * tile, tile));
        runStart = -1;
      }

      switch (cell) {
        case SOLID:
          solidRow[col] = true;
          if (runStart === -1) {
            runStart = col;
          }
          break;
        case AIR:
          break;
        case SPAWN:
          if (spawn) {
            throw new Error('Level map has more than one spawn point');
          }
          spawn = { x: (col + 0.5) * tile, y: (row + 1) * tile };
          break;
        case GOAL:
          if (goal) {
            throw new Error('Level map has more than one goal');
          }
          goal = aabb(col * tile, row * tile, tile, tile);
          break;
        case SPIKE:
          spikes.push(aabb(col * tile, row * tile, tile, tile));
          break;
        case COLLECTIBLE:
          collectibles.push({ x: (col + 0.5) * tile, y: (row + 0.5) * tile });
          break;
        // Enemy markers are visual/entity hints only; the scene spawns them
        // from the raw map, so the tile itself is plain air.
        case MUSHROOM:
        case LAND_MINE:
        case STALACTITE:
        case GOBLIN:
        case BEAR_TRAP:
          break;
        default:
          throw new Error(`Unknown level tile "${cell}" at ${col},${row}`);
      }
    }

    if (runStart !== -1) {
      solids.push(aabb(runStart * tile, row * tile, (width - runStart) * tile, tile));
    }
  }

  if (!spawn) {
    throw new Error('Level map needs a spawn point (P)');
  }
  if (!goal) {
    throw new Error('Level map needs a goal (G)');
  }

  return {
    width,
    height,
    widthPx: width * tile,
    heightPx: height * tile,
    tile,
    solids,
    grid,
    spawn,
    goal,
    spikes,
    collectibles,
  };
}

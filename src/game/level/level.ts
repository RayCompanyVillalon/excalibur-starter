import { GAME } from '../config';
import { aabb, type Aabb } from '../physics/aabb';

/**
 * One hand-authored level. `#` is solid, `.` is air, `P` is the spawn and
 * `G` is the goal. Rows are padded to the widest row, so trailing dots can
 * be omitted while editing.
 */
export const LEVEL_MAP: readonly string[] = [
  '............................................................',
  '............................................................',
  '............................................................',
  '............................................................',
  '............................................................',
  '............................................................',
  '............................................................',
  '............................................................',
  '.......................................................G....',
  '...................................................#######..',
  '............................................................',
  '............................................................',
  '..............................................#####.........',
  '............................................................',
  '............................................................',
  '............#####..............#####.....####...............',
  '............................................................',
  '............................................................',
  '......#####.............#####.......####....................',
  '............................................................',
  '..P.........................................................',
  '##################....########....##########....############',
  '##################....########....##########....############',
  '##################....########....##########....############',
];

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
}

const SOLID = '#';
const SPAWN = 'P';
const GOAL = 'G';
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
  };
}

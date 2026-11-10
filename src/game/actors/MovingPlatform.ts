import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';
import type { MovingPlatformSpec } from '../level/levels';
import { pingPong } from '../math';
import type { Aabb } from '../physics/aabb';

export interface Delta {
  x: number;
  y: number;
}

/** Build a grass-topped island face from the C32 atlas, one tile per column. */
export function buildPlatformCanvas(widthTiles: number, sheet: ImageSource): HTMLCanvasElement {
  const tile = GAME.world.tile;
  const canvas = document.createElement('canvas');
  canvas.width = widthTiles * tile;
  canvas.height = tile;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const src = GAME.art.tile;
  const dst = src * GAME.art.scale;
  for (let column = 0; column < widthTiles; column += 1) {
    // Row 0, column 1 of the atlas is the centre grass-top tile.
    ctx.drawImage(sheet.image, src, 0, src, src, column * tile, 0, dst, dst);
  }

  // A shadowed underside sells the floating-island look.
  ctx.fillStyle = 'rgba(4, 7, 10, 0.45)';
  ctx.fillRect(0, tile - 4, canvas.width, 4);
  return canvas;
}

/**
 * A floating island that slides along a fixed path. The scene advances it
 * explicitly so the player can be carried before the physics step runs.
 */
export class MovingPlatform extends Actor {
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly travelX: number;
  private readonly travelY: number;
  private readonly periodMs: number;
  private readonly phaseMs: number;
  private timeMs = 0;

  constructor(spec: MovingPlatformSpec, sheet: ImageSource) {
    const tile = GAME.world.tile;
    super({
      pos: new Vector(spec.x * tile, spec.y * tile),
      anchor: new Vector(0, 0),
      width: spec.width * tile,
      height: tile,
      z: 1,
    });

    this.baseX = spec.x * tile;
    this.baseY = spec.y * tile;
    this.travelX = spec.dx * tile;
    this.travelY = spec.dy * tile;
    this.periodMs = spec.periodMs;
    this.phaseMs = (spec.phase ?? 0) * spec.periodMs;
    this.timeMs = 0;

    const image = ImageSource.fromHtmlCanvasElement(
      buildPlatformCanvas(spec.width, sheet),
    );
    this.graphics.use(new Sprite({ image }));
  }

  /** Advance the platform and return how far it moved this frame. */
  advance(dtMs: number): Delta {
    this.timeMs += dtMs;
    const t = pingPong(this.timeMs + this.phaseMs, this.periodMs);
    const x = this.baseX + this.travelX * t;
    const y = this.baseY + this.travelY * t;
    const delta = { x: x - this.pos.x, y: y - this.pos.y };
    this.pos.setTo(x, y);
    return delta;
  }

  reset(): void {
    this.timeMs = 0;
    const t = pingPong(this.phaseMs, this.periodMs);
    this.pos.setTo(this.baseX + this.travelX * t, this.baseY + this.travelY * t);
  }

  bounds(): Aabb {
    return { x: this.pos.x, y: this.pos.y, width: this.width, height: this.height };
  }
}

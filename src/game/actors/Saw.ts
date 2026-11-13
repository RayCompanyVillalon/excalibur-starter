import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';
import type { SawSpec } from '../level/levels';
import { pingPong } from '../math';
import type { Aabb } from '../physics/aabb';

/** Draw a spinning buzzsaw blade, centred in the canvas. */
export function buildSawCanvas(radius: number): HTMLCanvasElement {
  const size = Math.ceil(radius * 2 + 4);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const cx = size / 2;
  const cy = size / 2;
  const teeth = 10;

  // Teeth.
  ctx.fillStyle = '#b9c3cb';
  for (let i = 0; i < teeth; i += 1) {
    const angle = (i / teeth) * Math.PI * 2;
    const spread = 0.16;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle - spread) * radius * 0.72, cy + Math.sin(angle - spread) * radius * 0.72);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.lineTo(cx + Math.cos(angle + spread) * radius * 0.72, cy + Math.sin(angle + spread) * radius * 0.72);
    ctx.closePath();
    ctx.fill();
  }

  // Blade disc.
  ctx.fillStyle = '#8d979f';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.74, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4d565d';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hub and bolt.
  ctx.fillStyle = '#2c3338';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d6dde3';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.11, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** Cache saw textures by radius; levels reuse the same handful of sizes. */
const sawSources = new Map<number, ImageSource>();
function sawImage(radius: number): ImageSource {
  let image = sawSources.get(radius);
  if (!image) {
    image = ImageSource.fromHtmlCanvasElement(buildSawCanvas(radius));
    sawSources.set(radius, image);
  }
  return image;
}

/**
 * A spinning saw blade that sweeps along a straight track. Contact kills.
 */
export class Saw extends Actor {
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly travelX: number;
  private readonly travelY: number;
  private readonly periodMs: number;
  private readonly phaseMs: number;
  private readonly radiusPx: number;
  private timeMs = 0;

  constructor(spec: SawSpec) {
    const tile = GAME.world.tile;
    const radius = spec.radius ?? 13;
    super({
      pos: new Vector((spec.x + 0.5) * tile, (spec.y + 0.5) * tile),
      anchor: new Vector(0.5, 0.5),
      width: radius * 2,
      height: radius * 2,
      z: 4,
    });

    this.baseX = (spec.x + 0.5) * tile;
    this.baseY = (spec.y + 0.5) * tile;
    this.travelX = spec.dx * tile;
    this.travelY = spec.dy * tile;
    this.periodMs = spec.periodMs;
    this.phaseMs = (spec.phase ?? 0) * spec.periodMs;
    this.radiusPx = radius;

    const image = sawImage(radius);
    this.graphics.use(new Sprite({ image }));
  }

  advance(dtMs: number): void {
    this.timeMs += dtMs;
    const t = pingPong(this.timeMs + this.phaseMs, this.periodMs);
    this.pos.setTo(this.baseX + this.travelX * t, this.baseY + this.travelY * t);
    this.rotation += (dtMs / 1000) * 9;
  }

  reset(): void {
    this.timeMs = 0;
    const t = pingPong(this.phaseMs, this.periodMs);
    this.pos.setTo(this.baseX + this.travelX * t, this.baseY + this.travelY * t);
    this.rotation = 0;
  }

  bounds(): Aabb {
    // Slightly forgiving hitbox: blades are round, not square.
    const size = this.radiusPx * 1.5;
    return { x: this.pos.x - size / 2, y: this.pos.y - size / 2, width: size, height: size };
  }
}

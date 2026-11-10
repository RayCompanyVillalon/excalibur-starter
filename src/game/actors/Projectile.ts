import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import type { Aabb } from '../physics/aabb';
import type { Shot } from './Cannon';

function buildOrbCanvas(): HTMLCanvasElement {
  const size = 14;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  const cx = size / 2;

  ctx.fillStyle = 'rgba(255, 120, 40, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cx, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff7a28';
  ctx.beginPath();
  ctx.arc(cx, cx, 4.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffe6a8';
  ctx.beginPath();
  ctx.arc(cx, cx, 2.1, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** A straight-flying cannon shot. Contact kills the player. */
export class Projectile extends Actor {
  private readonly vx: number;
  private readonly vy: number;
  private lifeMs = 3000;

  constructor(shot: Shot) {
    super({
      pos: new Vector(shot.x, shot.y),
      anchor: new Vector(0.5, 0.5),
      width: 10,
      height: 10,
      z: 8,
    });
    this.vx = shot.vx;
    this.vy = shot.vy;
    this.graphics.use(new Sprite({ image: ImageSource.fromHtmlCanvasElement(buildOrbCanvas()) }));
  }

  advance(dtMs: number): void {
    const dt = dtMs / 1000;
    this.pos.x += this.vx * dt;
    this.pos.y += this.vy * dt;
    this.lifeMs -= dtMs;
    this.rotation += (dtMs / 1000) * 6;
  }

  get expired(): boolean {
    return this.lifeMs <= 0;
  }

  bounds(): Aabb {
    return { x: this.pos.x - 5, y: this.pos.y - 5, width: 10, height: 10 };
  }
}

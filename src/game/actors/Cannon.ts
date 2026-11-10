import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';
import type { CannonSpec } from '../level/levels';

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface AimPoint {
  x: number;
  y: number;
}

function drawCannon(charged: boolean): HTMLCanvasElement {
  const width = 44;
  const height = 32;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const cx = width / 2;
  const cy = height / 2;

  // Iron base plate.
  ctx.fillStyle = '#1c2126';
  ctx.fillRect(cx - 15, cy - 11, 26, 22);
  ctx.fillStyle = '#333b42';
  ctx.fillRect(cx - 13, cy - 9, 22, 16);
  ctx.fillStyle = '#232a30';
  ctx.fillRect(cx - 15, cy + 8, 26, 3);

  // Rivets.
  ctx.fillStyle = '#6f7a83';
  for (const [rx, ry] of [
    [cx - 10, cy - 6],
    [cx - 10, cy + 4],
    [cx - 2, cy - 6],
    [cx - 2, cy + 4],
  ] as const) {
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Barrel, pointing right.
  ctx.fillStyle = '#454e56';
  ctx.fillRect(cx - 3, cy - 6, 21, 12);
  ctx.fillStyle = '#6c7780';
  ctx.fillRect(cx - 3, cy - 6, 21, 4);
  ctx.fillStyle = '#14181c';
  ctx.fillRect(cx - 3, cy + 3, 21, 3);

  // Muzzle ring and bore.
  ctx.fillStyle = '#2b3238';
  ctx.fillRect(cx + 16, cy - 8, 4, 16);
  ctx.fillStyle = '#0a0d10';
  ctx.beginPath();
  ctx.ellipse(cx + 20, cy, 2.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Charge lamp.
  ctx.fillStyle = charged ? '#ffb347' : '#3a4248';
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 2, 3.2, 0, Math.PI * 2);
  ctx.fill();

  if (charged) {
    ctx.fillStyle = 'rgba(255, 176, 71, 0.85)';
    ctx.beginPath();
    ctx.arc(cx + 21, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 190, 0.95)';
    ctx.beginPath();
    ctx.arc(cx + 21, cy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * A wall cannon that telegraphs, then fires a projectile. It can fire in a
 * fixed direction or aim at the player at the moment it starts charging.
 */
export class Cannon extends Actor {
  private readonly spec: CannonSpec;
  private readonly fixedDir: AimPoint | null;
  private cooldownMs: number;
  private chargeLeftMs = 0;
  private charging = false;
  private aim: AimPoint = { x: -1, y: 0 };

  constructor(spec: CannonSpec) {
    const tile = GAME.world.tile;
    super({
      pos: new Vector((spec.x + 0.5) * tile, (spec.y + 0.5) * tile),
      anchor: new Vector(0.5, 0.5),
      width: 38,
      height: 28,
      z: 4,
    });
    this.spec = spec;
    this.fixedDir = spec.dir ? normalize(spec.dir) : null;
    this.cooldownMs = spec.delayMs ?? 700;

    this.graphics.add('idle', new Sprite({ image: ImageSource.fromHtmlCanvasElement(drawCannon(false)) }));
    this.graphics.add('charged', new Sprite({ image: ImageSource.fromHtmlCanvasElement(drawCannon(true)) }));
    this.graphics.use('idle');

    if (this.fixedDir) {
      this.rotation = Math.atan2(this.fixedDir.y, this.fixedDir.x);
    }
  }

  /** Advance timers; returns a shot to spawn on the frame it fires. */
  advance(dtMs: number, target: AimPoint): Shot | null {
    if (!this.charging) {
      this.cooldownMs -= dtMs;
      if (this.cooldownMs <= 0) {
        this.charging = true;
        this.chargeLeftMs = this.spec.chargeMs ?? 400;
        this.aim = this.fixedDir ?? normalize({ x: target.x - this.pos.x, y: target.y - this.pos.y });
        this.rotation = Math.atan2(this.aim.y, this.aim.x);
        this.graphics.use('charged');
      }
      return null;
    }

    this.chargeLeftMs -= dtMs;
    if (this.chargeLeftMs > 0) {
      return null;
    }

    this.charging = false;
    this.cooldownMs = this.spec.intervalMs;
    this.graphics.use('idle');

    const muzzle = 20;
    return {
      x: this.pos.x + this.aim.x * muzzle,
      y: this.pos.y + this.aim.y * muzzle,
      vx: this.aim.x * this.spec.speed,
      vy: this.aim.y * this.spec.speed,
    };
  }

  reset(): void {
    this.cooldownMs = this.spec.delayMs ?? 700;
    this.chargeLeftMs = 0;
    this.charging = false;
    this.graphics.use('idle');
  }
}

function normalize(v: AimPoint): AimPoint {
  const length = Math.hypot(v.x, v.y);
  if (length < 0.0001) {
    return { x: -1, y: 0 };
  }
  return { x: v.x / length, y: v.y / length };
}

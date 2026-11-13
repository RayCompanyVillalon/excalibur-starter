import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';
import { overlaps, type Aabb } from '../physics/aabb';

/** A jagged cave spike, drawn hanging from the top of its tile. */
export function buildStalactiteCanvas(): HTMLCanvasElement {
  const { width, height } = GAME.enemies.stalactite;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const w = width;
  const h = height;

  // Main spike.
  const rock = ctx.createLinearGradient(0, 0, w, 0);
  rock.addColorStop(0, '#7f8794');
  rock.addColorStop(0.45, '#59616d');
  rock.addColorStop(1, '#343a44');
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(w - 1, 0);
  ctx.lineTo(w - 4, h * 0.45);
  ctx.lineTo(w / 2 + 1, h);
  ctx.lineTo(5, h * 0.42);
  ctx.closePath();
  ctx.fill();

  // Lit left face.
  ctx.fillStyle = 'rgba(190, 200, 214, 0.45)';
  ctx.beginPath();
  ctx.moveTo(2, 1);
  ctx.lineTo(8, 1);
  ctx.lineTo(6, h * 0.42);
  ctx.lineTo(w / 2, h - 1);
  ctx.lineTo(5, h * 0.4);
  ctx.closePath();
  ctx.fill();

  // Cracks.
  ctx.strokeStyle = 'rgba(24, 28, 34, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w - 5, 3);
  ctx.lineTo(w - 8, h * 0.3);
  ctx.lineTo(w - 6, h * 0.48);
  ctx.stroke();

  // Cold tip highlight.
  ctx.fillStyle = '#aab4c2';
  ctx.fillRect(w / 2 - 1, h - 4, 2, 3);

  return canvas;
}

let source: ImageSource | null = null;
function stalactiteImage(): ImageSource {
  source ??= ImageSource.fromHtmlCanvasElement(buildStalactiteCanvas());
  return source;
}

type State = 'hanging' | 'falling' | 'shattered';

/**
 * A stalactite that hangs from the ceiling until the player walks underneath,
 * then drops and shatters. Contact is fatal while it is hanging or falling.
 */
export class Stalactite extends Actor {
  private state: State = 'hanging';
  private vy = 0;
  private shatterTimer = 0;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly sprite: Sprite;

  constructor(x: number, y: number) {
    const { width, height } = GAME.enemies.stalactite;
    super({
      pos: new Vector(x, y),
      anchor: new Vector(0.5, 0),
      width,
      height,
      z: 4,
    });
    this.spawnX = x;
    this.spawnY = y;
    this.sprite = new Sprite({ image: stalactiteImage() });
    this.graphics.use(this.sprite);
  }

  get isDangerous(): boolean {
    return this.state === 'hanging' || this.state === 'falling';
  }

  get isFalling(): boolean {
    return this.state === 'falling';
  }

  bounds(): Aabb {
    return { x: this.pos.x - this.width / 2, y: this.pos.y, width: this.width, height: this.height };
  }

  /** Knock it loose. */
  trigger(): void {
    if (this.state !== 'hanging') {
      return;
    }
    this.state = 'falling';
    this.vy = GAME.enemies.stalactite.initialSpeed;
  }

  /** Parry it into harmless rubble. */
  shatter(): void {
    if (this.state === 'shattered') {
      return;
    }
    this.state = 'shattered';
    this.shatterTimer = GAME.enemies.stalactite.shatterMs;
  }

  /** Re-hang it for a fresh run. */
  reset(): void {
    this.state = 'hanging';
    this.vy = 0;
    this.shatterTimer = 0;
    this.pos.setTo(this.spawnX, this.spawnY);
    this.rotation = 0;
    this.graphics.opacity = 1;
    this.graphics.visible = true;
  }

  /**
   * Advance a falling spike and shatter it on the first solid surface below.
   * `solids` should be the current static terrain plus moving platforms.
   */
  advance(elapsed: number, solids: readonly Aabb[], floorY: number): void {
    if (this.state === 'shattered') {
      this.shatterTimer = Math.max(0, this.shatterTimer - elapsed);
      this.graphics.opacity = this.shatterTimer / GAME.enemies.stalactite.shatterMs;
      if (this.shatterTimer <= 0) {
        this.graphics.visible = false;
      }
      return;
    }
    if (this.state !== 'falling') {
      return;
    }

    const dt = elapsed / 1000;
    this.vy = Math.min(
      this.vy + GAME.enemies.stalactite.gravity * dt,
      GAME.physics.maxFallSpeed,
    );
    this.pos.y += this.vy * dt;

    const probe: Aabb = {
      x: this.pos.x - this.width / 2,
      y: this.pos.y + this.height - 2,
      width: this.width,
      height: 4,
    };
    const hit = solids.some((solid) => overlaps(probe, solid)) || this.pos.y > floorY;
    if (hit) {
      this.shatter();
    }
  }
}

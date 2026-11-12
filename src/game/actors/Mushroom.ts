import { Actor, ImageSource, Sprite, Vector } from 'excalibur';
import { GAME } from '../config';
import type { Aabb } from '../physics/aabb';
import { overlaps } from '../physics/aabb';

/** Pixel-art evil mushroom: spotted cap, angry face, little feet. */
export function buildMushroomCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Cap.
  ctx.fillStyle = '#a32b22';
  ctx.beginPath();
  ctx.ellipse(16, 13, 14, 11, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a1c16';
  ctx.fillRect(2, 13, 28, 3);
  ctx.fillStyle = '#d94a35';
  ctx.beginPath();
  ctx.ellipse(16, 13, 13, 9.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Spots.
  ctx.fillStyle = '#f4e7cf';
  for (const [sx, sy, r] of [
    [9, 9, 2.2],
    [18, 7, 1.7],
    [23, 11, 2],
    [13, 13, 1.4],
  ] as const) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stem / face.
  ctx.fillStyle = '#e6d3ae';
  ctx.fillRect(9, 17, 14, 11);
  ctx.fillStyle = '#c9b28a';
  ctx.fillRect(9, 25, 14, 3);

  // Angry eyes.
  ctx.fillStyle = '#2a1a18';
  ctx.fillRect(11, 20, 3, 3);
  ctx.fillRect(18, 20, 3, 3);
  ctx.fillStyle = '#f4e7cf';
  ctx.fillRect(12, 20, 1, 1);
  ctx.fillRect(19, 20, 1, 1);

  // Brows and mouth.
  ctx.fillStyle = '#5c1712';
  ctx.fillRect(10, 18, 5, 1.5);
  ctx.fillRect(17, 18, 5, 1.5);
  ctx.fillStyle = '#2a1a18';
  ctx.fillRect(14, 24, 4, 1.5);

  // Feet.
  ctx.fillStyle = '#5d4434';
  ctx.fillRect(8, 28, 6, 3);
  ctx.fillRect(18, 28, 6, 3);

  return canvas;
}

/**
 * An evil mushroom person that patrols left and right on its platform.
 * Touching it kills the player.
 */
export class Mushroom extends Actor {
  private patrolLeft: number;
  private patrolRight: number;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private dir = -1;
  private pauseTimer = 0;
  private paused = false;
  private solids: readonly Aabb[] = [];
  private _alive = true;

  constructor(x: number, y: number, platformLeft: number, platformRight: number) {
    const { width, height } = GAME.enemies.mushroom;
    super({
      pos: new Vector(x, y),
      anchor: new Vector(0.5, 1),
      width,
      height,
      z: 6,
    });
    this.spawnX = x;
    this.spawnY = y;
    this.patrolLeft = platformLeft + width / 2;
    this.patrolRight = platformRight - width / 2;

    const image = ImageSource.fromHtmlCanvasElement(buildMushroomCanvas());
    this.graphics.use(new Sprite({ image }));
    this.graphics.offset = new Vector(-8, -8);
  }

  /** Put the enemy back on its patrol start for a fresh run. */
  reset(): void {
    this._alive = true;
    this.pos.setTo(this.spawnX, this.spawnY);
    this.dir = -1;
    this.paused = false;
    this.pauseTimer = 0;
  }

  setSolids(solids: readonly Aabb[]): void {
    this.solids = solids;
  }

  get isDead(): boolean {
    return !this._alive;
  }

  get isAlive(): boolean {
    return this._alive;
  }

  override onInitialize(): void {
    // Draw a simple mushroom shape
  }

  override onPreUpdate(_engine: any, elapsed: number): void {
    if (!this._alive) {
      return;
    }

    if (this.paused) {
      this.pauseTimer -= elapsed;
      if (this.pauseTimer <= 0) {
        this.paused = false;
        this.dir *= -1;
      }
      return;
    }

    // Move horizontally
    const speed = GAME.enemies.mushroom.patrolSpeed;
    const dt = elapsed / 1000;
    this.pos.x += this.dir * speed * dt;

    // Turn around at patrol bounds
    if (this.pos.x <= this.patrolLeft || this.pos.x >= this.patrolRight) {
      this.pos.x = Math.max(this.patrolLeft, Math.min(this.patrolRight, this.pos.x));
      this.paused = true;
      this.pauseTimer = GAME.enemies.mushroom.pauseMs;
    }

    // Check if there's ground below - if not, fall
    const probe: Aabb = {
      x: this.pos.x - this.width / 2,
      y: this.pos.y,
      width: this.width,
      height: 2,
    };
    let onGround = false;
    for (const solid of this.solids) {
      if (overlaps(probe, solid)) {
        onGround = true;
        break;
      }
    }

    if (!onGround && this.pos.y < 1000) {
      // A misplaced patrol would walk into the void; snap to the start instead
      // of killing the enemy so retries stay deterministic.
      this.pos.x = this.patrolLeft;
      this.dir = 1;
    }
  }
}
import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import type { Aabb } from '../physics/aabb';

/** A thieving goblin: green skin, red eyes, pointy ears, leather vest. */
export function buildGoblinCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 28;
  canvas.height = 28;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Body / vest.
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(6, 12, 16, 12);

  // Head.
  ctx.fillStyle = '#4a8c3f';
  ctx.beginPath();
  ctx.ellipse(14, 9, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5ea850';
  ctx.beginPath();
  ctx.ellipse(14, 8, 7, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pointy ears.
  ctx.fillStyle = '#4a8c3f';
  ctx.beginPath();
  ctx.moveTo(5, 6);
  ctx.lineTo(1, 3);
  ctx.lineTo(7, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(23, 6);
  ctx.lineTo(27, 3);
  ctx.lineTo(21, 10);
  ctx.closePath();
  ctx.fill();

  // Red eyes.
  ctx.fillStyle = '#dc2f2f';
  ctx.fillRect(10, 7, 3, 3);
  ctx.fillRect(16, 7, 3, 3);
  ctx.fillStyle = '#f9a0a0';
  ctx.fillRect(11, 7, 1, 1);
  ctx.fillRect(17, 7, 1, 1);

  // Greedy grin.
  ctx.strokeStyle = '#2a5522';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(14, 11, 3, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = '#2a5522';
  ctx.fillRect(12, 11, 1, 2);
  ctx.fillRect(15, 11, 1, 2);

  // Legs.
  ctx.fillStyle = '#3a7030';
  ctx.fillRect(8, 24, 5, 4);
  ctx.fillRect(15, 24, 5, 4);

  // Arms.
  ctx.fillStyle = '#4a8c3f';
  ctx.fillRect(4, 14, 3, 6);
  ctx.fillRect(21, 14, 3, 6);

  return canvas;
}

let source: ImageSource | null = null;
function goblinImage(): ImageSource {
  source ??= ImageSource.fromHtmlCanvasElement(buildGoblinCanvas());
  return source;
}

type State = 'chasing' | 'grappling' | 'fleeing' | 'stunned';

/**
 * A cave goblin thief. It chases the player horizontally. On contact, it
 * "grapples" — instead of dealing damage, it signals the scene so the HUD
 * shows a mash-E prompt. When the player mashes enough, the goblin is stunned
 * briefly and flees.
 */
export class Goblin extends Actor {
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly patrolLeft: number;
  private readonly patrolRight: number;
  private state: State = 'chasing';
  private dir = -1;
  private pauseTimer = 0;
  private paused = false;
  private stunTimer = 0;
  private fleeTimer = 0;
  playerX = 0;
  playerY = 0;
  private _grappling = false;
  private readonly chaseSpeed: number;

  constructor(x: number, y: number, left: number, right: number) {
    super({
      pos: new Vector(x, y),
      anchor: new Vector(0.5, 1),
      width: 22,
      height: 28,
      z: 6,
    });
    this.spawnX = x;
    this.spawnY = y;
    this.patrolLeft = left;
    this.patrolRight = right;
    this.chaseSpeed = 100;
    this.graphics.use(new Sprite({ image: goblinImage() }));
    this.graphics.offset = new Vector(-3, 0);
  }

  get isGrappling(): boolean {
    return this._grappling;
  }

  get isAlive(): boolean {
    return true; // Goblins don't die — they get stunned or flee
  }

  get isStunned(): boolean {
    return this.state === 'stunned';
  }

  get isDangerous(): boolean {
    return this.state === 'chasing' || this.state === 'grappling';
  }

  bounds(): Aabb {
    return {
      x: this.pos.x - this.width / 2,
      y: this.pos.y - this.height,
      width: this.width,
      height: this.height,
    };
  }

  /** The goblin catches the player — begin the mash sequence. */
  grapple(): void {
    if (this.state !== 'chasing') return;
    this.state = 'grappling';
    this._grappling = true;
  }

  /** Player mashed enough — goblin is stunned, then flees. */
  breakFree(): void {
    if (this.state !== 'grappling') return;
    this.state = 'stunned';
    this._grappling = false;
    this.stunTimer = 800;
    this.graphics.opacity = 0.7;
  }

  reset(): void {
    this.state = 'chasing';
    this._grappling = false;
    this.dir = -1;
    this.paused = false;
    this.pauseTimer = 0;
    this.stunTimer = 0;
    this.fleeTimer = 0;
    this.pos.setTo(this.spawnX, this.spawnY);
    this.graphics.opacity = 1;
  }

  override onPreUpdate(_engine: unknown, elapsed: number): void {
    if (this.state === 'stunned') {
      this.stunTimer -= elapsed;
      if (this.stunTimer <= 0) {
        this.state = 'fleeing';
        this.dir = -this.dir;
        this.fleeTimer = 1500;
        this.graphics.opacity = 0.5;
      }
      return;
    }

    if (this.state === 'fleeing') {
      const dt = elapsed / 1000;
      this.pos.x += this.dir * this.chaseSpeed * 1.5 * dt;
      this.fleeTimer -= elapsed;
      this.graphics.opacity = Math.max(0.2, this.fleeTimer / 1500);
      if (this.fleeTimer <= 0) {
        this.pos.setTo(this.spawnX, this.spawnY);
        this.state = 'chasing';
        this.graphics.opacity = 1;
      }
      return;
    }

    if (this.state === 'grappling') {
      return; // Don't move while grappling
    }

    if (this.paused) {
      this.pauseTimer -= elapsed;
      if (this.pauseTimer <= 0) {
        this.paused = false;
        this.dir *= -1;
      }
      return;
    }

    // Chase the player
    const dx = this.playerX - this.pos.x;
    const dy = Math.abs(this.playerY - this.pos.y);
    if (dy < 80 && Math.abs(dx) < 250 && Math.abs(dx) > 4) {
      this.dir = dx > 0 ? 1 : -1;
    }

    const dt = elapsed / 1000;
    this.pos.x += this.dir * this.chaseSpeed * dt;

    if (this.pos.x <= this.patrolLeft || this.pos.x >= this.patrolRight) {
      this.pos.x = Math.max(this.patrolLeft, Math.min(this.patrolRight, this.pos.x));
      this.paused = true;
      this.pauseTimer = 500;
    }
  }
}

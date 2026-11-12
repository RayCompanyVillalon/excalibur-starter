import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';
import type { Aabb } from '../physics/aabb';
import { overlaps } from '../physics/aabb';

type WormState = 'burrowed' | 'warning' | 'surface' | 'submerging';

/** Pixel-space arena the worm is allowed to erupt inside. */
export interface WormArena {
  left: number;
  right: number;
  groundY: number;
}

const BODY_WIDTH = GAME.world.tile * 2;
const BODY_HEIGHT = GAME.world.tile * 3;
/** Forgiving hitbox: the sprite is wider than the part that can hurt you. */
const HIT_WIDTH = 44;
const HIT_HEIGHT = 78;

/** Draw the segmented body and hungry head that erupts from the ground. */
export function buildWormCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BODY_WIDTH;
  canvas.height = BODY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const cx = BODY_WIDTH / 2;

  // Segmented body, tapering slightly towards the tail.
  for (let i = 0; i < 6; i += 1) {
    const y = BODY_HEIGHT - 8 - i * 15;
    const half = 20 - i * 1.2;
    ctx.fillStyle = i % 2 === 0 ? '#5a3b29' : '#6d4a34';
    ctx.beginPath();
    ctx.ellipse(cx, y, half, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(198, 152, 112, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, y + 2, half * 0.45, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(42, 25, 17, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, y + 7, half - 1, 3, 0, 0, Math.PI);
    ctx.stroke();
  }

  // Head.
  ctx.fillStyle = '#7a5238';
  ctx.beginPath();
  ctx.ellipse(cx, 18, 24, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8d6244';
  ctx.beginPath();
  ctx.ellipse(cx, 12, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth.
  ctx.fillStyle = '#2a120e';
  ctx.beginPath();
  ctx.ellipse(cx, 13, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c1d16';
  ctx.beginPath();
  ctx.ellipse(cx, 17, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Upper teeth.
  ctx.fillStyle = '#f0e2c8';
  for (const tx of [cx - 11, cx - 4, cx + 3, cx + 10]) {
    ctx.beginPath();
    ctx.moveTo(tx - 3, 4);
    ctx.lineTo(tx + 3, 4);
    ctx.lineTo(tx, 11);
    ctx.closePath();
    ctx.fill();
  }
  // Lower teeth.
  for (const tx of [cx - 8, cx, cx + 8]) {
    ctx.beginPath();
    ctx.moveTo(tx - 3, 23);
    ctx.lineTo(tx + 3, 23);
    ctx.lineTo(tx, 16);
    ctx.closePath();
    ctx.fill();
  }

  // Glowing eyes.
  for (const ex of [cx - 13, cx + 13]) {
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(ex, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a120e';
    ctx.beginPath();
    ctx.arc(ex, 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dirt clumps around the base so it reads as breaking through the ground.
  ctx.fillStyle = '#3a2a1e';
  for (const [dx, dy, r] of [
    [-24, -4, 4],
    [23, -3, 5],
    [-14, -2, 3],
    [12, -5, 3],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx + dx, BODY_HEIGHT + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** Draw the cracked mound and dust that warn where the worm will erupt. */
export function buildWormWarningCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BODY_WIDTH;
  canvas.height = BODY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const cx = BODY_WIDTH / 2;
  const base = BODY_HEIGHT;

  // Dust puffs.
  for (const [dx, dy, r] of [
    [-20, -22, 5],
    [-8, -30, 6],
    [7, -28, 5],
    [20, -21, 4],
  ] as const) {
    ctx.fillStyle = 'rgba(150, 122, 92, 0.55)';
    ctx.beginPath();
    ctx.arc(cx + dx, base + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mound.
  ctx.fillStyle = '#4a3323';
  ctx.beginPath();
  ctx.ellipse(cx, base - 6, 27, 12, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4a33';
  ctx.beginPath();
  ctx.ellipse(cx, base - 8, 21, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Cracks splitting the mound.
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 2;
  for (const [x1, y1, x2, y2] of [
    [cx - 12, base - 12, cx - 4, base - 2],
    [cx + 2, base - 14, cx + 8, base - 1],
    [cx + 14, base - 10, cx + 18, base - 3],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  return canvas;
}

/**
 * The Giant Worm boss — burrows under the arena, telegraphs a spot with a
 * dust mound, then erupts. It tracks the player's position before each strike
 * and gets faster after its first two eruptions.
 */
export class WormBoss extends Actor {
  private state: WormState = 'burrowed';
  private timer = 0;
  private targetX: number;
  private aggro = false;
  private awake = false;
  private strikes = 0;
  private firstStrike = true;
  private readonly arenaLeft: number;
  private readonly arenaRight: number;
  private readonly groundY: number;
  private readonly bodySprite: Sprite;
  private readonly warningSprite: Sprite;

  constructor(arena: WormArena) {
    super({
      pos: new Vector((arena.left + arena.right) / 2, arena.groundY),
      anchor: new Vector(0.5, 1),
      width: BODY_WIDTH,
      height: BODY_HEIGHT,
      z: 7,
    });
    this.arenaLeft = arena.left;
    this.arenaRight = arena.right;
    this.groundY = arena.groundY;
    this.targetX = (arena.left + arena.right) / 2;

    // Origin at the bottom-center means scale animations grow out of the
    // ground instead of shrinking towards the middle of the sprite.
    this.bodySprite = new Sprite({
      image: ImageSource.fromHtmlCanvasElement(buildWormCanvas()),
      origin: new Vector(BODY_WIDTH / 2, BODY_HEIGHT),
    });
    this.warningSprite = new Sprite({
      image: ImageSource.fromHtmlCanvasElement(buildWormWarningCanvas()),
      origin: new Vector(BODY_WIDTH / 2, BODY_HEIGHT),
    });

    this.graphics.add('body', this.bodySprite);
    this.graphics.add('warning', this.warningSprite);
    this.graphics.use('body');
    this.graphics.opacity = 0;
  }

  get isDangerous(): boolean {
    return this.state === 'surface';
  }

  get isAwake(): boolean {
    return this.awake;
  }

  get isEnraged(): boolean {
    return this.aggro;
  }

  /** Wake the boss when the player steps into its arena. */
  awaken(): void {
    if (this.awake) {
      return;
    }
    this.awake = true;
    this.timer = 0;
  }

  /** Called every frame by the scene so eruptions aim at the player. */
  setTarget(x: number): void {
    this.targetX = x;
  }

  override onPreUpdate(_engine: any, elapsed: number): void {
    this.timer += elapsed;

    switch (this.state) {
      case 'burrowed': {
        this.graphics.opacity = 0;
        if (this.awake && this.timer >= this.burrowMs()) {
          this.beginWarning();
        }
        break;
      }

      case 'warning': {
        // Pulse the mound so it reads as a warning rather than decoration.
        const pulse = 1 + Math.sin(this.timer / 55) * 0.09;
        this.warningSprite.scale = new Vector(pulse, 1);
        if (this.timer >= this.warningMs()) {
          this.state = 'surface';
          this.timer = 0;
          this.graphics.use('body');
          this.bodySprite.scale = new Vector(1, 0.62);
        }
        break;
      }

      case 'surface': {
        // Pop up to full height, then hold the strike.
        const rise = Math.min(1, 0.62 + (this.timer / 150) * 0.38);
        this.bodySprite.scale = new Vector(1, rise);
        if (this.timer >= this.surfaceMs()) {
          this.state = 'submerging';
          this.timer = 0;
          this.strikes += 1;
          this.firstStrike = false;
          // The fight escalates after the worm has struck twice.
          if (this.strikes >= 2) {
            this.aggro = true;
          }
        }
        break;
      }

      case 'submerging': {
        const sink = Math.min(1, this.timer / 260);
        this.bodySprite.scale = new Vector(1, 1 - sink * 0.92);
        if (this.timer >= 260) {
          this.state = 'burrowed';
          this.timer = 0;
          this.graphics.opacity = 0;
          this.bodySprite.scale = new Vector(1, 1);
        }
        break;
      }
    }
  }

  /** Pick the spot for the next eruption, clamped inside the arena. */
  private beginWarning(): void {
    this.state = 'warning';
    this.timer = 0;
    const half = BODY_WIDTH / 2;
    this.pos.x = Math.max(
      this.arenaLeft + half,
      Math.min(this.arenaRight - half, this.targetX),
    );
    this.pos.y = this.groundY;
    this.graphics.use('warning');
    this.graphics.opacity = 1;
    this.warningSprite.scale = new Vector(1, 1);
  }

  private burrowMs(): number {
    if (this.firstStrike) {
      return 900 + Math.random() * 300;
    }
    return this.aggro ? 1100 + Math.random() * 500 : 2200 + Math.random() * 900;
  }

  private warningMs(): number {
    if (this.firstStrike) {
      return 800;
    }
    return this.aggro ? 460 : 680;
  }

  private surfaceMs(): number {
    if (this.firstStrike) {
      return 1400;
    }
    return this.aggro ? 1900 + Math.random() * 500 : 1400 + Math.random() * 500;
  }

  /** Reset the boss to a fresh burrow for a new run. */
  reset(): void {
    this.state = 'burrowed';
    this.timer = 0;
    this.aggro = false;
    this.awake = false;
    this.strikes = 0;
    this.firstStrike = true;
    this.pos.setTo((this.arenaLeft + this.arenaRight) / 2, this.groundY);
    this.graphics.use('body');
    this.graphics.opacity = 0;
    this.bodySprite.scale = new Vector(1, 1);
    this.warningSprite.scale = new Vector(1, 1);
  }

  /** Only the surfaced body is harmful; the mound is a fair warning. */
  overlapsWith(aabb: Aabb): boolean {
    if (this.state !== 'surface') {
      return false;
    }
    const box: Aabb = {
      x: this.pos.x - HIT_WIDTH / 2,
      y: this.pos.y - HIT_HEIGHT,
      width: HIT_WIDTH,
      height: HIT_HEIGHT,
    };
    return overlaps(box, aabb);
  }
}

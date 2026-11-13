import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';

/** A jagged iron bear trap: jaws, spring, teeth. */
export function buildBearTrapCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 22;
  canvas.height = 14;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Base plate.
  ctx.fillStyle = '#3d3130';
  ctx.fillRect(1, 8, 20, 5);

  // Jaws.
  ctx.fillStyle = '#5a4543';
  ctx.beginPath();
  ctx.moveTo(2, 9);
  ctx.lineTo(8, 3);
  ctx.lineTo(20, 3);
  ctx.lineTo(20, 9);
  ctx.closePath();
  ctx.fill();

  // Upper jaw.
  ctx.fillStyle = '#6d5350';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(6, 2);
  ctx.lineTo(10, 2);
  ctx.lineTo(10, 8);
  ctx.closePath();
  ctx.fill();

  // Teeth on lower jaw.
  ctx.fillStyle = '#c0b8b0';
  for (const tx of [4, 8, 12, 16]) {
    ctx.beginPath();
    ctx.moveTo(tx, 8);
    ctx.lineTo(tx + 1, 5);
    ctx.lineTo(tx + 2, 8);
    ctx.fill();
  }

  // Teeth on upper jaw.
  for (const tx of [2, 6, 10]) {
    ctx.beginPath();
    ctx.moveTo(tx + 1, 8);
    ctx.lineTo(tx + 2, 5);
    ctx.lineTo(tx + 3, 8);
    ctx.fill();
  }

  // Spring coil.
  ctx.strokeStyle = '#4a3a38';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(11, 8, 3, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

let source: ImageSource | null = null;
function trapImage(): ImageSource {
  source ??= ImageSource.fromHtmlCanvasElement(buildBearTrapCanvas());
  return source;
}

/**
 * A bear trap hazard. Triggers when the player steps on it; deals damage
 * but can be parried.
 */
export class BearTrap extends Actor {
  private _triggered = false;

  constructor(x: number, y: number) {
    const { width, height } = GAME.enemies.bearTrap;
    super({
      pos: new Vector(x, y),
      anchor: new Vector(0.5, 1),
      width,
      height,
      z: 4,
    });
    this.graphics.use(new Sprite({ image: trapImage() }));
    this.graphics.offset = new Vector(-3, -1);
  }

  get isTriggered(): boolean {
    return this._triggered;
  }

  trigger(): void {
    if (this._triggered) return;
    this._triggered = true;
    this.graphics.opacity = 0.6;
  }

  /** Parry disarms the trap harmlessly. */
  disarm(): void {
    if (this._triggered) return;
    this._triggered = true;
    this.graphics.visible = false;
  }

  reset(): void {
    this._triggered = false;
    this.graphics.visible = true;
    this.graphics.opacity = 1;
  }
}

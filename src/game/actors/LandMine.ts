import { Actor, Color, ImageSource, Sprite, Vector } from 'excalibur';
import { GAME } from '../config';

/** A squat pressure mine: dark disc, prongs and a warning lamp. */
export function buildLandMineCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 14;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Prongs.
  ctx.fillStyle = '#3a3f44';
  ctx.fillRect(2, 8, 3, 5);
  ctx.fillRect(15, 8, 3, 5);

  // Body.
  ctx.fillStyle = '#23282d';
  ctx.beginPath();
  ctx.ellipse(10, 8, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3c434a';
  ctx.beginPath();
  ctx.ellipse(10, 7, 7, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warning lamp.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(10, 6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8a72';
  ctx.fillRect(9, 5, 1, 1);

  return canvas;
}

/**
 * A land mine hazard. Sits on the ground and explodes when the player
 * touches it, dealing a gruesome death.
 */
export class LandMine extends Actor {
  private _triggered = false;
  private readonly sprite: Sprite;

  constructor(x: number, y: number) {
    const { width, height } = GAME.enemies.landMine;
    super({
      pos: new Vector(x, y),
      anchor: new Vector(0.5, 1),
      width,
      height,
      z: 4,
    });

    const image = ImageSource.fromHtmlCanvasElement(buildLandMineCanvas());
    this.sprite = new Sprite({ image });
    this.graphics.use(this.sprite);
    this.graphics.offset = new Vector(-2, -2);
  }

  get isTriggered(): boolean {
    return this._triggered;
  }

  /** Trigger the mine — tints it to signal activation. */
  trigger(): void {
    this._triggered = true;
    this.sprite.tint = Color.fromHex(GAME.colors.landMineTrigger);
  }

  /** Re-arm the mine for a fresh run. */
  reset(): void {
    this._triggered = false;
    this.sprite.tint = Color.White;
  }
}
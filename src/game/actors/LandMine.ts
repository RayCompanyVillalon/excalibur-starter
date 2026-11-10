import { Actor, Color, Vector } from 'excalibur';
import { GAME } from '../config';

/**
 * A land mine hazard. Sits on the ground and explodes when the player
 * touches it, dealing a gruesome death.
 * Rendered as a small dark disc that flashes when triggered.
 */
export class LandMine extends Actor {
  private _triggered = false;

  constructor(x: number, y: number) {
    const { width, height } = GAME.enemies.landMine;
    super({
      pos: new Vector(x, y),
      anchor: new Vector(0.5, 1),
      width,
      height,
      z: 4,
      color: Color.fromHex(GAME.colors.landMine),
    });
  }

  get isTriggered(): boolean {
    return this._triggered;
  }

  /** Trigger the mine — changes color to signal activation. */
  trigger(): void {
    this._triggered = true;
    this.color = Color.fromHex(GAME.colors.landMineTrigger);
  }

  override onInitialize(): void {
    // Simple disc shape via colored rectangle
  }
}
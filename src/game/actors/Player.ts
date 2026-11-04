import { Actor, Color, Keys, Rectangle, Vector, type Engine } from 'excalibur';
import { GAME } from '../config';
import { approach, clamp } from '../math';

/**
 * A minimal keyboard-driven actor: accelerates toward the input direction,
 * decelerates with friction, and stays inside the viewport.
 */
export class Player extends Actor {
  constructor() {
    const size = GAME.player.width;

    super({
      pos: new Vector(GAME.viewport.width / 2, GAME.viewport.height / 2),
      width: size,
      height: GAME.player.height,
      anchor: new Vector(0.5, 0.5),
      z: 10,
    });

    this.graphics.use(
      new Rectangle({
        width: size,
        height: GAME.player.height,
        color: Color.fromHex(GAME.player.color),
      }),
    );
  }

  override onPreUpdate(engine: Engine, delta: number): void {
    const seconds = delta / 1000;
    const keyboard = engine.input.keyboard;

    let dx = 0;
    let dy = 0;
    if (keyboard.isHeld(Keys.A) || keyboard.isHeld(Keys.Left)) dx -= 1;
    if (keyboard.isHeld(Keys.D) || keyboard.isHeld(Keys.Right)) dx += 1;
    if (keyboard.isHeld(Keys.W) || keyboard.isHeld(Keys.Up)) dy -= 1;
    if (keyboard.isHeld(Keys.S) || keyboard.isHeld(Keys.Down)) dy += 1;

    const length = Math.hypot(dx, dy);
    const moving = length > 0;
    if (moving) {
      dx /= length;
      dy /= length;
    }

    const rate = moving ? GAME.player.acceleration : GAME.player.friction;
    this.vel.x = approach(this.vel.x, dx * GAME.player.maxSpeed, rate * seconds);
    this.vel.y = approach(this.vel.y, dy * GAME.player.maxSpeed, rate * seconds);

    const halfW = GAME.player.width / 2;
    const halfH = GAME.player.height / 2;
    this.pos.x = clamp(this.pos.x, halfW, GAME.viewport.width - halfW);
    this.pos.y = clamp(this.pos.y, halfH, GAME.viewport.height - halfH);

    if (keyboard.wasPressed(Keys.R)) {
      this.pos.x = GAME.viewport.width / 2;
      this.pos.y = GAME.viewport.height / 2;
      this.vel.x = 0;
      this.vel.y = 0;
    }
  }
}

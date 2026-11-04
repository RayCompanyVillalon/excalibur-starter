import { Actor, Color, Rectangle, Vector } from 'excalibur';
import { GAME } from '../config';
import type { Aabb } from '../physics/aabb';
import { bodyAabb } from '../physics/kinematic';
import { createPlayerState, stepPlayer, type Intent, type PlayerState } from '../player/controller';

/**
 * Thin Excalibur wrapper around the pure player controller: the actor owns a
 * `PlayerState`, steps it, and mirrors the result onto `Actor.pos`.
 */
export class Player extends Actor {
  private state: PlayerState;

  constructor(spawn: { x: number; y: number }) {
    super({
      pos: new Vector(0, 0),
      anchor: new Vector(0, 0),
      width: GAME.player.width,
      height: GAME.player.height,
      z: 10,
    });

    this.state = createPlayerState(spawn);
    this.graphics.use(
      new Rectangle({
        width: GAME.player.width,
        height: GAME.player.height,
        color: Color.fromHex(GAME.colors.player),
      }),
    );
    this.sync();
  }

  get kinematics() {
    return this.state.body;
  }

  get grounded(): boolean {
    return this.state.onGround;
  }

  get facing(): 1 | -1 {
    return this.state.facing;
  }

  step(intent: Intent, solids: readonly Aabb[], dtMs: number): void {
    stepPlayer(this.state, intent, solids, dtMs);
    this.sync();
  }

  respawn(spawn: { x: number; y: number }): void {
    this.state = createPlayerState(spawn);
    this.sync();
  }

  freeze(): void {
    this.state.body.vx = 0;
    this.state.body.vy = 0;
    this.state.onGround = true;
  }

  bounds(): Aabb {
    return bodyAabb(this.state.body);
  }

  private sync(): void {
    this.pos.setTo(this.state.body.x, this.state.body.y);
  }
}

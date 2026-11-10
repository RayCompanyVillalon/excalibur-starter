import { Actor, Color, Vector } from 'excalibur';
import { GAME } from '../config';
import type { Aabb } from '../physics/aabb';
import { overlaps } from '../physics/aabb';

/**
 * An evil mushroom person that patrols left and right on its platform.
 * Touching it kills the player.
 */
export class Mushroom extends Actor {
  private patrolLeft: number;
  private patrolRight: number;
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
      color: Color.fromHex(GAME.colors.mushroom),
    });
    this.patrolLeft = platformLeft + width / 2;
    this.patrolRight = platformRight - width / 2;
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
      // Simple fall - just kill the enemy if they fall off world
      this._alive = false;
      this.kill();
    }
  }
}
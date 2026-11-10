import { Actor, Color, Vector } from 'excalibur';
import { GAME } from '../config';
import type { Aabb } from '../physics/aabb';
import { overlaps } from '../physics/aabb';

type WormState = 'burrowed' | 'erupting' | 'surface' | 'submerging';

const WORM_COLOR = new Color(74, 55, 40, 1);
const WORM_WARNING = new Color(107, 84, 64, 1);
const WORM_HIDDEN = new Color(74, 55, 40, 0);

/**
 * The Giant Worm boss — burrows underground and violently erupts
 * to catch the player. The worm has a large hitbox and shows warning
 * indicators before surfacing.
 */
export class WormBoss extends Actor {
  private wormState: WormState = 'burrowed';
  private stateTimer = 0;
  private readonly arenaLeft: number;
  private readonly arenaRight: number;
  private readonly arenaY: number;
  private readonly surfaceY: number;
  private surfaceX = 0;
  private warningShown = false;
  /** Track visibility ourselves. */
  private hidden = true;

  constructor(
    arenaCenterX: number,
    arenaY: number,
    arenaWidth: number,
  ) {
    const size = GAME.world.tile * 2;
    super({
      pos: new Vector(arenaCenterX, arenaY + GAME.world.tile),
      anchor: new Vector(0.5, 0.5),
      width: size,
      height: GAME.world.tile * 3,
      z: 7,
      color: WORM_HIDDEN,
    });
    this.arenaLeft = arenaCenterX - arenaWidth / 2 + size / 2;
    this.arenaRight = arenaCenterX + arenaWidth / 2 - size / 2;
    this.arenaY = arenaY;
    this.surfaceY = arenaY - GAME.world.tile * 1.5;
    // Start burrowed (hidden)
    this.color = WORM_HIDDEN;
  }

  override onInitialize(): void {
    // Worm is initially hidden
  }

  override onPreUpdate(_engine: any, elapsed: number): void {
    this.stateTimer += elapsed;

    switch (this.wormState) {
      case 'burrowed': {
        this.hidden = true;
        this.color = WORM_HIDDEN;
        // Burrow for 2-3 seconds then erupt near the player
        if (this.stateTimer > 2000 + Math.random() * 1000) {
          this.wormState = 'erupting';
          this.stateTimer = 0;
          this.warningShown = false;
        }
        break;
      }

      case 'erupting': {
        // Brief warning phase (300ms) then burst up
        if (!this.warningShown) {
          this.warningShown = true;
          this.surfaceX = Math.max(
            this.arenaLeft,
            Math.min(this.arenaRight, this.pos.x),
          );
          this.pos.x = this.surfaceX;
          // Show subtle warning indicator
          this.hidden = false;
          this.color = WORM_WARNING;
        }

        if (this.stateTimer > 300) {
          // ERUPT! Move up to surface position
          this.pos.y = this.surfaceY;
          this.wormState = 'surface';
          this.stateTimer = 0;
          this.color = WORM_COLOR;
        }
        break;
      }

      case 'surface': {
        this.hidden = false;
        this.color = WORM_COLOR;
        // Stay on surface for 1.5-2.5 seconds
        if (this.stateTimer > 1500 + Math.random() * 1000) {
          this.wormState = 'submerging';
          this.stateTimer = 0;
        }
        break;
      }

      case 'submerging': {
        // Quick submerge animation (400ms)
        if (this.stateTimer > 400) {
          this.wormState = 'burrowed';
          this.stateTimer = 0;
          this.hidden = true;
          this.color = WORM_HIDDEN;
          this.pos.y = this.arenaY + GAME.world.tile;
        }
        break;
      }
    }
  }

  /** Check if the worm's body overlaps with the given AABB. */
  overlapsWith(aabb: Aabb): boolean {
    if (this.hidden) {
      return false;
    }
    const wormBox: Aabb = {
      x: this.pos.x - this.width / 2,
      y: this.pos.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
    return overlaps(wormBox, aabb);
  }
}
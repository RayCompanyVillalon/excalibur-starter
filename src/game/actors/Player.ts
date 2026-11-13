import {
  Actor,
  Animation,
  AnimationStrategy,
  type Graphic,
  SpriteSheet,
  Vector,
} from 'excalibur';
import { Images } from '../assets';
import { GAME } from '../config';
import type { Aabb } from '../physics/aabb';
import { bodyAabb } from '../physics/kinematic';
import {
  bouncePlayer,
  createPlayerState,
  resolveParry,
  stepPlayer,
  type Intent,
  type PlayerState,
} from '../player/controller';

const SCALE = () => new Vector(GAME.art.scale, GAME.art.scale);

let sheets: { walk: SpriteSheet; fall: SpriteSheet } | null = null;

function sheetsFor(): { walk: SpriteSheet; fall: SpriteSheet } {
  if (!sheets) {
    sheets = {
      walk: SpriteSheet.fromImageSource({
        image: Images.playerWalk,
        grid: { rows: 1, columns: 4, spriteWidth: GAME.art.tile, spriteHeight: GAME.art.tile },
      }),
      fall: SpriteSheet.fromImageSource({
        image: Images.playerFall,
        grid: { rows: 1, columns: 2, spriteWidth: GAME.art.tile, spriteHeight: GAME.art.tile },
      }),
    };
  }
  return sheets;
}

function animation(
  sheet: SpriteSheet,
  indices: number[],
  frameDuration: number,
): Animation {
  return new Animation({
    frames: indices.map((index) => ({
      graphic: sheet.getSprite(index, 0, { scale: SCALE() }),
      duration: frameDuration,
    })),
    strategy: AnimationStrategy.Loop,
  });
}

/**
 * Wrap a single graphic in a one-frame animation.
 *
 * Excalibur multiplies `graphics.offset` by the graphic's own scale. The frame
 * sprites here are drawn at 2x, so a bare Sprite would have its offset doubled
 * and be lifted off the ground. Using an Animation (scale 1) for every state
 * keeps the shared offset consistent, so idle/jump sit exactly like walk/fall.
 */
function still(graphic: Graphic): Animation {
  return new Animation({
    frames: [{ graphic, duration: 1000 }],
    strategy: AnimationStrategy.Loop,
  });
}

function setFlip(graphic: Graphic, flip: boolean): void {
  graphic.flipHorizontal = flip;
  if (graphic instanceof Animation) {
    for (const frame of graphic.frames) {
      if (frame.graphic) {
        frame.graphic.flipHorizontal = flip;
      }
    }
  }
}

/**
 * Thin Excalibur wrapper around the pure player controller. The actor owns a
 * `PlayerState`, steps it, mirrors the body onto `Actor.pos`, and swaps
 * animation frames based on grounded/vertical state.
 */
export class Player extends Actor {
  private state: PlayerState;
  private currentGraphic = 'idle';

  constructor(spawn: { x: number; y: number }) {
    super({
      pos: new Vector(0, 0),
      anchor: new Vector(0, 0),
      width: GAME.player.width,
      height: GAME.player.height,
      z: 10,
    });

    this.state = createPlayerState(spawn);
    this.buildGraphics();
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

  /** True while a dash burst is active. */
  get dashing(): boolean {
    return this.state.dashMsLeft > 0;
  }

  /** Direction of the active dash. */
  get dashDir(): 1 | -1 {
    return this.state.dashDir;
  }

  /** True while the parry window is open. */
  get parrying(): boolean {
    return this.state.parryMsLeft > 0;
  }

  /** True while invulnerable from a successful parry. */
  get parryInvulnerable(): boolean {
    return this.state.parryGraceMs > 0;
  }

  step(intent: Intent, solids: readonly Aabb[], dtMs: number): void {
    stepPlayer(this.state, intent, solids, dtMs);
    this.sync();
    this.updateAnimation();
  }

  respawn(spawn: { x: number; y: number }): void {
    this.state = createPlayerState(spawn);
    this.currentGraphic = 'idle';
    this.sync();
    this.updateAnimation();
  }

  /** Hop upward after stomping an enemy. */
  bounce(speed: number): void {
    bouncePlayer(this.state, speed);
    this.sync();
    this.updateAnimation();
  }

  /** Consume the parry window after a successful parry and grant grace time. */
  resolveParry(): void {
    resolveParry(this.state);
  }

  /** Snap the player to world coordinates — used by the debug flight tool. */
  teleport(x: number, y: number): void {
    this.state.body.x = x;
    this.state.body.y = y;
    this.state.body.vx = 0;
    this.state.body.vy = 0;
    this.state.onGround = false;
    this.sync();
  }

  freeze(): void {
    this.state.body.vx = 0;
    this.state.body.vy = 0;
    this.state.onGround = true;
    this.updateAnimation();
  }

  bounds(): Aabb {
    return bodyAabb(this.state.body);
  }

  /** Shift the body in world space, e.g. when a moving platform carries it. */
  translate(dx: number, dy: number): void {
    this.state.body.x += dx;
    this.state.body.y += dy;
    this.sync();
  }

  private buildGraphics(): void {
    const { walk, fall } = sheetsFor();

    this.graphics.add('idle', still(walk.getSprite(0, 0, { scale: SCALE() })));
    this.graphics.add('walk', animation(walk, [0, 1, 2, 3], 110));
    this.graphics.add('jump', still(Images.playerJump.toSprite({ scale: SCALE() })));
    this.graphics.add('fall', animation(fall, [0, 1], 150));
    this.graphics.use('idle');

    // The 16x16 frame draws at 32x32; centre it on the 16px-wide body and
    // plant its feet on the body's bottom edge.
    const artSize = GAME.art.tile * GAME.art.scale;
    this.graphics.offset = new Vector(
      (GAME.player.width - artSize) / 2,
      GAME.player.height - artSize,
    );
  }

  private updateAnimation(): void {
    const { body, onGround, facing } = this.state;

    let name = 'idle';
    if (!onGround) {
      name = body.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(body.vx) > 8) {
      name = 'walk';
    }

    if (name !== this.currentGraphic) {
      this.graphics.use(name);
      this.currentGraphic = name;
    }

    const graphic = this.graphics.getGraphic(name);
    if (graphic) {
      setFlip(graphic, facing < 0);
    }
  }

  private sync(): void {
    this.pos.setTo(this.state.body.x, this.state.body.y);
  }
}

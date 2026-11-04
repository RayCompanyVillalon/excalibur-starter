import {
  Actor,
  Color,
  Engine,
  ImageSource,
  Keys,
  Scene,
  Sprite,
  Vector,
} from 'excalibur';
import { Images } from '../assets';
import { audio } from '../audio/Sfx';
import { followCamera } from '../camera/follow';
import { GAME } from '../config';
import { readIntent } from '../input/InputMap';
import { LEVEL_MAP, parseLevel, type LevelData } from '../level/level';
import { renderTerrain } from '../level/terrain';
import { overlaps } from '../physics/aabb';
import { Player } from '../actors/Player';
import { Hud } from '../ui/hud';

const CLOUDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 120, y: 300 },
  { x: 430, y: 370 },
  { x: 760, y: 285 },
  { x: 1080, y: 390 },
  { x: 1390, y: 300 },
  { x: 1670, y: 365 },
];

export class LevelScene extends Scene {
  private level!: LevelData;
  private player!: Player;
  private readonly hud = new Hud();
  private complete = false;
  private stepTimer = 0;

  override onInitialize(): void {
    this.level = parseLevel(LEVEL_MAP);
    this.backgroundColor = Color.fromHex(GAME.colors.background);

    this.buildTerrain();
    this.buildClouds();
    this.buildGoal();

    this.player = new Player(this.level.spawn);
    this.add(this.player);

    this.resetCamera();
    this.hud.toast('Reach the door', 2600);

    // Browsers only allow audio after a gesture, so start the loop on the
    // first key press or click.
    const unlock = (): void => {
      audio.startMusic();
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  override onPreUpdate(engine: Engine, elapsed: number): void {
    const keyboard = engine.input.keyboard;

    if (keyboard.wasPressed(Keys.F1)) {
      this.hud.toggleDebug();
    }
    if (keyboard.wasPressed(Keys.M)) {
      const muted = audio.toggleMute();
      this.hud.toast(muted ? 'Sound off' : 'Sound on', 1000);
    }
    if (keyboard.wasPressed(Keys.R)) {
      this.respawn();
      return;
    }

    if (this.complete) {
      return;
    }

    const wasGrounded = this.player.grounded;
    const fallSpeed = this.player.kinematics.vy;
    this.player.step(readIntent(keyboard), this.level.solids, elapsed);

    const grounded = this.player.grounded;
    if (wasGrounded && !grounded && this.player.kinematics.vy < 0) {
      audio.jump();
    } else if (!wasGrounded && grounded && fallSpeed > 220) {
      audio.land(fallSpeed);
    }

    if (grounded && Math.abs(this.player.kinematics.vx) > 40) {
      this.stepTimer += elapsed;
      if (this.stepTimer >= 200) {
        this.stepTimer = 0;
        audio.step();
      }
    } else {
      this.stepTimer = 0;
    }

    if (this.player.pos.y > this.level.heightPx + GAME.level.killPlanePadding) {
      audio.death();
      this.respawn();
      return;
    }

    if (overlaps(this.player.bounds(), this.level.goal)) {
      this.complete = true;
      this.player.freeze();
      this.hud.toast('LEVEL COMPLETE — press R to play again', 4000);
    }
  }

  override onPostUpdate(_engine: Engine, elapsed: number): void {
    const focus = followCamera(
      { x: this.camera.pos.x, y: this.camera.pos.y },
      {
        x: this.player.pos.x + this.player.width / 2,
        y: this.player.pos.y + this.player.height / 2,
      },
      GAME.viewport,
      { width: this.level.widthPx, height: this.level.heightPx },
      GAME.camera,
      elapsed,
    );
    this.camera.pos.setTo(focus.x, focus.y);

    if (this.hud.debugOn) {
      const { x, y } = this.player.pos;
      const { vx, vy } = this.player.kinematics;
      this.hud.setDebugText(
        [
          `pos   ${x.toFixed(1)}, ${y.toFixed(1)}`,
          `vel   ${vx.toFixed(1)}, ${vy.toFixed(1)}`,
          `ground ${this.player.grounded ? 'yes' : 'no'}`,
          `facing ${this.player.facing > 0 ? 'right' : 'left'}`,
          `world  ${this.level.widthPx} x ${this.level.heightPx}`,
        ].join('\n'),
      );
    }
  }

  private buildTerrain(): void {
    const canvas = renderTerrain(this.level, Images.terrain);
    const image = ImageSource.fromHtmlCanvasElement(canvas);
    const terrain = new Actor({
      pos: new Vector(0, 0),
      anchor: new Vector(0, 0),
      width: this.level.widthPx,
      height: this.level.heightPx,
      z: -10,
    });
    terrain.graphics.use(new Sprite({ image }));
    this.add(terrain);
  }

  private buildClouds(): void {
    // Cloud.png is a single 32x16 cloud split into two 16px halves, so draw
    // the whole image instead of slicing it into frames.
    const sprite = Images.cloud.toSprite({
      scale: new Vector(GAME.art.scale, GAME.art.scale),
      opacity: 0.45,
      tint: Color.fromHex('#c7dcec'),
    });

    for (const spot of CLOUDS) {
      const cloud = new Actor({
        pos: new Vector(spot.x, spot.y),
        anchor: new Vector(0, 0),
        width: 32 * GAME.art.scale,
        height: GAME.art.tile * GAME.art.scale,
        z: -8,
      });
      cloud.graphics.use(sprite);
      this.add(cloud);
    }
  }

  private buildGoal(): void {
    const goal = this.level.goal;
    const doorWidth = GAME.art.tile * GAME.art.scale;
    const doorHeight = 32 * GAME.art.scale;

    const door = new Actor({
      pos: new Vector(goal.x + (goal.width - doorWidth) / 2, goal.y + goal.height - doorHeight),
      anchor: new Vector(0, 0),
      width: doorWidth,
      height: doorHeight,
      z: 2,
    });
    door.graphics.use(Images.door.toSprite({ scale: new Vector(GAME.art.scale, GAME.art.scale) }));
    this.add(door);
  }

  private respawn(): void {
    this.complete = false;
    this.stepTimer = 0;
    this.player.respawn(this.level.spawn);
    this.resetCamera();
    this.hud.toast('Respawn', 1200);
  }

  private resetCamera(): void {
    const target = {
      x: this.player.pos.x + this.player.width / 2,
      y: this.player.pos.y + this.player.height / 2,
    };
    const focus = followCamera(
      target,
      target,
      GAME.viewport,
      { width: this.level.widthPx, height: this.level.heightPx },
      GAME.camera,
      1000,
    );
    this.camera.pos.setTo(focus.x, focus.y);
  }
}

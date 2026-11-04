import { Actor, Color, Engine, Keys, Rectangle, Scene, Vector } from 'excalibur';
import { GAME } from '../config';
import { followCamera } from '../camera/follow';
import { readIntent } from '../input/InputMap';
import { LEVEL_MAP, parseLevel, type LevelData } from '../level/level';
import { overlaps } from '../physics/aabb';
import { Player } from '../actors/Player';
import { Hud } from '../ui/hud';

export class LevelScene extends Scene {
  private level!: LevelData;
  private player!: Player;
  private goal!: Actor;
  private readonly hud = new Hud();
  private complete = false;

  override onInitialize(): void {
    this.level = parseLevel(LEVEL_MAP);
    this.backgroundColor = Color.fromHex(GAME.colors.background);

    this.buildTerrain();
    this.buildGoal();

    this.player = new Player(this.level.spawn);
    this.add(this.player);

    this.resetCamera();
    this.hud.toast('Reach the green marker', 2600);
  }

  override onPreUpdate(engine: Engine, elapsed: number): void {
    const keyboard = engine.input.keyboard;

    if (keyboard.wasPressed(Keys.F1)) {
      this.hud.toggleDebug();
    }
    if (keyboard.wasPressed(Keys.R)) {
      this.respawn();
      return;
    }

    if (this.complete) {
      return;
    }

    this.player.step(readIntent(keyboard), this.level.solids, elapsed);

    if (this.player.pos.y > this.level.heightPx + GAME.level.killPlanePadding) {
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
    for (const solid of this.level.solids) {
      const block = new Actor({
        pos: new Vector(solid.x, solid.y),
        anchor: new Vector(0, 0),
        width: solid.width,
        height: solid.height,
        z: 0,
      });
      block.graphics.use(
        new Rectangle({
          width: solid.width,
          height: solid.height,
          color: Color.fromHex(GAME.colors.terrain),
        }),
      );
      this.add(block);

      const lip = new Actor({
        pos: new Vector(solid.x, solid.y),
        anchor: new Vector(0, 0),
        width: solid.width,
        height: 4,
        z: 1,
      });
      lip.graphics.use(
        new Rectangle({
          width: solid.width,
          height: 4,
          color: Color.fromHex(GAME.colors.terrainTop),
        }),
      );
      this.add(lip);
    }
  }

  private buildGoal(): void {
    this.goal = new Actor({
      pos: new Vector(this.level.goal.x, this.level.goal.y),
      anchor: new Vector(0, 0),
      width: this.level.goal.width,
      height: this.level.goal.height,
      z: 2,
    });
    this.goal.graphics.use(
      new Rectangle({
        width: this.level.goal.width,
        height: this.level.goal.height,
        color: Color.fromHex(GAME.colors.goal),
      }),
    );
    this.add(this.goal);
  }

  private respawn(): void {
    this.complete = false;
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

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
import { parseLevel, type LevelData } from '../level/level';
import { LEVELS, type LevelInfo } from '../level/levels';
import { CAVE_TERRAIN, renderTerrainChunks } from '../level/terrain';
import { overlaps, type Aabb } from '../physics/aabb';
import { Player } from '../actors/Player';
import { Collectible } from '../actors/Collectible';
import { Spike } from '../actors/Spike';
import { Mushroom } from '../actors/Mushroom';
import { Spider, SpiderWeb } from '../actors/Spider';
import { Stalactite } from '../actors/Stalactite';
import { BearTrap } from '../actors/BearTrap';
import { Goblin } from '../actors/Goblin';
import { LandMine } from '../actors/LandMine';
import { WormBoss } from '../actors/WormBoss';
import { MovingPlatform } from '../actors/MovingPlatform';
import { Saw } from '../actors/Saw';
import { Cannon, type Shot } from '../actors/Cannon';
import { Projectile } from '../actors/Projectile';
import { DarknessPostProcessor } from '../graphics/DarknessPostProcessor';
import { Hud } from '../ui/hud';
import { formatTime } from '../ui/time';

const CLOUD_SPACING = 250;

/** Digit hotkeys used by the debug level picker, in level order. */
const LEVEL_KEYS = [
  Keys.Digit1,
  Keys.Digit2,
  Keys.Digit3,
  Keys.Digit4,
  Keys.Digit5,
  Keys.Digit6,
  Keys.Digit7,
  Keys.Digit8,
  Keys.Digit9,
];

/** A tapered cyan streak used for dash afterimages. */
let dashStreakSource: ImageSource | null = null;
function dashStreak(): ImageSource {
  if (!dashStreakSource) {
    const canvas = document.createElement('canvas');
    canvas.width = 46;
    canvas.height = 12;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    const gradient = ctx.createLinearGradient(0, 0, 46, 0);
    gradient.addColorStop(0, 'rgba(120, 210, 255, 0)');
    gradient.addColorStop(0.6, 'rgba(150, 225, 255, 0.55)');
    gradient.addColorStop(1, 'rgba(220, 245, 255, 0.9)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(23, 6, 23, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    dashStreakSource = ImageSource.fromHtmlCanvasElement(canvas);
  }
  return dashStreakSource;
}

/** A cyan ring that flashes outward when a parry connects. */
let parryRingSource: ImageSource | null = null;
function parryRing(): ImageSource {
  if (!parryRingSource) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#8fe6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 27, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150, 230, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.stroke();
    parryRingSource = ImageSource.fromHtmlCanvasElement(canvas);
  }
  return parryRingSource;
}

/** Terrain chunk geometry and their GPU-backed images. */
interface TerrainTextures {
  bounds: Array<{ x: number; width: number; height: number }>;
  images: ImageSource[];
}

export class LevelScene extends Scene {
  private level!: LevelData;
  private levelInfo!: LevelInfo;
  private levelIndex = 0;
  /**
   * Terrain textures are rebuilt only when the level actually changes. Keeping
   * one level's chunks (instead of one set per visited level) bounds memory
   * while still making repeated reloads of the same level allocation-free.
   */
  private terrainInfo: LevelInfo | null = null;
  private terrainTextures: TerrainTextures | null = null;
  private player!: Player;
  private collectible: Collectible | null = null;
  private spikes: Spike[] = [];
  private mushrooms: Mushroom[] = [];
  private spiders: Spider[] = [];
  private stalactites: Stalactite[] = [];
  private bearTraps: BearTrap[] = [];
  private goblins: Goblin[] = [];
  private landMines: LandMine[] = [];
  private wormBoss: WormBoss | null = null;
  private platforms: MovingPlatform[] = [];
  private saws: Saw[] = [];
  private cannons: Cannon[] = [];
  private projectiles: Projectile[] = [];
  /** Static terrain plus the moving platforms, rebuilt every frame. */
  private solids: Aabb[] = [];
  private readonly hud = new Hud();
  private complete = false;
  private ingredientCollected = false;
  private stepTimer = 0;
  private respawnTimer = 0;
  private respawning = false;
  /** Countdown to auto-loading the next level after a clear, in ms. */
  private advanceTimerMs = 0;
  private goalHintMs = 0;
  private bossIntroShown = false;
  private bossEnragedShown = false;
  private flightMode = false;
  private dashTrail: { actor: Actor; lifeMs: number }[] = [];
  private dashTrailTimer = 0;
  private parryRings: { actor: Actor; lifeMs: number }[] = [];
  private _goblinMashCount = 0;
  private darkness: DarknessPostProcessor | null = null;

  override onInitialize(engine: Engine): void {
    this.hud.loadScore();
    (this as any)._engine = engine;
    // start the loop on the first key press or click. Keep listening until the
    // context actually unlocks, then detach. Cap the retries: `keydown` repeats
    // while a key is held, and a failed unlock must not queue a new attempt on
    // every repeat.
    let unlockAttempts = 0;
    const detachUnlock = (): void => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    const unlock = (): void => {
      if (unlockAttempts >= 8) {
        detachUnlock();
        return;
      }
      unlockAttempts += 1;
      void audio.unlock().then((ok) => {
        if (ok) {
          detachUnlock();
        }
      });
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    // Listen for T key to toggle the stats panel overlay.
    window.addEventListener('keydown', (ev) => {
      if (ev.code === 'KeyT') {
        this.hud.toggleStats();
      }
    });

    // `?level=2` boots straight into a level, which is handy for playtesting.
    const requested = Number(new URLSearchParams(window.location.search).get('level') ?? '1');
    const startIndex =
      Number.isInteger(requested) && requested >= 1 && requested <= LEVELS.length
        ? requested - 1
        : 0;
    this.hud.setLevelSelector(LEVELS, (index) => this.loadLevel(index));
    this.loadLevel(startIndex);
  }

  private loadLevel(index: number): void {
    this.clearEntities();
    this.clearDashTrail();
    this.clearParryRings();
    this.spikes = [];
    this.mushrooms = [];
    this.spiders = [];
    this.stalactites = [];
    this.bearTraps = [];
    this.goblins = [];
    this.landMines = [];
    this.platforms = [];
    this.saws = [];
    this.cannons = [];
    this.projectiles = [];
    this.wormBoss = null;
    this.complete = false;
    this.ingredientCollected = false;
    this.respawning = false;
    this.respawnTimer = 0;
    this.advanceTimerMs = 0;
    this.stepTimer = 0;
    this.goalHintMs = 0;
    this.bossIntroShown = false;
    this.bossEnragedShown = false;
    this.dashTrailTimer = 0;

    const info = LEVELS[index];
    if (!info) {
      throw new Error(`Missing level ${index}`);
    }
    this.levelInfo = info;
    this.levelIndex = index;
    this.level = parseLevel(info.map);

    const cave = info.tileset === 'underworld';
    this.backgroundColor = Color.fromHex(
      cave ? GAME.colors.caveBackground : GAME.colors.background,
    );
    if (info.dark && !this.darkness) {
      this.darkness = new DarknessPostProcessor();
      (this as any)._engine.graphicsContext.addPostProcessor(this.darkness);
    }
    if (this.darkness) {
      this.darkness.enabled = Boolean(info.dark);
    }

    this.buildTerrain();
    this.buildClouds();
    this.buildGoal();
    this.buildSpikes();
    this.buildCollectible();
    if (info.enemies === 'spider') {
      this.buildSpiders();
    } else {
      this.buildMushrooms();
    }
    if (info.goblins) {
      this.buildGoblins();
    }
    this.buildBearTraps();
    this.buildStalactites();
    this.buildLandMines();
    this.buildWormBoss();
    this.buildPlatforms();
    this.buildSaws();
    this.buildCannons();

    this.solids = [...this.level.solids, ...this.platforms.map((platform) => platform.bounds())];

    this.player = new Player(this.level.spawn);
    this.add(this.player);

    this.hud.useBestTime(info.id);
    this.hud.resetTimer();
    this.hud.setIngredient(info.ingredient, false);
    this.resetCamera();

    const label = `${info.section} — ${info.name}`;
    this.hud.markActiveLevel(index);
    this.hud.toast(`${label} · reach the exit with the ${info.ingredient}`, 3200);
    this.hud.setLevelLabel(label);
  }

  private clearEntities(): void {
    for (const actor of [...this.actors]) {
      actor.kill();
    }
  }

  override onPreUpdate(engine: Engine, elapsed: number): void {
    const keyboard = engine.input.keyboard;

    if (keyboard.wasPressed(Keys.F1)) {
      this.hud.toggleDebug();
    }
    if (this.hud.debugOn) {
      const pick = LEVEL_KEYS.findIndex((key) => keyboard.wasPressed(key));
      if (pick !== -1 && pick < LEVELS.length) {
        if (pick !== this.levelIndex) {
          this.loadLevel(pick);
        }
        return;
      }
    }
    if (keyboard.wasPressed(Keys.M)) {
      const muted = audio.toggleMute();
      this.hud.toast(muted ? 'Sound off' : 'Sound on', 1000);
    }
    if (keyboard.wasPressed(Keys.R)) {
      this.resetRun('Run reset');
      return;
    }
    if (
      keyboard.wasPressed(Keys.N) &&
      this.complete &&
      this.levelIndex + 1 < LEVELS.length
    ) {
      this.loadLevel(this.levelIndex + 1);
      return;
    }
    if (this.hud.debugOn && keyboard.wasPressed(Keys.K)) {
      if (this.levelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.levelIndex + 1);
      }
      return;
    }
    if (this.hud.debugOn && keyboard.wasPressed(Keys.J)) {
      this.flightMode = !this.flightMode;
      this.hud.toast(this.flightMode ? 'Flight: cursor moves player' : 'Flight off', 1200);
    }

    if (this.complete) {
      // Auto-advance to the next level after a short victory beat.
      if (this.levelIndex + 1 < LEVELS.length) {
        this.advanceTimerMs -= elapsed;
        if (this.advanceTimerMs <= 0) {
          this.loadLevel(this.levelIndex + 1);
        }
      }
      return;
    }
    if (this.respawning) {
      return;
    }

    const intent = readIntent(keyboard);
    if (intent.moveX !== 0 || intent.jumpPressed || intent.dashPressed || intent.parryPressed) {
      this.hud.startTimer();
    }
    this.hud.tickTimer();

    this.goalHintMs = Math.max(0, this.goalHintMs - elapsed);
    this.updateDynamicWorld(elapsed);

    const boss = this.levelInfo.boss;
    if (boss && !this.bossIntroShown && this.player.pos.x > boss.left * GAME.world.tile) {
      this.bossIntroShown = true;
      this.wormBoss?.awaken();
      this.hud.toast('The Giant Worm!', 1800);
    }
    if (this.wormBoss?.isEnraged && !this.bossEnragedShown) {
      this.bossEnragedShown = true;
      this.hud.toast('The worm is enraged!', 1400);
    }

    // Flight mode: click and drag to teleport the player anywhere.
    if (this.flightMode) {
      this.updateFlightMode(engine);
      if (!this.ingredientCollected && this.collectible && !this.collectible.isCollected) {
        if (overlaps(this.player.bounds(), this.collectibleBounds())) {
          this.pickupCollectible();
        }
      }
      if (overlaps(this.player.bounds(), this.level.goal)) {
        if (this.ingredientCollected) {
          this.completeLevel();
        }
      }
      return;
    }

    // Handle goblin grapple escape: player must mash E.
    const grappling = this.goblins.some((g) => g.isGrappling);
    if (grappling) {
      if (keyboard.wasPressed(Keys.E)) {
        // Each E press counts — break free after 5 presses.
        this._goblinMashCount = (this._goblinMashCount ?? 0) + 1;
        if (this._goblinMashCount >= 6) {
          for (const goblin of this.goblins) {
            if (goblin.isGrappling) {
              goblin.breakFree();
            }
          }
          this._goblinMashCount = 0;
          this.hud.toast('You broke free!', 1000);
        }
      }
      // Player can't move while grappled.
      return;
    } else {
      this._goblinMashCount = 0;
    }

    const wasGrounded = this.player.grounded;
    const fallSpeed = this.player.kinematics.vy;
    const prevFeet = this.player.bounds().y + this.player.height;
    this.player.step(intent, this.solids, elapsed);
    this.updateDashTrail(elapsed);

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
      this.killPlayer();
      return;
    }

    this.checkParryContact();

    if (this.checkSpikeContact()) return;
    if (this.checkSawContact()) return;
    if (this.checkProjectileContact()) return;
    if (this.checkEnemyContact(prevFeet, fallSpeed)) return;
    if (this.checkSpiderContact(prevFeet, fallSpeed)) return;
    if (this.checkStalactiteContact()) return;
    if (this.checkGoblinContact()) return;
    if (this.checkBearTrapContact()) return;
    if (this.checkLandMineContact()) return;
    if (this.checkWormContact()) return;

    if (!this.ingredientCollected && this.collectible && !this.collectible.isCollected) {
      if (overlaps(this.player.bounds(), this.collectibleBounds())) {
        this.pickupCollectible();
      }
    }

    if (overlaps(this.player.bounds(), this.level.goal)) {
      if (this.ingredientCollected) {
        this.completeLevel();
      } else if (this.goalHintMs <= 0) {
        this.goalHintMs = 1600;
        this.hud.toast(`Locked — find the ${this.levelInfo.ingredient} first!`, 1600);
      }
    }
  }

  override onPostUpdate(engine: Engine, elapsed: number): void {
    this.updateParryRings(elapsed);

    if (this.player.parryInvulnerable) {
      // Flicker the sprite while the post-parry grace window is active.
      this.player.graphics.opacity = Math.floor(elapsed / 55) % 2 === 0 ? 0.35 : 1;
    } else {
      this.player.graphics.opacity = 1;
    }

    if (this.respawning) {
      this.respawnTimer -= elapsed;
      if (this.respawnTimer <= 0) {
        this.respawning = false;
        this.resetRun('Respawn');
      }
      return;
    }

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

    // Feed the lamp shader the player's screen-space centre.
    if (this.darkness?.enabled) {
      const center = this.playerCenter();
      const screen = engine.worldToScreenCoordinates(new Vector(center.x, center.y));
      this.darkness.light.setTo(screen.x, screen.y);
      this.darkness.view.setTo(
        engine.screen.resolution.width,
        engine.screen.resolution.height,
      );
    }

    // Update spider and goblin knowledge of player position for seeking.
    const pCenter = this.playerCenter();
    for (const spider of this.spiders) {
      spider.playerX = pCenter.x;
      spider.playerY = pCenter.y;
    }
    for (const goblin of this.goblins) {
      goblin.playerX = pCenter.x;
      goblin.playerY = pCenter.y;
    }

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
          `level  ${this.levelInfo.section} — ${this.levelInfo.name}`,
          `item  ${this.ingredientCollected ? '✓' : '✗'} ${this.levelInfo.ingredient}`,
          `time  ${formatTime(this.hud.timeMs)}`,
          `score ${this.hud.score}  deaths ${this.hud.deaths}`,
          `shots ${this.projectiles.length}`,
          `spiders ${this.spiders.filter((spider) => spider.isAlive).length}/${this.spiders.length}`,
          `spikes ${this.stalactites.filter((stalactite) => stalactite.isDangerous).length}/${this.stalactites.length}`,
          `parry ${this.player.parrying ? 'active' : this.player.parryInvulnerable ? 'grace' : '—'}`,
          `boss  ${this.wormBoss ? (this.wormBoss.isDangerous ? 'surface!' : 'burrowed') : '—'}`,
          `flight ${this.flightMode ? 'ON' : 'off'}`,
          `pick   1-${LEVELS.length} or click a level`,
          `K     next level`,
        ].join('\n'),
      );
    }
  }

  // ─── Dynamic world ──────────────────────────────────────────────────

  private updateDynamicWorld(elapsed: number): void {
    // Work out which platform is carrying the player before anything moves.
    const rider = this.platforms.find((platform) => this.isRiding(platform)) ?? null;
    let carry = { x: 0, y: 0 };

    for (const platform of this.platforms) {
      const delta = platform.advance(elapsed);
      if (platform === rider) {
        carry = delta;
      }
    }
    if (rider && (carry.x !== 0 || carry.y !== 0)) {
      this.player.translate(carry.x, carry.y);
    }

    this.solids = [...this.level.solids, ...this.platforms.map((platform) => platform.bounds())];

    this.updateStalactites(elapsed, this.playerCenter());

    for (const saw of this.saws) {
      saw.advance(elapsed);
    }

    const target = this.playerCenter();
    this.wormBoss?.setTarget(target.x);
    for (const cannon of this.cannons) {
      const shot = cannon.advance(elapsed, target);
      if (shot) {
        this.spawnProjectile(shot);
      }
    }

    this.updateProjectiles(elapsed);
  }

  /**
   * Drop a stalactite once the player walks under it, then let it fall until
   * it hits the terrain. `solids` already includes the moving platforms.
   */
  private updateStalactites(elapsed: number, center: { x: number; y: number }): void {
    const floorY = this.level.heightPx + 64;
    for (const stalactite of this.stalactites) {
      if (stalactite.isDangerous && !stalactite.isFalling) {
        const dx = Math.abs(center.x - stalactite.pos.x);
        if (dx <= GAME.enemies.stalactite.triggerRangeX && center.y > stalactite.pos.y + 4) {
          stalactite.trigger();
        }
      }
      stalactite.advance(elapsed, this.solids, floorY);
    }
  }

  private isRiding(platform: MovingPlatform): boolean {
    if (!this.player.grounded) {
      return false;
    }
    const body = this.player.bounds();
    const box = platform.bounds();
    const feet = body.y + body.height;
    return (
      Math.abs(feet - box.y) <= 2 &&
      body.x + body.width > box.x + 1 &&
      body.x < box.x + box.width - 1
    );
  }

  private playerCenter(): { x: number; y: number } {
    return {
      x: this.player.pos.x + this.player.width / 2,
      y: this.player.pos.y + this.player.height / 2,
    };
  }

  /** Fade out the cyan streaks left behind by a dash. */
  private updateDashTrail(elapsed: number): void {
    for (const ghost of this.dashTrail) {
      ghost.lifeMs -= elapsed;
      ghost.actor.graphics.opacity = Math.max(0, ghost.lifeMs / 180) * 0.6;
      if (ghost.lifeMs <= 0) {
        ghost.actor.kill();
      }
    }
    this.dashTrail = this.dashTrail.filter((ghost) => ghost.lifeMs > 0);

    if (!this.player.dashing) {
      this.dashTrailTimer = 0;
      return;
    }

    this.dashTrailTimer += elapsed;
    if (this.dashTrailTimer < 40) {
      return;
    }
    this.dashTrailTimer = 0;

    const dir = this.player.dashDir;
    const actor = new Actor({
      pos: new Vector(
        this.player.pos.x + this.player.width / 2 - 23 - dir * 10,
        this.player.pos.y + this.player.height / 2 - 6,
      ),
      anchor: new Vector(0, 0),
      width: 46,
      height: 12,
      z: 9,
    });
    const sprite = new Sprite({ image: dashStreak(), opacity: 0.7 });
    sprite.flipHorizontal = dir < 0;
    actor.graphics.use(sprite);
    this.add(actor);
    this.dashTrail.push({ actor, lifeMs: 180 });
  }

  private clearDashTrail(): void {
    for (const ghost of this.dashTrail) {
      ghost.actor.kill();
    }
    this.dashTrail = [];
    this.dashTrailTimer = 0;
  }

  private spawnParryRing(): void {
    const center = this.playerCenter();
    const actor = new Actor({
      pos: new Vector(center.x, center.y),
      anchor: new Vector(0.5, 0.5),
      width: 64,
      height: 64,
      z: 11,
    });
    const sprite = new Sprite({ image: parryRing() });
    actor.graphics.use(sprite);
    this.add(actor);
    this.parryRings.push({ actor, lifeMs: 200 });
  }

  private updateParryRings(elapsed: number): void {
    for (const ring of this.parryRings) {
      ring.lifeMs -= elapsed;
      const t = 1 - Math.max(0, ring.lifeMs) / 200;
      ring.actor.graphics.opacity = Math.max(0, 1 - t) * 0.9;
      const scale = 0.6 + t * 1.1;
      ring.actor.graphics.offset = new Vector(-32 * (scale - 1), -32 * (scale - 1));
      ring.actor.scale.setTo(scale, scale);
      if (ring.lifeMs <= 0) {
        ring.actor.kill();
      }
    }
    this.parryRings = this.parryRings.filter((ring) => ring.lifeMs > 0);
  }

  private clearParryRings(): void {
    for (const ring of this.parryRings) {
      ring.actor.kill();
    }
    this.parryRings = [];
  }

  // ─── Flight mode ────────────────────────────────────────────────────

  private updateFlightMode(engine: Engine): void {
    const wp = engine.input.pointers.primary.lastWorldPos;
    this.player.teleport(
      wp.x - this.player.width / 2,
      wp.y - this.player.height,
    );
    this.hud.startTimer();
  }

  private spawnProjectile(shot: Shot): void {
    const projectile = new Projectile(shot);
    this.projectiles.push(projectile);
    this.add(projectile);
  }

  private updateProjectiles(elapsed: number): void {
    for (const projectile of this.projectiles) {
      projectile.advance(elapsed);
      const box = projectile.bounds();

      // Reflected shots explode the first mushroom or cannon they touch.
      if (projectile.isFriendly) {
        let hit = false;
        for (const mushroom of this.mushrooms) {
          if (!mushroom.isAlive) {
            continue;
          }
          const mbox = {
            x: mushroom.pos.x - mushroom.width / 2,
            y: mushroom.pos.y - mushroom.height,
            width: mushroom.width,
            height: mushroom.height,
          };
          if (overlaps(box, mbox)) {
            mushroom.fling(this.player.facing);
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const cannon of this.cannons) {
            if (!cannon.isDestroyed && overlaps(box, cannon.bounds())) {
              cannon.destroy();
              audio.parry();
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          projectile.kill();
          continue;
        }
      }

      const outOfWorld =
        box.x + box.width < -64 ||
        box.x > this.level.widthPx + 64 ||
        box.y + box.height < -64 ||
        box.y > this.level.heightPx + 64;
      if (projectile.expired || outOfWorld || this.solids.some((solid) => overlaps(box, solid))) {
        projectile.kill();
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.isKilled());
  }

  private clearProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.kill();
    }
    this.projectiles = [];
  }

  // ─── Level building ─────────────────────────────────────────────────

  private buildTerrain(): void {
    // A 4480px-wide texture exceeds the 4096px limit some GPUs advertise, so
    // the level is composited directly into horizontal chunks. Chunk textures
    // are reused while the same level stays loaded: reloading a level must not
    // upload a fresh ~30 MB of terrain every time.
    if (this.terrainInfo !== this.levelInfo) {
      this.terrainInfo = this.levelInfo;
      this.terrainTextures = null;
    }

    if (!this.terrainTextures) {
      const cave = this.levelInfo.tileset === 'underworld';
      const sheet = cave ? Images.caveTerrain : Images.terrain;
      const chunks = renderTerrainChunks(this.level, sheet, cave ? CAVE_TERRAIN : {});
      this.terrainTextures = {
        bounds: chunks.map((chunk) => ({
          x: chunk.x,
          width: chunk.canvas.width,
          height: chunk.canvas.height,
        })),
        images: chunks.map((chunk) => ImageSource.fromHtmlCanvasElement(chunk.canvas)),
      };
    }

    const terrain = this.terrainTextures;
    terrain.bounds.forEach((bounds, index) => {
      const image = terrain.images[index];
      if (!image) {
        return;
      }
      const terrainActor = new Actor({
        pos: new Vector(bounds.x, 0),
        anchor: new Vector(0, 0),
        width: bounds.width,
        height: bounds.height,
        z: -10,
      });
      terrainActor.graphics.use(new Sprite({ image }));
      this.add(terrainActor);
    });
  }

  private buildClouds(): void {
    // Caves are enclosed; a drifting cloud would break the illusion.
    if (this.levelInfo.tileset === 'underworld') {
      return;
    }
    const sprite = Images.cloud.toSprite({
      scale: new Vector(GAME.art.scale, GAME.art.scale),
      opacity: 0.45,
      tint: Color.fromHex('#c7dcec'),
    });
    const cloudWidth = 32 * GAME.art.scale;
    const cloudHeight = GAME.art.tile * GAME.art.scale;
    const count = Math.ceil(this.level.widthPx / CLOUD_SPACING);

    // Scatter clouds through the whole sky band (not just the top of the map),
    // nudging any that would sit inside terrain up until they are clear.
    for (let index = 0; index < count; index += 1) {
      const x = index * CLOUD_SPACING + 80;
      let y = 100 + ((index * 211) % 660);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const box = { x, y, width: cloudWidth, height: cloudHeight };
        if (!this.level.solids.some((solid) => overlaps(box, solid))) {
          break;
        }
        y -= 120;
      }
      if (y < 0) {
        continue;
      }

      const cloud = new Actor({
        pos: new Vector(x, y),
        anchor: new Vector(0, 0),
        width: cloudWidth,
        height: cloudHeight,
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

  private buildSpikes(): void {
    for (const spikeRect of this.level.spikes) {
      const spike = new Spike(spikeRect.x, spikeRect.y, spikeRect.width, spikeRect.height);
      this.spikes.push(spike);
      this.add(spike);
    }
  }

  private buildCollectible(): void {
    const pos = this.level.collectibles[0];
    if (!pos) {
      this.collectible = null;
      return;
    }
    this.collectible = new Collectible(pos, this.levelInfo.ingredient);
    this.add(this.collectible);
  }

  private buildPlatforms(): void {
    const sheet = this.levelInfo.tileset === 'underworld' ? Images.caveTerrain : Images.terrain;
    for (const spec of this.levelInfo.platforms ?? []) {
      const platform = new MovingPlatform(spec, sheet);
      this.platforms.push(platform);
      this.add(platform);
    }
  }

  private buildSaws(): void {
    for (const spec of this.levelInfo.saws ?? []) {
      const saw = new Saw(spec);
      this.saws.push(saw);
      this.add(saw);
    }
  }

  private buildCannons(): void {
    for (const spec of this.levelInfo.cannons ?? []) {
      const cannon = new Cannon(spec);
      this.cannons.push(cannon);
      this.add(cannon);
    }
  }

  private buildMushrooms(): void {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'M') {
          continue;
        }
        const x = (col + 0.5) * tile;
        const y = (row + 1) * tile;
        const bounds = this.findPlatformBounds(col, row);
        const mushroom = new Mushroom(x, y, bounds.left, bounds.right);
        mushroom.setSolids(this.level.solids);
        this.mushrooms.push(mushroom);
        this.add(mushroom);
      }
    }
  }

  /**
   * Cave spiders hang from the solid tile above each `M` marker. The marker
   * sits in the air cell directly under the ceiling.
   */
  private buildSpiders(): void {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'M') {
          continue;
        }
        const anchorX = (col + 0.5) * tile;
        const anchorY = row * tile;
        const spider = new Spider(anchorX, anchorY);
        spider.setSolids(this.level.solids);
        const web = new SpiderWeb(anchorX, anchorY);
        this.spiders.push(spider);
        this.add(web);
        this.add(spider);
      }
    }
  }

  /**
   * Goblins roam the cave platforms and chase the player to steal coins.
   */
  private buildGoblins(): void {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'G') {
          continue;
        }
        const x = (col + 0.5) * tile;
        const y = (row + 1) * tile;
        const bounds = this.findPlatformBounds(col, row);
        const goblin = new Goblin(x, y, bounds.left, bounds.right);
        void this.level; // goblins don't need solids
        this.goblins.push(goblin);
        this.add(goblin);
      }
    }
  }

  private buildBearTraps(): void {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'B') {
          continue;
        }
        let surfaceY = (row + 1) * tile;
        for (let below = row + 1; below < rows.length; below += 1) {
          if ((rows[below] ?? '')[col] === '#') {
            surfaceY = below * tile;
            break;
          }
        }
        const trap = new BearTrap((col + 0.5) * tile, surfaceY);
        this.bearTraps.push(trap);
        this.add(trap);
      }
    }
  }

  /** Stalactites hang from the solid tile above each `T` marker. */
  private buildStalactites(): void {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'T') {
          continue;
        }
        const stalactite = new Stalactite((col + 0.5) * tile, row * tile);
        this.stalactites.push(stalactite);
        this.add(stalactite);
      }
    }
  }

  private buildLandMines(): void {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== 'L') {
          continue;
        }
        const x = (col + 0.5) * tile;
        let surfaceY = (row + 1) * tile;
        for (let below = row + 1; below < rows.length; below += 1) {
          if ((rows[below] ?? '')[col] === '#') {
            // The top face of the first solid tile below the marker.
            surfaceY = below * tile;
            break;
          }
        }
        const mine = new LandMine(x, surfaceY);
        this.landMines.push(mine);
        this.add(mine);
      }
    }
  }

  private buildWormBoss(): void {
    const spec = this.levelInfo.boss;
    if (!spec) {
      return;
    }
    const tile = GAME.world.tile;
    this.wormBoss = new WormBoss({
      left: spec.left * tile,
      right: spec.right * tile,
      groundY: spec.groundRow * tile,
    });
    this.add(this.wormBoss);
  }

  /**
   * Find the patrol bounds for a mushroom: the flat run at the same surface
   * height as the marker's column, so enemies never walk into a step.
   */
  private findPlatformBounds(col: number, row: number): { left: number; right: number } {
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    const width = Math.max(...rows.map((line) => line.length));

    const surfaceRow = (column: number): number => {
      for (let r = row + 1; r < rows.length; r += 1) {
        if ((rows[r] ?? '')[column] === '#') {
          return r;
        }
      }
      return -1;
    };

    const surface = surfaceRow(col);
    if (surface < 0) {
      return { left: (col - 2) * tile, right: (col + 3) * tile };
    }

    // A column belongs to the same run only if nothing blocks the enemy's
    // walking row and its ground sits at the same height. This stops patrols
    // at raised steps and adjacent higher ledges.
    const sameRun = (column: number): boolean =>
      (rows[row] ?? '')[column] !== '#' && surfaceRow(column) === surface;

    let left = col;
    while (left > 0 && sameRun(left - 1)) {
      left -= 1;
    }
    let right = col;
    while (right + 1 < width && sameRun(right + 1)) {
      right += 1;
    }

    return { left: left * tile, right: (right + 1) * tile };
  }

  // ─── Collision checks ───────────────────────────────────────────────

  private collectibleBounds(): Aabb {
    const collectible = this.collectible;
    if (!collectible) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: collectible.pos.x - collectible.width / 2,
      y: collectible.pos.y - collectible.height / 2,
      width: collectible.width,
      height: collectible.height,
    };
  }

  private checkParryContact(): void {
    if (!this.player.parrying) {
      return;
    }
    const box = this.parryBox();
    const exact = this.player.bounds();

    // Flung mushrooms: launch the first living enemy within reach.
    for (const mushroom of this.mushrooms) {
      if (!mushroom.isAlive) {
        continue;
      }
      const mbox = {
        x: mushroom.pos.x - mushroom.width / 2,
        y: mushroom.pos.y - mushroom.height,
        width: mushroom.width,
        height: mushroom.height,
      };
      if (overlaps(box, mbox)) {
        mushroom.fling(this.player.facing);
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        return;
      }
    }

    // Cave spiders: cut them loose from the web.
    for (const spider of this.spiders) {
      if (!spider.isAlive) {
        continue;
      }
      if (overlaps(box, spider.bounds())) {
        spider.fling(this.player.facing);
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        return;
      }
    }

    // Falling stalactites: shatter the first one within reach.
    for (const stalactite of this.stalactites) {
      if (!stalactite.isDangerous) {
        continue;
      }
      if (overlaps(box, stalactite.bounds())) {
        stalactite.shatter();
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        return;
      }
    }

    // Bear traps: disarm the first one within reach.
    for (const trap of this.bearTraps) {
      if (trap.isTriggered) {
        continue;
      }
      const tbox = {
        x: trap.pos.x - trap.width / 2,
        y: trap.pos.y - trap.height,
        width: trap.width,
        height: trap.height,
      };
      if (overlaps(box, tbox)) {
        trap.disarm();
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        this.hud.toast('Bear trap disarmed!', 1200);
        return;
      }
    }

    // Goblins: stun any non-stunned goblin within reach.
    for (const goblin of this.goblins) {
      if (goblin.isStunned || !goblin.isDangerous) {
        continue;
      }
      if (overlaps(box, goblin.bounds())) {
        goblin.breakFree();
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        this.hud.toast('Goblin repelled!', 1200);
        return;
      }
    }

    // Reflected cannonballs: send the first enemy shot back the way it came.
    for (const projectile of this.projectiles) {
      if (projectile.isFriendly) {
        continue;
      }
      if (overlaps(box, projectile.bounds())) {
        projectile.reflect();
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        return;
      }
    }

    // Popped land mines: neutralise the first mine within reach.
    for (const mine of this.landMines) {
      if (mine.isTriggered) {
        continue;
      }
      const mbox = {
        x: mine.pos.x - mine.width / 2,
        y: mine.pos.y - mine.height,
        width: mine.width,
        height: mine.height,
      };
      if (overlaps(box, mbox)) {
        mine.disarm();
        this.player.resolveParry();
        audio.parry();
        this.spawnParryRing();
        return;
      }
    }

    // Knocked-down worm: force a surfaced body back underground.
    if (this.wormBoss?.isDangerous && this.wormBoss.overlapsWith(box)) {
      this.wormBoss.forceSubmerge();
      this.player.resolveParry();
      audio.parry();
      this.spawnParryRing();
      return;
    }

    // Environmental hazards: negate contact if actually touching.
    if (this.touchingSpikes(exact) || this.touchingSaws(exact)) {
      this.player.resolveParry();
      audio.parry();
      this.spawnParryRing();
    }
  }

  private parryBox(): Aabb {
    const body = this.player.bounds();
    const reach = GAME.parry.reachPx;
    return {
      x: body.x - reach,
      y: body.y - reach,
      width: body.width + reach * 2,
      height: body.height + reach * 2,
    };
  }

  private touchingSpikes(box: Aabb): boolean {
    for (const spike of this.spikes) {
      if (
        overlaps(box, {
          x: spike.pos.x - spike.width / 2,
          y: spike.pos.y,
          width: spike.width,
          height: spike.height,
        })
      ) {
        return true;
      }
    }
    return false;
  }

  private touchingSaws(box: Aabb): boolean {
    return this.saws.some((saw) => overlaps(box, saw.bounds()));
  }

  private checkSpikeContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const spike of this.spikes) {
      if (
        overlaps(body, {
          x: spike.pos.x - spike.width / 2,
          y: spike.pos.y,
          width: spike.width,
          height: spike.height,
        })
      ) {
        this.killPlayer();
        return true;
      }
    }
    return false;
  }

  private checkSawContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const saw of this.saws) {
      if (overlaps(body, saw.bounds())) {
        this.killPlayer();
        return true;
      }
    }
    return false;
  }

  private checkProjectileContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const projectile of this.projectiles) {
      if (projectile.isFriendly) {
        continue;
      }
      if (overlaps(body, projectile.bounds())) {
        this.killPlayer();
        return true;
      }
    }
    return false;
  }

  /**
   * Touching a mushroom is fatal unless the player is falling onto its cap,
   * in which case the mushroom is flattened and the player bounces.
   */
  private checkEnemyContact(prevFeet: number, fallSpeed: number): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    const cfg = GAME.enemies.mushroom;
    for (const mushroom of this.mushrooms) {
      if (!mushroom.isAlive) {
        continue;
      }
      const box = {
        x: mushroom.pos.x - mushroom.width / 2,
        y: mushroom.pos.y - mushroom.height,
        width: mushroom.width,
        height: mushroom.height,
      };
      if (!overlaps(body, box)) {
        continue;
      }

      const comingDown = fallSpeed > 0 && prevFeet <= box.y + cfg.stompTolerance;
      if (comingDown) {
        mushroom.squash();
        this.player.bounce(cfg.stompBounce);
        audio.land(360);
        continue;
      }

      this.killPlayer();
      return true;
    }
    return false;
  }

  /** Spiders behave like mushrooms: stomp them or die on contact. */
  private checkSpiderContact(prevFeet: number, fallSpeed: number): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    const cfg = GAME.enemies.spider;
    for (const spider of this.spiders) {
      if (!spider.isAlive) {
        continue;
      }
      const box = spider.bounds();
      if (!overlaps(body, box)) {
        continue;
      }

      const comingDown = fallSpeed > 0 && prevFeet <= box.y + cfg.stompTolerance;
      if (comingDown) {
        spider.squash();
        this.player.bounce(cfg.stompBounce);
        audio.land(360);
        continue;
      }

      this.killPlayer();
      return true;
    }
    return false;
  }

  private checkStalactiteContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const stalactite of this.stalactites) {
      if (stalactite.isDangerous && overlaps(body, stalactite.bounds())) {
        this.killPlayer();
        return true;
      }
    }
    return false;
  }

  private checkGoblinContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const goblin of this.goblins) {
      if (goblin.isStunned || !goblin.isDangerous) {
        continue;
      }
      if (overlaps(body, goblin.bounds())) {
        goblin.grapple();
        this.hud.toast('Grabbed! Mash E to break free!', 2000);
        return true;
      }
    }
    return false;
  }

  private checkBearTrapContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const trap of this.bearTraps) {
      if (trap.isTriggered) {
        continue;
      }
      if (overlaps(body, {
        x: trap.pos.x - trap.width / 2,
        y: trap.pos.y - trap.height,
        width: trap.width,
        height: trap.height,
      })) {
        trap.trigger();
        this.killPlayer();
        return true;
      }
    }
    return false;
  }


  private checkLandMineContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    const body = this.player.bounds();
    for (const mine of this.landMines) {
      if (
        !mine.isTriggered &&
        overlaps(body, {
          x: mine.pos.x - mine.width / 2,
          y: mine.pos.y - mine.height,
          width: mine.width,
          height: mine.height,
        })
      ) {
        mine.trigger();
        this.hud.toast('Land mine!', 1000);
        this.killPlayer();
        return true;
      }
    }
    return false;
  }

  private checkWormContact(): boolean {
    if (this.player.parryInvulnerable) {
      return false;
    }
    if (this.wormBoss && this.wormBoss.overlapsWith(this.player.bounds())) {
      this.killPlayer();
      return true;
    }
    return false;
  }

  // ─── Game events ────────────────────────────────────────────────────

  private pickupCollectible(): void {
    this.hud.addScore(500);
    if (!this.collectible || this.collectible.isCollected) {
      return;
    }
    const item = this.collectible.collect();
    this.ingredientCollected = true;
    audio.collect();
    this.hud.setIngredient(item, true);
    this.hud.toast(`${item} secured — now reach the exit!`, 2400);
  }

  private completeLevel(): void {
    const timeMs = this.hud.timeMs;
    const timeBonus = Math.max(0, 1000 - Math.floor(timeMs / 100) * 10);
    this.hud.addScore(1000 + timeBonus);
    this.complete = true;
    this.player.freeze();
    const time = this.hud.stopTimer(true);
    const best = this.hud.bestTimeMs;
    const note = best !== null && best < time ? `best ${formatTime(best)}` : 'new best!';
    const hasNext = this.levelIndex + 1 < LEVELS.length;
    const next = hasNext ? ' · next level…' : ' · R to run again';
    this.advanceTimerMs = hasNext ? GAME.level.advanceDelayMs : 0;
    this.hud.toast(
      `${this.levelInfo.ingredient} secured — ${formatTime(time)} · ${note}${next}`,
      6000,
    );
  }

  private killPlayer(): void {
    this.hud.addDeath();
    this.hud.addScore(-50);
    audio.death();
    this.player.freeze();
    this.clearProjectiles();
    this.hud.stopTimer(false);
    this.respawning = true;
    this.respawnTimer = 800;
  }

  private resetRun(message: string): void {
    this.complete = false;
    this.respawning = false;
    this.respawnTimer = 0;
    this.advanceTimerMs = 0;
    this.stepTimer = 0;
    this.goalHintMs = 0;
    this.ingredientCollected = false;

    this.player.respawn(this.level.spawn);
    this.collectible?.reset();
    for (const platform of this.platforms) {
      platform.reset();
    }
    for (const saw of this.saws) {
      saw.reset();
    }
    for (const cannon of this.cannons) {
      cannon.reset();
    }
    for (const mine of this.landMines) {
      mine.reset();
    }
    for (const mushroom of this.mushrooms) {
      mushroom.reset();
    }
    for (const spider of this.spiders) {
      spider.reset();
    }
    for (const stalactite of this.stalactites) {
      stalactite.reset();
    }
    for (const goblin of this.goblins) {
      goblin.reset();
    }
    for (const trap of this.bearTraps) {
      trap.reset();
    }
    this.wormBoss?.reset();
    this.clearProjectiles();
    this.clearDashTrail();
    this.clearParryRings();
    this.solids = [...this.level.solids, ...this.platforms.map((platform) => platform.bounds())];

    this.bossIntroShown = false;
    this.bossEnragedShown = false;
    this.hud.resetTimer();
    this.hud.setIngredient(this.levelInfo.ingredient, false);
    this.hud.toast(message, 1000);
    this.resetCamera();
  }

  private resetCamera(): void {
    const target = this.playerCenter();
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

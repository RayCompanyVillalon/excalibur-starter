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
import { renderTerrain } from '../level/terrain';
import { overlaps, type Aabb } from '../physics/aabb';
import { Player } from '../actors/Player';
import { Collectible } from '../actors/Collectible';
import { Spike } from '../actors/Spike';
import { Mushroom } from '../actors/Mushroom';
import { LandMine } from '../actors/LandMine';
import { WormBoss } from '../actors/WormBoss';
import { MovingPlatform } from '../actors/MovingPlatform';
import { Saw } from '../actors/Saw';
import { Cannon, type Shot } from '../actors/Cannon';
import { Projectile } from '../actors/Projectile';
import { Hud } from '../ui/hud';
import { formatTime } from '../ui/time';

const CLOUD_SPACING = 250;

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

export class LevelScene extends Scene {
  private level!: LevelData;
  private levelInfo!: LevelInfo;
  private levelIndex = 0;
  private player!: Player;
  private collectible: Collectible | null = null;
  private spikes: Spike[] = [];
  private mushrooms: Mushroom[] = [];
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
  private goalHintMs = 0;
  private dashTrail: { actor: Actor; lifeMs: number }[] = [];
  private dashTrailTimer = 0;

  override onInitialize(): void {
    // Browsers only allow audio after a gesture, so start the loop on the
    // first key press or click. Registered once for the whole session.
    const unlock = (): void => {
      audio.startMusic();
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    // `?level=2` boots straight into a level, which is handy for playtesting.
    const requested = Number(new URLSearchParams(window.location.search).get('level') ?? '1');
    const startIndex =
      Number.isInteger(requested) && requested >= 1 && requested <= LEVELS.length
        ? requested - 1
        : 0;
    this.loadLevel(startIndex);
  }

  private loadLevel(index: number): void {
    this.clearEntities();
    this.clearDashTrail();
    this.spikes = [];
    this.mushrooms = [];
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
    this.stepTimer = 0;
    this.goalHintMs = 0;
    this.dashTrailTimer = 0;

    const info = LEVELS[index];
    if (!info) {
      throw new Error(`Missing level ${index}`);
    }
    this.levelInfo = info;
    this.levelIndex = index;
    this.level = parseLevel(info.map);

    this.backgroundColor = Color.fromHex(GAME.colors.background);

    this.buildTerrain();
    this.buildClouds();
    this.buildGoal();
    this.buildSpikes();
    this.buildCollectible();
    this.buildMushrooms();
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

    if (this.complete || this.respawning) {
      return;
    }

    const intent = readIntent(keyboard);
    if (intent.moveX !== 0 || intent.jumpPressed || intent.dashPressed) {
      this.hud.startTimer();
    }
    this.hud.tickTimer();

    this.goalHintMs = Math.max(0, this.goalHintMs - elapsed);
    this.updateDynamicWorld(elapsed);

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

    if (this.checkSpikeContact()) return;
    if (this.checkSawContact()) return;
    if (this.checkProjectileContact()) return;
    if (this.checkEnemyContact(prevFeet, fallSpeed)) return;
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

  override onPostUpdate(_engine: Engine, elapsed: number): void {
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
          `shots ${this.projectiles.length}`,
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

    for (const saw of this.saws) {
      saw.advance(elapsed);
    }

    const target = this.playerCenter();
    for (const cannon of this.cannons) {
      const shot = cannon.advance(elapsed, target);
      if (shot) {
        this.spawnProjectile(shot);
      }
    }

    this.updateProjectiles(elapsed);
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

  private spawnProjectile(shot: Shot): void {
    const projectile = new Projectile(shot);
    this.projectiles.push(projectile);
    this.add(projectile);
  }

  private updateProjectiles(elapsed: number): void {
    for (const projectile of this.projectiles) {
      projectile.advance(elapsed);
      const box = projectile.bounds();
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
    const canvas = renderTerrain(this.level, Images.terrain);

    // A 4480px-wide texture exceeds the 4096px limit some GPUs advertise, so
    // split the composited level into horizontal chunks.
    const MAX_CHUNK = 2048;
    for (let x = 0; x < canvas.width; x += MAX_CHUNK) {
      const width = Math.min(MAX_CHUNK, canvas.width - x);
      const chunk = document.createElement('canvas');
      chunk.width = width;
      chunk.height = canvas.height;
      const ctx = chunk.getContext('2d');
      if (!ctx) {
        throw new Error('2D canvas context unavailable');
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, x, 0, width, canvas.height, 0, 0, width, canvas.height);

      const image = ImageSource.fromHtmlCanvasElement(chunk);
      const terrain = new Actor({
        pos: new Vector(x, 0),
        anchor: new Vector(0, 0),
        width,
        height: canvas.height,
        z: -10,
      });
      terrain.graphics.use(new Sprite({ image }));
      this.add(terrain);
    }
  }

  private buildClouds(): void {
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
    for (const spec of this.levelInfo.platforms ?? []) {
      const platform = new MovingPlatform(spec, Images.terrain);
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
    if (this.levelInfo.id !== 3) {
      return;
    }
    const tile = GAME.world.tile;
    const rows = this.levelInfo.map;
    let arenaCenterX = 40 * tile;
    let arenaWidth = 20 * tile;
    let arenaY = 20 * tile;

    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row] ?? '';
      if (!line.includes('##..##..##')) {
        continue;
      }
      arenaY = row * tile;
      let left = 0;
      let right = line.length * tile;
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] === '#') {
          if (left === 0) left = col * tile;
          right = col * tile;
        }
      }
      arenaCenterX = (left + right) / 2;
      arenaWidth = right - left;
      break;
    }

    this.wormBoss = new WormBoss(arenaCenterX, arenaY, arenaWidth);
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

  private checkSpikeContact(): boolean {
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
    const body = this.player.bounds();
    for (const projectile of this.projectiles) {
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

  private checkLandMineContact(): boolean {
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
    if (this.wormBoss && this.wormBoss.overlapsWith(this.player.bounds())) {
      this.killPlayer();
      return true;
    }
    return false;
  }

  // ─── Game events ────────────────────────────────────────────────────

  private pickupCollectible(): void {
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
    this.complete = true;
    this.player.freeze();
    const time = this.hud.stopTimer(true);
    const best = this.hud.bestTimeMs;
    const note = best !== null && best < time ? `best ${formatTime(best)}` : 'new best!';
    const next =
      this.levelIndex + 1 < LEVELS.length ? ' · N next level' : ' · R to run again';
    this.hud.toast(
      `${this.levelInfo.ingredient} secured — ${formatTime(time)} · ${note}${next}`,
      6000,
    );
  }

  private killPlayer(): void {
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
    this.clearProjectiles();
    this.clearDashTrail();
    this.solids = [...this.level.solids, ...this.platforms.map((platform) => platform.bounds())];

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

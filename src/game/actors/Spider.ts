import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';
import { overlaps, type Aabb } from '../physics/aabb';

/** Pixel-art cave spider: eight legs, a fat abdomen and four red eyes. */
export function buildSpiderCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  ctx.strokeStyle = '#1d1426';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const legs: Array<[number, number, number, number, number, number]> = [
    [12, 12, 4, 6, 2, 2],
    [12, 13, 3, 12, 1, 16],
    [13, 14, 5, 19, 2, 23],
    [15, 15, 11, 22, 10, 24],
    [20, 12, 28, 5, 32, 2],
    [21, 13, 30, 11, 33, 15],
    [20, 15, 28, 19, 31, 22],
    [18, 16, 23, 22, 24, 24],
  ];
  for (const [x0, y0, x1, y1, x2, y2] of legs) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.fillStyle = '#33203f';
  ctx.beginPath();
  ctx.ellipse(21, 13, 9, 7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#51305f';
  ctx.beginPath();
  ctx.ellipse(20, 11.5, 6.5, 4.5, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c9a6d8';
  ctx.beginPath();
  ctx.moveTo(19, 8);
  ctx.lineTo(22, 12);
  ctx.lineTo(19, 17);
  ctx.lineTo(16, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#24152e';
  ctx.beginPath();
  ctx.ellipse(11, 13, 6.5, 5.5, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff4a4a';
  for (const [ex, ey] of [
    [8.5, 11],
    [8.5, 14.5],
    [12, 10],
    [12, 15.5],
  ] as const) {
    ctx.beginPath();
    ctx.arc(ex, ey, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd0d0';
  ctx.fillRect(8, 10, 1, 1);
  ctx.fillRect(11.5, 9.5, 1, 1);

  ctx.fillStyle = '#d9c7e4';
  ctx.beginPath();
  ctx.moveTo(6, 16);
  ctx.lineTo(4, 20);
  ctx.lineTo(7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, 17);
  ctx.lineTo(8, 21);
  ctx.lineTo(11, 18);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

export function buildSquashedSpiderCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(17, 21, 15, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#33203f';
  ctx.beginPath();
  ctx.ellipse(17, 19, 13, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#51305f';
  ctx.beginPath();
  ctx.ellipse(16, 18, 9, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1d1426';
  ctx.lineWidth = 2;
  for (const [x0, y0, x1, y1] of [
    [8, 19, 2, 23],
    [10, 19, 5, 23],
    [24, 19, 30, 23],
    [22, 19, 27, 23],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ff6a6a';
  ctx.lineWidth = 1.5;
  for (const ex of [12, 21]) {
    ctx.beginPath();
    ctx.moveTo(ex - 2, 17);
    ctx.lineTo(ex + 2, 20);
    ctx.moveTo(ex + 2, 17);
    ctx.lineTo(ex - 2, 20);
    ctx.stroke();
  }

  return canvas;
}

let normalSource: ImageSource | null = null;
let squashedSource: ImageSource | null = null;
function spiderImage(squashed: boolean): ImageSource {
  if (squashed) {
    squashedSource ??= ImageSource.fromHtmlCanvasElement(buildSquashedSpiderCanvas());
    return squashedSource;
  }
  normalSource ??= ImageSource.fromHtmlCanvasElement(buildSpiderCanvas());
  return normalSource;
}

type State = 'descending' | 'grounding' | 'seeking' | 'flung' | 'squashed';

/**
 * A giant cave spider that drops from a ceiling anchor on a web down to the
 * ground below, then seeks out the player horizontally.  Parrying (F) flings
 * it away; stomping flattens it.
 */
export class Spider extends Actor {
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly anchorY: number;
  private readonly patrolLeft: number;
  private readonly patrolRight: number;
  private groundY = 0;
  private state: State = 'descending';
  private dir = -1;
  private pauseTimer = 0;
  private paused = false;
  private flungVx = 0;
  private flungVy = 0;
  private flungMs = 0;
  private squashTimer = 0;
  private solidsList: readonly Aabb[] = [];
  /** Player position – injected by the scene each frame. */
  playerX = 0;
  playerY = 0;
  private readonly aggroRange: number;
  private readonly groundSpeed: number;
  private readonly normalSprite: Sprite;
  private readonly squashedSprite: Sprite;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(anchorX: number, anchorY: number) {
    void anchorX; void anchorY;
    const cfg = GAME.enemies.spider;
    super({
      pos: new Vector(anchorX, anchorY + cfg.height / 2),
      anchor: new Vector(0.5, 0.5),
      width: cfg.width,
      height: cfg.height,
      z: 6,
    });

    this.anchorY = anchorY;
    this.spawnX = anchorX;
    this.spawnY = anchorY + cfg.height / 2;

    const half = cfg.strandHalfTiles * GAME.world.tile;
    this.patrolLeft = anchorX - half + cfg.width / 2;
    this.patrolRight = anchorX + half - cfg.width / 2;

    this.aggroRange = cfg.strandHalfTiles * GAME.world.tile * 2;
    this.groundSpeed = cfg.patrolSpeed * 1.4;

    this.normalSprite = new Sprite({ image: spiderImage(false) });
    this.squashedSprite = new Sprite({ image: spiderImage(true) });
    this.graphics.use(this.normalSprite);
    this.graphics.offset = new Vector(-2, -1);
  }

  setSolids(solids: readonly Aabb[]): void {
    this.solidsList = solids;
  }

  get isAlive(): boolean {
    return this.state !== 'flung' && this.state !== 'squashed';
  }

  get isDangerous(): boolean {
    return this.isAlive;
  }

  /** Y of the ground surface the spider landed on. */
  get groundSurfaceY(): number {
    return this.groundY || this.pos.y + this.height / 2;
  }

  bounds(): Aabb {
    return {
      x: this.pos.x - this.width / 2,
      y: this.pos.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  reset(): void {
    this.state = 'descending';
    this.dir = -1;
    this.paused = false;
    this.pauseTimer = 0;
    this.flungVx = 0;
    this.flungVy = 0;
    this.flungMs = 0;
    this.squashTimer = 0;
    this.groundY = 0;
    this.pos.setTo(this.spawnX, this.spawnY);
    this.rotation = 0;
    this.graphics.use(this.normalSprite);
    this.graphics.opacity = 1;
  }

  squash(): void {
    if (!this.isAlive) return;
    this.state = 'squashed';
    this.squashTimer = GAME.enemies.spider.squashMs;
    this.graphics.use(this.squashedSprite);
    this.graphics.opacity = 1;
  }

  fling(direction: 1 | -1): void {
    if (!this.isAlive) return;
    this.state = 'flung';
    this.flungVx = direction * GAME.parry.flingSpeed;
    this.flungVy = -GAME.parry.flingLift;
    this.flungMs = GAME.parry.flingMs;
    this.graphics.use(this.normalSprite);
    this.graphics.opacity = 1;
  }

  override onPreUpdate(_engine: unknown, elapsed: number): void {
    const cfg = GAME.enemies.spider;

    if (this.state === 'flung') {
      const dt = elapsed / 1000;
      this.flungVy = Math.min(
        this.flungVy + GAME.physics.gravity * dt,
        GAME.physics.maxFallSpeed,
      );
      this.pos.x += this.flungVx * dt;
      this.pos.y += this.flungVy * dt;
      this.rotation += dt * 14;
      this.flungMs -= elapsed;
      this.graphics.opacity = Math.max(0, this.flungMs / GAME.parry.flingMs);
      return;
    }

    if (this.state === 'squashed') {
      this.squashTimer = Math.max(0, this.squashTimer - elapsed);
      this.graphics.opacity = this.squashTimer / cfg.squashMs;
      return;
    }

    const dt = elapsed / 1000;

    // 1. Descend from ceiling down to the horizontal strand.
    if (this.state === 'descending') {
      const strandY = this.anchorY + cfg.dropTiles * GAME.world.tile;
      this.pos.y += cfg.dropSpeed * dt;
      if (this.pos.y >= strandY) {
        this.pos.y = strandY;
        this.state = 'grounding';
      }
      return;
    }

    // 2. Keep dropping from the strand until hitting solid ground.
    if (this.state === 'grounding') {
      this.pos.y += cfg.dropSpeed * 1.5 * dt;
      const probe: Aabb = {
        x: this.pos.x - this.width / 2,
        y: this.pos.y + this.height / 2 - 2,
        width: this.width,
        height: 4,
      };
      const landed = this.solidsList.some((solid) => overlaps(probe, solid));
      if (landed || this.pos.y > 2000) {
        if (landed) {
          const hits = this.solidsList.filter((solid) => overlaps(probe, solid));
          if (hits.length > 0) {
            const top = Math.min(...hits.map((s) => s.y - 1));
            this.pos.y = top;
            this.groundY = top - this.height / 2;
          }
        }
        this.state = 'seeking';
      }
      return;
    }

    // 3. Seek the player on the ground.
    if (this.paused) {
      this.pauseTimer -= elapsed;
      if (this.pauseTimer <= 0) {
        this.paused = false;
        this.dir *= -1;
      }
      return;
    }

    const dx = this.playerX - this.pos.x;
    if (Math.abs(dx) < this.aggroRange && Math.abs(dx) > 4) {
      this.dir = dx > 0 ? 1 : -1;
    }

    this.pos.x += this.dir * this.groundSpeed * dt;
    if (this.pos.x <= this.patrolLeft || this.pos.x >= this.patrolRight) {
      this.pos.x = Math.max(this.patrolLeft, Math.min(this.patrolRight, this.pos.x));
      this.paused = true;
      this.pauseTimer = cfg.pauseMs;
    }

    // If the ground vanishes beneath the spider, fall again.
    const feet: Aabb = {
      x: this.pos.x - this.width / 2,
      y: this.pos.y + this.height / 2 - 1,
      width: this.width,
      height: 4,
    };
    if (!this.solidsList.some((solid) => overlaps(feet, solid))) {
      this.state = 'grounding';
    }
  }
}

const webSources = new Map<string, ImageSource>();

function buildWebCanvas(strandWidth: number, dropPx: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = strandWidth;
  canvas.height = dropPx + 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.strokeStyle = 'rgba(214, 224, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  const cx = strandWidth / 2;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, dropPx);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1, dropPx);
  ctx.lineTo(strandWidth - 1, dropPx);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(214, 224, 255, 0.26)';
  for (const offset of [0.16, 0.34, 0.66, 0.84]) {
    const x = strandWidth * offset;
    ctx.beginPath();
    ctx.moveTo(cx, dropPx * 0.45);
    ctx.lineTo(x, dropPx);
    ctx.stroke();
  }

  return canvas;
}

function webImage(strandWidth: number, dropPx: number): ImageSource {
  const key = `${strandWidth}x${dropPx}`;
  let image = webSources.get(key);
  if (!image) {
    image = ImageSource.fromHtmlCanvasElement(buildWebCanvas(strandWidth, dropPx));
    webSources.set(key, image);
  }
  return image;
}

/** The static silk a Spider hangs from. */
export class SpiderWeb extends Actor {
  private readonly strandWidth: number;
  private readonly baseDropPx: number;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(anchorX: number, anchorY: number) {
    void anchorX; void anchorY;
    const cfg = GAME.enemies.spider;
    const width = cfg.strandHalfTiles * 2 * GAME.world.tile;
    const dropPx = cfg.dropTiles * GAME.world.tile;
    super({
      pos: new Vector(anchorX - width / 2, anchorY),
      anchor: new Vector(0, 0),
      width,
      height: dropPx + 1,
      z: 5,
    });
    this.strandWidth = width;
    this.baseDropPx = dropPx;
    this.graphics.use(new Sprite({ image: webImage(width, dropPx) }));
  }

  /** Extend the web canvas to reach the actual ground. */
  extendToGround(groundY: number): void {
    const newDrop = Math.max(this.baseDropPx, Math.ceil(groundY));
    if (newDrop <= this.height) return;
    const canvas = buildWebCanvas(this.strandWidth, newDrop);
    const image = ImageSource.fromHtmlCanvasElement(canvas);
    this.graphics.use(new Sprite({ image }));
    (this as any).height = newDrop;
  }
}

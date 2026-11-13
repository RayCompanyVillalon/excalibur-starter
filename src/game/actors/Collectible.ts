import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';

/** A warm little loaf: the level objective. */
export function buildBreadCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Soft pickup glow.
  ctx.fillStyle = 'rgba(255, 196, 92, 0.16)';
  ctx.beginPath();
  ctx.ellipse(17, 12, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Loaf body with a domed top.
  const crust = ctx.createLinearGradient(0, 4, 0, 22);
  crust.addColorStop(0, '#e0a24a');
  crust.addColorStop(0.55, '#c07a2c');
  crust.addColorStop(1, '#8a4f1b');
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.quadraticCurveTo(1.5, 9, 10, 5);
  ctx.quadraticCurveTo(17, 1.5, 24, 5);
  ctx.quadraticCurveTo(32.5, 9, 30, 20);
  ctx.quadraticCurveTo(29, 22, 26, 22);
  ctx.lineTo(8, 22);
  ctx.quadraticCurveTo(5, 22, 4, 20);
  ctx.closePath();
  ctx.fill();

  // Top highlight.
  ctx.fillStyle = 'rgba(255, 221, 154, 0.55)';
  ctx.beginPath();
  ctx.ellipse(14, 8.5, 8, 3.2, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Scoring slashes.
  ctx.strokeStyle = '#8a4f1b';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const x of [11, 17, 23]) {
    ctx.beginPath();
    ctx.moveTo(x - 3, 8);
    ctx.quadraticCurveTo(x, 10.5, x + 3, 8);
    ctx.stroke();
  }

  // Sesame seeds.
  ctx.fillStyle = '#f7e6bd';
  ctx.fillRect(8, 13, 2, 1);
  ctx.fillRect(14, 12, 2, 1);
  ctx.fillRect(21, 13, 2, 1);
  ctx.fillRect(25, 15, 2, 1);

  // Ground shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(17, 22.5, 11, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** A ripe tomato: Level 2's ingredient. */
export function buildTomatoCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 26;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Pickup glow.
  ctx.fillStyle = 'rgba(255, 120, 90, 0.16)';
  ctx.beginPath();
  ctx.ellipse(17, 13, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body.
  const skin = ctx.createRadialGradient(12, 9, 2, 17, 14, 15);
  skin.addColorStop(0, '#ff7b5c');
  skin.addColorStop(0.55, '#e0342c');
  skin.addColorStop(1, '#941c1b');
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(17, 14, 12.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight.
  ctx.fillStyle = 'rgba(255, 214, 190, 0.5)';
  ctx.beginPath();
  ctx.ellipse(12, 10, 4.5, 2.6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Calyx (green star).
  ctx.fillStyle = '#3f9c46';
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(17, 5);
    ctx.lineTo(17 + Math.cos(angle - 0.28) * 8, 5 + Math.sin(angle - 0.28) * 5);
    ctx.lineTo(17 + Math.cos(angle) * 10, 5 + Math.sin(angle) * 6);
    ctx.lineTo(17 + Math.cos(angle + 0.28) * 8, 5 + Math.sin(angle + 0.28) * 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2c6f32';
  ctx.fillRect(16, 2, 2, 4);

  // Bottom shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(17, 24.5, 10, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** A crisp head of lettuce: Level 3's ingredient. */
export function buildLettuceCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 26;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Pickup glow.
  ctx.fillStyle = 'rgba(150, 235, 130, 0.16)';
  ctx.beginPath();
  ctx.ellipse(17, 13, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ruffled outer leaves: overlapping lobes in three shades of green.
  const lobes: [number, number, number, number, number, string][] = [
    [17, 7, 7.5, 5.5, 0, '#2f7a33'],
    [10, 10, 7, 5.5, -0.7, '#358a39'],
    [24, 10, 7, 5.5, 0.7, '#358a39'],
    [8, 16, 6, 5, -0.35, '#3f9c42'],
    [26, 16, 6, 5, 0.35, '#3f9c42'],
    [17, 18, 8, 5.5, 0, '#2f7a33'],
    [13, 13, 5.5, 4.5, -0.2, '#66c65a'],
    [21, 13, 5.5, 4.5, 0.2, '#66c65a'],
  ];
  for (const [x, y, rx, ry, rotation, color] of lobes) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(24, 84, 30, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, rx - 0.5, ry - 0.5, rotation, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Pale, tender heart.
  const heart = ctx.createRadialGradient(15, 11, 1, 17, 13, 8);
  heart.addColorStop(0, '#eaf7c8');
  heart.addColorStop(0.6, '#b6e07a');
  heart.addColorStop(1, '#7cc35a');
  ctx.fillStyle = heart;
  ctx.beginPath();
  ctx.ellipse(17, 13, 5.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Veins radiating from the heart.
  ctx.strokeStyle = 'rgba(255, 255, 225, 0.55)';
  ctx.lineWidth = 1;
  for (const angle of [-0.9, -0.3, 0.3, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(17, 14);
    ctx.lineTo(17 + Math.cos(angle) * 9, 13 + Math.sin(angle) * 6);
    ctx.stroke();
  }

  // Highlight.
  ctx.fillStyle = 'rgba(255, 255, 230, 0.5)';
  ctx.beginPath();
  ctx.ellipse(13, 9, 3.5, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Ground shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.ellipse(17, 24.5, 11, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** A wedge of cave cheese: Level 4's ingredient. */
export function buildCheeseCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 26;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  // Pickup glow.
  ctx.fillStyle = 'rgba(255, 210, 80, 0.18)';
  ctx.beginPath();
  ctx.ellipse(17, 13, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wedge body: a rounded triangular prism seen from the front.
  const body = ctx.createLinearGradient(4, 6, 28, 22);
  body.addColorStop(0, '#ffe07a');
  body.addColorStop(0.5, '#f5c445');
  body.addColorStop(1, '#c98a1e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.lineTo(7, 9);
  ctx.quadraticCurveTo(17, 4, 28, 8);
  ctx.lineTo(30, 19);
  ctx.quadraticCurveTo(17, 23, 4, 20);
  ctx.closePath();
  ctx.fill();

  // Pale rind along the bottom edge.
  ctx.fillStyle = '#f7e6a1';
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.quadraticCurveTo(17, 23, 30, 19);
  ctx.lineTo(29.5, 21.5);
  ctx.quadraticCurveTo(17, 25, 4.5, 22.2);
  ctx.closePath();
  ctx.fill();

  // Top highlight.
  ctx.fillStyle = 'rgba(255, 247, 190, 0.55)';
  ctx.beginPath();
  ctx.ellipse(15, 9.5, 7.5, 2.6, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // Air holes.
  ctx.fillStyle = '#d9a02a';
  for (const [hx, hy, hr] of [
    [12, 15, 2.3],
    [19, 12.5, 1.8],
    [24, 16.5, 1.5],
    [9, 11.5, 1.2],
    [16, 17.5, 1.1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120, 78, 12, 0.45)';
  for (const [hx, hy, hr] of [
    [12, 15, 1.1],
    [19, 12.5, 0.9],
    [24, 16.5, 0.8],
  ] as const) {
    ctx.beginPath();
    ctx.arc(hx + 0.4, hy + 0.4, hr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outline for a crisp silhouette in the dark.
  ctx.strokeStyle = 'rgba(110, 68, 10, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.lineTo(7, 9);
  ctx.quadraticCurveTo(17, 4, 28, 8);
  ctx.lineTo(30, 19);
  ctx.quadraticCurveTo(17, 23, 4, 20);
  ctx.closePath();
  ctx.stroke();

  // Ground shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.ellipse(17, 24.5, 11, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** Pick the ingredient art for the current level. */
export function buildIngredientCanvas(ingredient: string): HTMLCanvasElement {
  switch (ingredient.toLowerCase()) {
    case 'tomato':
      return buildTomatoCanvas();
    case 'lettuce':
      return buildLettuceCanvas();
    case 'cheese':
      return buildCheeseCanvas();
    default:
      return buildBreadCanvas();
  }
}

/** One shared texture per ingredient; reloads should not allocate new ones. */
const ingredientSources = new Map<string, ImageSource>();
function ingredientImage(ingredient: string): ImageSource {
  const key = ingredient.toLowerCase();
  let image = ingredientSources.get(key);
  if (!image) {
    image = ImageSource.fromHtmlCanvasElement(buildIngredientCanvas(ingredient));
    ingredientSources.set(key, image);
  }
  return image;
}

/**
 * A floating collectible item — the sandwich ingredient for this level.
 */
export class Collectible extends Actor {
  private readonly ingredient: string;
  private _collected = false;
  private floatPhase = Math.random() * Math.PI * 2;
  private readonly baseY: number;

  constructor(pos: { x: number; y: number }, ingredient: string) {
    const size = GAME.art.tile * GAME.art.scale;
    super({
      pos: new Vector(pos.x, pos.y),
      anchor: new Vector(0.5, 0.5),
      width: size * 0.75,
      height: size * 0.55,
      z: 5,
    });
    this.ingredient = ingredient;
    this.baseY = pos.y - GAME.collectible.floatPx;
    this.pos.y = this.baseY;
    this.graphics.use(new Sprite({ image: ingredientImage(ingredient) }));
  }

  get isCollected(): boolean {
    return this._collected;
  }

  /** Put the loaf back for a fresh run. */
  reset(): void {
    this._collected = false;
    this.graphics.visible = true;
    this.pos.y = this.baseY;
  }

  /** Mark as collected and return the ingredient name for HUD display. */
  collect(): string {
    this._collected = true;
    this.graphics.visible = false;
    return this.ingredient;
  }

  override onPreUpdate(_engine: unknown, elapsed: number): void {
    if (this._collected) {
      return;
    }
    this.floatPhase += elapsed * 0.004;
    this.pos.y = this.baseY + Math.sin(this.floatPhase) * 4;
  }
}

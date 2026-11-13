import { Actor, ImageSource, Sprite, Vector } from 'excalibur';

import { GAME } from '../config';

const BRICK = '#8f2b22';
const BRICK_DARK = '#5e1a15';
const BRICK_LIGHT = '#c04a3c';
const TOOTH_LIGHT = '#e0604f';
const TOOTH_DARK = '#7d2019';

/**
 * Build a canvas sprite for pit spikes: sharp triangular teeth rising from a
 * red brick base. The pattern tiles horizontally so a run of spikes reads as
 * one continuous hazard.
 */
export function buildSpikeCanvas(toothCount = 2): HTMLCanvasElement {
  const w = GAME.world.tile;
  const h = GAME.world.tile;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.imageSmoothingEnabled = false;

  const baseTop = 20;
  const toothWidth = w / toothCount;

  // Brick base.
  ctx.fillStyle = BRICK_DARK;
  ctx.fillRect(0, baseTop, w, h - baseTop);
  for (let row = 0; row < 2; row += 1) {
    const y = baseTop + row * 6;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let x = -offset; x < w; x += 8) {
      ctx.fillStyle = row === 0 ? BRICK : BRICK_DARK;
      ctx.fillRect(x + 1, y + 1, 6, 4);
    }
  }

  // Triangular teeth.
  for (let i = 0; i < toothCount; i += 1) {
    const x0 = i * toothWidth;
    const apexX = x0 + toothWidth / 2;
    const baseY = baseTop + 2;

    // Body.
    ctx.fillStyle = BRICK;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, baseY);
    ctx.lineTo(apexX, 1);
    ctx.lineTo(x0 + toothWidth - 0.5, baseY);
    ctx.closePath();
    ctx.fill();

    // Lit left face.
    ctx.fillStyle = TOOTH_LIGHT;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, baseY);
    ctx.lineTo(apexX, 1);
    ctx.lineTo(apexX, baseY);
    ctx.closePath();
    ctx.fill();

    // Shaded right face.
    ctx.fillStyle = TOOTH_DARK;
    ctx.beginPath();
    ctx.moveTo(apexX, 1);
    ctx.lineTo(x0 + toothWidth - 0.5, baseY);
    ctx.lineTo(apexX, baseY);
    ctx.closePath();
    ctx.fill();

    // Outline keeps the silhouette crisp against dark backgrounds.
    ctx.strokeStyle = '#4a110d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, baseY);
    ctx.lineTo(apexX, 1);
    ctx.lineTo(x0 + toothWidth - 0.5, baseY);
    ctx.stroke();

    // Bright tip.
    ctx.fillStyle = BRICK_LIGHT;
    ctx.fillRect(apexX - 0.5, 2, 1, 3);
  }

  return canvas;
}

/** Shared spike textures: one unit tile plus a tiled run per width/height. */
let spikeUnitCanvas: HTMLCanvasElement | null = null;
const spikeRunSources = new Map<string, ImageSource>();

function spikeRunImage(width: number, height: number): ImageSource {
  const key = `${width}x${height}`;
  let image = spikeRunSources.get(key);
  if (!image) {
    const unit = (spikeUnitCanvas ??= buildSpikeCanvas());
    const tiled = document.createElement('canvas');
    tiled.width = width;
    tiled.height = height;
    const ctx = tiled.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    ctx.imageSmoothingEnabled = false;
    for (let offset = 0; offset < width; offset += unit.width) {
      ctx.drawImage(unit, offset, 0);
    }
    image = ImageSource.fromHtmlCanvasElement(tiled);
    spikeRunSources.set(key, image);
  }
  return image;
}

/**
 * Static spike hazard — touching it kills the player.
 */
export class Spike extends Actor {
  constructor(x: number, y: number, width: number, height: number) {
    super({
      pos: new Vector(x + width / 2, y),
      anchor: new Vector(0.5, 0),
      width,
      height,
      z: 3,
    });

    this.graphics.use(new Sprite({ image: spikeRunImage(width, height) }));
  }
}

import { describe, expect, it } from 'vitest';
import { clampFocus, followCamera, type CameraFollowConfig } from '../src/game/camera/follow';

const VIEWPORT = { width: 960, height: 540 };
const WORLD = { width: 1920, height: 768 };
const CONFIG: CameraFollowConfig = { deadzone: { x: 80, y: 60 }, smoothing: 1000 };
const ONE_SECOND = 1000;

describe('clampFocus', () => {
  it('keeps the focus inside the world', () => {
    expect(clampFocus(100, 480, 1920)).toBe(480);
    expect(clampFocus(1800, 480, 1920)).toBe(1440);
    expect(clampFocus(900, 480, 1920)).toBe(900);
  });

  it('centers a world smaller than the viewport', () => {
    expect(clampFocus(0, 480, 800)).toBe(400);
    expect(clampFocus(900, 480, 800)).toBe(400);
  });
});

describe('followCamera', () => {
  it('does not move while the target is inside the deadzone', () => {
    const current = { x: 900, y: 400 };
    const focus = followCamera(current, { x: 950, y: 430 }, VIEWPORT, WORLD, CONFIG, ONE_SECOND);

    expect(focus.x).toBeCloseTo(current.x, 5);
    expect(focus.y).toBeCloseTo(current.y, 5);
  });

  it('follows a target that leaves the deadzone', () => {
    const current = { x: 900, y: 400 };
    const focus = followCamera(current, { x: 1200, y: 400 }, VIEWPORT, WORLD, CONFIG, ONE_SECOND);

    expect(focus.x).toBeCloseTo(1200 - CONFIG.deadzone.x, 5);
    expect(focus.y).toBeCloseTo(current.y, 5);
  });

  it('follows left as well as right', () => {
    const current = { x: 900, y: 400 };
    const focus = followCamera(current, { x: 600, y: 400 }, VIEWPORT, WORLD, CONFIG, ONE_SECOND);

    expect(focus.x).toBeCloseTo(600 + CONFIG.deadzone.x, 5);
  });

  it('clamps the focus to the world edges', () => {
    const focus = followCamera(
      { x: 900, y: 400 },
      { x: 1919, y: 767 },
      VIEWPORT,
      WORLD,
      CONFIG,
      ONE_SECOND,
    );

    expect(focus.x).toBe(WORLD.width - VIEWPORT.width / 2);
    expect(focus.y).toBe(WORLD.height - VIEWPORT.height / 2);
  });

  it('centers the view when the world is smaller than the viewport', () => {
    const smallWorld = { width: 800, height: 400 };
    const focus = followCamera({ x: 400, y: 200 }, { x: 700, y: 350 }, VIEWPORT, smallWorld, CONFIG, ONE_SECOND);

    expect(focus.x).toBe(400);
    expect(focus.y).toBe(200);
  });

  it('does not move when no time has elapsed', () => {
    const current = { x: 900, y: 400 };
    const focus = followCamera(current, { x: 1500, y: 700 }, VIEWPORT, WORLD, CONFIG, 0);

    expect(focus).toEqual(current);
  });
});

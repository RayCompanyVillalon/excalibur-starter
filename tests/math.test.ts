import { describe, expect, it } from 'vitest';
import { approach, clamp, deadzone } from '../src/game/math';

describe('clamp', () => {
  it('holds values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('approach', () => {
  it('accelerates toward a positive target', () => {
    expect(approach(0, 100, 30)).toBe(30);
    expect(approach(90, 100, 30)).toBe(100);
  });

  it('decelerates toward zero', () => {
    expect(approach(40, 0, 25)).toBe(15);
    expect(approach(10, 0, 25)).toBe(0);
  });

  it('never overshoots when the step is negative', () => {
    expect(approach(50, 100, -10)).toBe(50);
  });
});

describe('deadzone', () => {
  it('snaps tiny values to zero', () => {
    expect(deadzone(0.001)).toBe(0);
    expect(deadzone(1.5)).toBe(1.5);
  });
});

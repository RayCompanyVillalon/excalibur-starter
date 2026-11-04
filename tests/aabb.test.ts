import { describe, expect, it } from 'vitest';
import { aabb, centerX, centerY, containsPoint, overlaps } from '../src/game/physics/aabb';

describe('overlaps', () => {
  const box = aabb(0, 0, 10, 10);

  it('detects intersecting boxes', () => {
    expect(overlaps(box, aabb(5, 5, 10, 10))).toBe(true);
    expect(overlaps(box, aabb(-5, -5, 10, 10))).toBe(true);
  });

  it('detects fully contained boxes', () => {
    expect(overlaps(box, aabb(2, 2, 2, 2))).toBe(true);
  });

  it('does not count boxes that only touch an edge', () => {
    expect(overlaps(box, aabb(10, 0, 10, 10))).toBe(false);
    expect(overlaps(box, aabb(0, 10, 10, 10))).toBe(false);
    expect(overlaps(box, aabb(-10, 0, 10, 10))).toBe(false);
  });

  it('does not overlap distant boxes', () => {
    expect(overlaps(box, aabb(100, 100, 10, 10))).toBe(false);
  });
});

describe('containsPoint', () => {
  const box = aabb(10, 20, 30, 40);

  it('accepts points on the border', () => {
    expect(containsPoint(box, 10, 20)).toBe(true);
    expect(containsPoint(box, 40, 60)).toBe(true);
  });

  it('rejects points outside', () => {
    expect(containsPoint(box, 9, 20)).toBe(false);
    expect(containsPoint(box, 10, 61)).toBe(false);
  });
});

describe('centers', () => {
  it('computes the center of a box', () => {
    const box = aabb(10, 20, 30, 40);
    expect(centerX(box)).toBe(25);
    expect(centerY(box)).toBe(40);
  });
});

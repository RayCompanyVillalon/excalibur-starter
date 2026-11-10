import { describe, expect, it } from 'vitest';
import { formatTime } from '../src/game/ui/time';

describe('formatTime', () => {
  it('formats sub-minute runs', () => {
    expect(formatTime(0)).toBe('0:00.000');
    expect(formatTime(42_310)).toBe('0:42.310');
    expect(formatTime(9_005)).toBe('0:09.005');
  });

  it('formats minute-long runs', () => {
    expect(formatTime(61_001)).toBe('1:01.001');
    expect(formatTime(600_000)).toBe('10:00.000');
  });

  it('clamps negative values and floors partial milliseconds', () => {
    expect(formatTime(-50)).toBe('0:00.000');
    expect(formatTime(1234.9)).toBe('0:01.234');
  });
});

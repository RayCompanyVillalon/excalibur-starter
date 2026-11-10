/**
 * Format a duration as a speedrun clock: `m:ss.mmm`.
 * Minutes are not padded, so a 42.31 s run reads `0:42.310`.
 */
export function formatTime(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

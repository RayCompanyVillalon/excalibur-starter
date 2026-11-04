export const GAME = {
  viewport: {
    width: 960,
    height: 540,
  },
  background: '#070a0d',
  player: {
    width: 36,
    height: 36,
    maxSpeed: 280,
    acceleration: 1600,
    friction: 1400,
    color: '#f2eee1',
  },
  hud: {
    accent: '#f2b04a',
    muted: '#7f8b99',
  },
} as const;

export type GameConfig = typeof GAME;

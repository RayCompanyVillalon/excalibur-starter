export const GAME = {
  title: 'Excalibur Platformer',
  viewport: {
    width: 960,
    height: 540,
  },
  world: {
    tile: 32,
  },
  physics: {
    gravity: 2200,
    maxFallSpeed: 900,
  },
  player: {
    width: 24,
    height: 40,
    runSpeed: 260,
    groundAccel: 1800,
    groundFriction: 2200,
    airAccel: 1200,
    airDrag: 700,
    jumpSpeed: 720,
    jumpCut: 0.45,
    coyoteMs: 100,
    jumpBufferMs: 120,
  },
  camera: {
    deadzone: { x: 80, y: 60 },
    /** Exponential smoothing rate, in 1/seconds. */
    smoothing: 12,
  },
  level: {
    killPlanePadding: 160,
  },
  colors: {
    background: '#0b1117',
    terrain: '#26384a',
    terrainTop: '#4f7591',
    player: '#f2eee1',
    playerAccent: '#f2b04a',
    goal: '#8fe3b0',
    text: '#f2eee1',
    muted: '#7f8b99',
    accent: '#f2b04a',
  },
} as const;

export type GameConfig = typeof GAME;

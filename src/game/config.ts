export const GAME = {
  title: 'Excalibur Platformer',
  viewport: {
    width: 960,
    height: 540,
  },
  world: {
    tile: 32,
  },
  /** Source art is 16x16 and is drawn at 2x to fill a 32px world cell. */
  art: {
    tile: 16,
    scale: 2,
  },
  physics: {
    gravity: 2200,
    maxFallSpeed: 900,
  },
  player: {
    width: 16,
    height: 24,
    runSpeed: 260,
    groundAccel: 1800,
    groundFriction: 2200,
    airAccel: 1200,
    airDrag: 700,
    jumpSpeed: 780,
    jumpCut: 0.45,
    coyoteMs: 100,
    jumpBufferMs: 120,
  },
  dash: {
    /** Horizontal speed while dashing, in px/s. */
    speed: 700,
    /** How long a dash lasts, in ms. */
    durationMs: 170,
    /** Delay before another dash can start, in ms. */
    cooldownMs: 420,
  },
  parry: {
    /** How long the active parry window stays open after pressing F, in ms. */
    windowMs: 170,
    /** Delay before F can be pressed again, in ms. */
    cooldownMs: 650,
    /** Invulnerability granted after a successful parry, in ms. */
    graceMs: 300,
    /** Extra reach around the player's body when checking for threats, in px. */
    reachPx: 10,
    /** Horizontal launch speed for a parried mushroom, in px/s. */
    flingSpeed: 420,
    /** Upward launch speed for a parried mushroom, in px/s. */
    flingLift: 340,
    /** How long a flung mushroom stays in the air before vanishing, in ms. */
    flingMs: 900,
    /** Reflected cannon shots travel this much faster than the original. */
    reflectMultiplier: 1.15,
  },
  camera: {
    deadzone: { x: 60, y: 40 },
    /** Exponential smoothing rate, in 1/seconds. */
    smoothing: 12,
  },
  level: {
    killPlanePadding: 160,
  },
  collectible: {
    /** How many px above the tile surface to draw the collectible. */
    floatPx: 8,
  },
  hazards: {
    spikeDamage: 9999,
  },
  enemies: {
    mushroom: {
      width: 16,
      height: 24,
      patrolSpeed: 80,
      /** Ms to pause at each patrol turn-around. */
      pauseMs: 600,
      /** Upward speed after stomping an enemy, in px/s. */
      stompBounce: 520,
      /** How far above the enemy's top the feet may be to count as a stomp. */
      stompTolerance: 18,
      /** How long the flattened sprite lingers before fading out, in ms. */
      squashMs: 450,
    },
    landMine: {
      width: 16,
      height: 12,
    },
  },
  colors: {
    background: '#0c1520',
    terrain: '#26384a',
    terrainTop: '#4f7591',
    player: '#f2eee1',
    playerAccent: '#f2b04a',
    goal: '#8fe3b0',
    text: '#f2eee1',
    muted: '#7f8b99',
    accent: '#f2b04a',
    collectible: '#f0d674',
    spike: '#dc143c',
    mushroom: '#8b4513',
    mushroomCap: '#cd5c5c',
    landMine: '#555555',
    landMineTrigger: '#ff4500',
  },
} as const;

export type GameConfig = typeof GAME;

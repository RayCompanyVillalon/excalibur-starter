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
    /** Upward speed of the second (air) jump, in px/s. */
    airJumpSpeed: 720,
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
    /** Pause after clearing a level before the next one loads, in ms. */
    advanceDelayMs: 2200,
  },
  /** Screen-space lamp used by dark cave levels. */
  darkness: {
    /** Radius of the bright part of the lamp, in screen pixels. */
    radius: 320,
    /** 0 = untouched screen, 1 = fully dark outside the lamp. */
    darkness: 0.82,
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
    spider: {
      width: 30,
      height: 22,
      /** How fast the spider lowers itself from its ceiling anchor, in px/s. */
      dropSpeed: 95,
      /** Speed while crawling along the web strand, in px/s. */
      patrolSpeed: 72,
      /** Pause at each end of the strand, in ms. */
      pauseMs: 450,
      /** Vertical drop from the ceiling anchor to the patrol strand, in tiles. */
      dropTiles: 4,
      /** Half the horizontal strand length, in tiles. */
      strandHalfTiles: 2.5,
      /** How far above the spider the feet may be to count as a stomp. */
      stompTolerance: 18,
      /** Upward speed after stomping a spider, in px/s. */
      stompBounce: 520,
      /** How long the flattened sprite lingers before fading out, in ms. */
      squashMs: 400,
    },
    stalactite: {
      width: 18,
      height: 26,
      /** Player must be this close horizontally (px) to trigger a drop. */
      triggerRangeX: 52,
      /** Initial downward speed when it detaches, in px/s. */
      initialSpeed: 60,
      /** Gravity while falling, in px/s². */
      gravity: 1900,
      /** How long the shatter effect lingers, in ms. */
      shatterMs: 360,
    },
    bearTrap: {
      width: 22,
      height: 14,
      /** Damage radius from centre, in px. */
      triggerRadius: 16,
    },
  },
  colors: {
    background: '#0c1520',
    caveBackground: '#04060a',
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

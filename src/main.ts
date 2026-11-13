import { Color, DisplayMode, Engine } from 'excalibur';
import { Images, Sounds } from './game/assets';
import { audio } from './game/audio/Sfx';
import { GAME } from './game/config';
import { LevelScene } from './game/scenes/LevelScene';
import './style.css';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #game canvas');
}

const engine = new Engine({
  canvasElement: canvas,
  width: GAME.viewport.width,
  height: GAME.viewport.height,
  displayMode: DisplayMode.FitScreen,
  backgroundColor: Color.fromHex(GAME.colors.background),
  suppressPlayButton: true,
  fixedUpdateFps: 60,
  pixelArt: true,
  antialiasing: false,
});

const scene = new LevelScene();
engine.add('level', scene);

// Excalibur runs one fixed update per missed 16.6 ms step. A long frame (GC, a
// slow machine, or Firefox throttling the tab) makes it try to catch up every
// missed step at once; those updates can take longer than the frame they are
// in, so the backlog snowballs and the tab locks up. Clamp the delta the loop
// receives so it can only ever catch up a couple of steps per frame.
const MAX_LOOP_MS = 50;
const loop = engine as unknown as {
  _mainloop: (elapsedMs: number) => void;
  _lagMs?: number;
};
const runMainloop = loop._mainloop.bind(engine);
loop._mainloop = (elapsedMs: number) => runMainloop(Math.min(elapsedMs, MAX_LOOP_MS));

// Drop any backlog when the tab becomes visible again, so returning to a
// throttled tab cannot replay minutes of simulation in a single frame.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loop._lagMs = 0;
  }
});

async function boot(): Promise<void> {
  // Excalibur's default loader skips Sound resources when the play button is
  // suppressed, so preload everything explicitly before the scene starts.
  await Promise.allSettled([
    ...Object.values(Images).map((image) => image.load()),
    ...Object.values(Sounds).map((sound) => sound.load()),
  ]);

  await engine.start();
  await engine.goToScene('level');
}

void boot().catch((error: unknown) => {
  console.error('Failed to start Sandwich of Rage', error);
});

// Keep the page from scrolling or opening browser help while playing.
const prevent = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1']);
window.addEventListener(
  'keydown',
  (event) => {
    if (prevent.has(event.code) || prevent.has(event.key)) {
      event.preventDefault();
    }
  },
  { passive: false },
);

window.__game = { engine, scene, audio, sounds: Sounds };

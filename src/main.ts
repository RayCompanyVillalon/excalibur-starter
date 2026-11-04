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
  console.error('Failed to start Excalibur Platformer', error);
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

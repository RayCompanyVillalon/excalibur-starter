import { Color, DisplayMode, Engine } from 'excalibur';
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
  pixelArt: false,
  antialiasing: true,
});

const scene = new LevelScene();
engine.add('level', scene);

void engine.start().then(() => engine.goToScene('level'));

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

window.__game = { engine, scene };

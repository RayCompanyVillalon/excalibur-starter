import { Color, DisplayMode, Engine } from 'excalibur';
import { GAME } from './game/config';
import { MainScene } from './game/scenes/MainScene';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #game canvas');
}

const engine = new Engine({
  canvasElement: canvas,
  width: GAME.viewport.width,
  height: GAME.viewport.height,
  displayMode: DisplayMode.FitScreen,
  backgroundColor: Color.fromHex(GAME.background),
  suppressPlayButton: true,
  pixelArt: false,
});

const game = new MainScene();
engine.add('main', game);

void engine.start().then(() => engine.goToScene('main'));

// Handy for poking at the running game from the devtools console.
declare global {
  interface Window {
    __game: { engine: Engine; scene: MainScene };
  }
}
window.__game = { engine, scene: game };

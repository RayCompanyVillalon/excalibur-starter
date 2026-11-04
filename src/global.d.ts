import type { Engine } from 'excalibur';
import type { LevelScene } from './game/scenes/LevelScene';

declare global {
  interface Window {
    __game: { engine: Engine; scene: LevelScene };
  }
}

export {};

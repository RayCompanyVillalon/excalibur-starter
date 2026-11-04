import type { Engine } from 'excalibur';
import type { LevelScene } from './game/scenes/LevelScene';
import type { audio } from './game/audio/Sfx';
import type { Sounds } from './game/assets';

declare global {
  interface Window {
    __game: {
      engine: Engine;
      scene: LevelScene;
      audio: typeof audio;
      sounds: typeof Sounds;
    };
  }
}

export {};

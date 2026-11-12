import { ImageSource, Sound } from 'excalibur';

import deathUrl from '../assets/audio/death.flac';
import jump1Url from '../assets/audio/jump1.flac';
import jump2Url from '../assets/audio/jump2.flac';
import landUrl from '../assets/audio/land.flac';
import musicUrl from '../assets/audio/music.ogg';
import step1Url from '../assets/audio/step1.flac';
import step2Url from '../assets/audio/step2.flac';
import cloudUrl from '../assets/props/cloud.png';
import doorUrl from '../assets/props/door.png';
import dieUrl from '../assets/player/die.png';
import fallUrl from '../assets/player/fall.png';
import jumpUrl from '../assets/player/jump.png';
import walkUrl from '../assets/player/walk.png';
import overworldUrl from '../assets/tiles/overworld.png';

/**
 * C32 Platformer Tiles, 16x16 pixel art.
 * Source art is drawn at 2x so one tile fills a 32px world cell.
 */
export const Images = {
  playerWalk: new ImageSource(walkUrl),
  playerJump: new ImageSource(jumpUrl),
  playerFall: new ImageSource(fallUrl),
  playerDie: new ImageSource(dieUrl),
  terrain: new ImageSource(overworldUrl),
  door: new ImageSource(doorUrl),
  cloud: new ImageSource(cloudUrl),
};

export const Sounds = {
  music: new Sound({ paths: [musicUrl], loop: true, volume: 0.3 }),
  jump: new Sound({ paths: [jump1Url], volume: 0.45, duration: 0.35 }),
  jumpAlt: new Sound({ paths: [jump2Url], volume: 0.45, duration: 0.35 }),
  step: new Sound({ paths: [step1Url], volume: 0.08, duration: 0.12 }),
  stepAlt: new Sound({ paths: [step2Url], volume: 0.08, duration: 0.12 }),
  land: new Sound({ paths: [landUrl], volume: 0.3, duration: 0.22 }),
  death: new Sound({
    paths: [deathUrl],
    volume: 0.55,
    duration: 1.4,
    playbackRate: 0.8,
  }),
  collect: new Sound({ paths: [jump1Url], volume: 0.5, duration: 0.3 }),
  parry: new Sound({ paths: [jump2Url], volume: 0.5, duration: 0.18, playbackRate: 1.7 }),
};

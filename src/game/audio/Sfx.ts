import { WebAudio, type Sound } from 'excalibur';

import { Sounds } from '../assets';

/**
 * Hard cap on overlapping instances of one effect. A healthy AudioContext
 * removes finished instances on its own; the cap only matters if playback is
 * blocked (for example a suspended context), where instances would otherwise
 * queue up forever and slowly freeze the tab.
 */
const MAX_INSTANCES = 6;

/**
 * Tiny sound-effect router. Music starts on the first user gesture (browser
 * autoplay rules) and `M` mutes everything.
 */
class AudioManager {
  private muted = false;
  private ready = false;
  private musicPlaying = false;
  private alternate = false;

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Resume the browser's AudioContext after a user gesture, then start music.
   *
   * Excalibur's loader normally does this, but this game preloads its assets
   * manually and suppresses the play button, so nothing would ever call
   * `WebAudio.unlock()`. On a suspended context `Sound.play()` never finishes,
   * and each call adds a WebAudio instance that is never released — over a long
   * session that is enough to freeze the whole browser. Returns false when the
   * context could not be unlocked, so the caller can retry on the next gesture.
   */
  async unlock(): Promise<boolean> {
    if (this.ready) {
      return true;
    }

    let ok = false;
    try {
      ok = await WebAudio.unlock();
    } catch {
      ok = false;
    }

    if (ok) {
      this.ready = true;
      this.startMusic();
    }
    return ok;
  }

  startMusic(): void {
    if (!this.ready || this.muted || this.musicPlaying) {
      return;
    }
    this.musicPlaying = true;
    void Sounds.music.play();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      Sounds.music.stop();
      this.musicPlaying = false;
    } else {
      this.startMusic();
    }
    return this.muted;
  }

  jump(): void {
    const sound = this.alternate ? Sounds.jump : Sounds.jumpAlt;
    this.alternate = !this.alternate;
    this.play(sound);
  }

  step(): void {
    const sound = this.alternate ? Sounds.step : Sounds.stepAlt;
    this.alternate = !this.alternate;
    this.play(sound);
  }

  land(impactSpeed: number): void {
    const volume = Math.min(0.45, 0.14 + impactSpeed / 3000);
    this.play(Sounds.land, volume);
  }

  death(): void {
    this.play(Sounds.death);
  }

  collect(): void {
    this.play(Sounds.collect);
  }

  parry(): void {
    this.play(Sounds.parry);
  }

  /** Play one effect, dropping stuck instances if playback is not draining. */
  private play(sound: Sound, volume?: number): void {
    if (!this.ready || this.muted) {
      return;
    }
    if (sound.instances.length >= MAX_INSTANCES) {
      sound.stop();
    }
    void (volume === undefined ? sound.play() : sound.play(volume));
  }
}

export const audio = new AudioManager();

import { Sounds } from '../assets';

/**
 * Tiny sound-effect router. Music starts on the first user gesture (browser
 * autoplay rules) and `M` mutes everything.
 */
class AudioManager {
  private muted = false;
  private musicPlaying = false;
  private alternate = false;

  get isMuted(): boolean {
    return this.muted;
  }

  startMusic(): void {
    if (this.muted || this.musicPlaying) {
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
    if (this.muted) {
      return;
    }
    const sound = this.alternate ? Sounds.jump : Sounds.jumpAlt;
    this.alternate = !this.alternate;
    void sound.play();
  }

  step(): void {
    if (this.muted) {
      return;
    }
    const sound = this.alternate ? Sounds.step : Sounds.stepAlt;
    this.alternate = !this.alternate;
    void sound.play();
  }

  land(impactSpeed: number): void {
    if (this.muted) {
      return;
    }
    const volume = Math.min(0.45, 0.14 + impactSpeed / 3000);
    void Sounds.land.play(volume);
  }

  death(): void {
    if (this.muted) {
      return;
    }
    void Sounds.death.play();
  }

  collect(): void {
    if (this.muted) {
      return;
    }
    void Sounds.collect.play();
  }

  parry(): void {
    if (this.muted) {
      return;
    }
    void Sounds.parry.play();
  }
}

export const audio = new AudioManager();

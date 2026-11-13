import { formatTime } from './time';

/** localStorage key for the cumulative score. */
const SCORE_KEY = 'excalibur-starter:score';
const DEATHS_KEY = 'excalibur-starter:deaths';

/** Small DOM overlay: debug readout (F1), transient messages, and speedrun clock. */
export class Hud {
  private readonly debugPanel = document.getElementById('debug');
  private readonly debugBody = document.getElementById('debug-body');
  private readonly debugLevelsEl = document.getElementById('debug-levels');
  private readonly toastEl = document.getElementById('toast');
  private readonly ingredientEl = document.getElementById('ingredient');
  private readonly levelEl = document.getElementById('level-label');
  private readonly timerEl = document.getElementById('timer');
  private readonly bestEl = document.getElementById('best-time');
  private readonly scoreEl = document.getElementById('score');
  private readonly deathsEl = document.getElementById('deaths');
  private _score = 0;
  private _deaths = 0;

  private debugVisible = false;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private levelButtons: HTMLButtonElement[] = [];

  private bestKey = 'sandwich-of-rage:best';
  private bestMs: number | null = null;
  private startedAt: number | null = null;
  private elapsedMs = 0;
  private running = false;

  get debugOn(): boolean {
    return this.debugVisible;
  }

  get timeMs(): number {
    return this.elapsedMs;
  }

  get bestTimeMs(): number | null {
    return this.bestMs;
  }

  get score(): number {
    return this._score;
  }

  get deaths(): number {
    return this._deaths;
  }

  /** Load the cumulative score and deaths from localStorage. */
  loadScore(): void {
    try {
      const raw = window.localStorage.getItem(SCORE_KEY);
      this._score = raw ? Math.max(0, Number(raw)) : 0;
    } catch { this._score = 0; }
    try {
      const raw = window.localStorage.getItem(DEATHS_KEY);
      this._deaths = raw ? Math.max(0, Number(raw)) : 0;
    } catch { this._deaths = 0; }
    this.renderScore();
  }

  /** Add points to the cumulative score. */
  addScore(points: number): void {
    this._score += points;
    this.saveScore();
    this.renderScore();
  }

  /** Increment the death counter. */
  addDeath(): void {
    this._deaths += 1;
    this.saveScore();
    this.renderScore();
  }

  /** Reset score for a new full run (TODO). */
  resetScore(): void {
    this._score = 0;
    this._deaths = 0;
    this.saveScore();
    this.renderScore();
  }

  private saveScore(): void {
    try {
      window.localStorage.setItem(SCORE_KEY, String(this._score));
      window.localStorage.setItem(DEATHS_KEY, String(this._deaths));
    } catch { /* storage unavailable */ }
  }

  private renderScore(): void {
    if (this.scoreEl) {
      this.scoreEl.textContent = String(this._score).padStart(4, '0');
    }
    if (this.deathsEl) {
      this.deathsEl.textContent = `☠ ${this._deaths}`;
    }
  }

  toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    if (this.debugPanel) {
      this.debugPanel.hidden = !this.debugVisible;
    }
  }

  setDebugText(text: string): void {
    if (this.debugBody && this.debugVisible) {
      this.debugBody.textContent = text;
    }
  }

  /**
   * Build the debug-only level picker. Each entry becomes a button that jumps
   * straight to that level; `markActiveLevel` highlights the current one.
   */
  setLevelSelector(
    levels: ReadonlyArray<{ name: string; ingredient: string }>,
    onSelect: (index: number) => void,
  ): void {
    if (!this.debugLevelsEl) {
      return;
    }

    this.debugLevelsEl.replaceChildren();
    this.levelButtons = levels.map((level, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'debug-level';
      button.title = `Jump to ${level.name} (${level.ingredient})`;

      const label = document.createElement('span');
      label.textContent = level.name;

      const key = document.createElement('span');
      key.className = 'level-key';
      key.textContent = `[${index + 1}]`;

      button.append(label, key);
      button.addEventListener('click', () => {
        // Drop focus so a later Space press is a jump, not a button click.
        button.blur();
        onSelect(index);
      });
      this.debugLevelsEl?.append(button);
      return button;
    });
  }

  /** Highlight the level that is currently loaded. */
  markActiveLevel(index: number): void {
    this.levelButtons.forEach((button, i) => {
      button.classList.toggle('active', i === index);
    });
  }

  toast(message: string, durationMs = 2200): void {
    if (!this.toastEl) {
      return;
    }
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');

    if (this.toastTimer !== undefined) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.toastEl?.classList.remove('show');
    }, durationMs);
  }

  /** Update the ingredient tracker display. */
  setIngredient(name: string, collected: boolean): void {
    if (!this.ingredientEl) {
      return;
    }
    this.ingredientEl.textContent = collected ? `✓ ${name}` : `? ${name}`;
    this.ingredientEl.classList.toggle('collected', collected);
  }

  /** Update the level label display. */
  setLevelLabel(label: string): void {
    if (!this.levelEl) {
      return;
    }
    this.levelEl.textContent = label;
  }

  /** Switch the best-time storage slot (one record per level). */
  useBestTime(levelId: number): void {
    this.bestKey = `sandwich-of-rage:best:level-${levelId}`;
    this.bestMs = this.readBest();
    this.renderBest();
  }

  /** Reset the clock to zero and wait for the first input. */
  resetTimer(): void {
    this.startedAt = null;
    this.elapsedMs = 0;
    this.running = false;
    this.timerEl?.classList.remove('finished');
    this.renderTime();
  }

  /** Start the clock on the first movement input. */
  startTimer(): void {
    if (this.running || this.elapsedMs > 0) {
      return;
    }
    this.startedAt = performance.now();
    this.running = true;
  }

  /** Refresh the displayed time; call once per frame while playing. */
  tickTimer(now = performance.now()): void {
    if (!this.running || this.startedAt === null) {
      return;
    }
    this.elapsedMs = now - this.startedAt;
    this.renderTime();
  }

  /** Freeze the clock, optionally saving a new personal best. Returns the run time. */
  stopTimer(saveBest = false): number {
    if (this.running && this.startedAt !== null) {
      this.elapsedMs = performance.now() - this.startedAt;
      this.running = false;
      this.renderTime();
    }
    this.timerEl?.classList.add('finished');

    if (saveBest && this.elapsedMs > 0 && (this.bestMs === null || this.elapsedMs < this.bestMs)) {
      this.bestMs = this.elapsedMs;
      this.writeBest(this.elapsedMs);
      this.renderBest();
    }
    return this.elapsedMs;
  }

  private renderTime(): void {
    if (this.timerEl) {
      this.timerEl.textContent = formatTime(this.elapsedMs);
    }
  }

  private renderBest(): void {
    if (this.bestEl) {
      this.bestEl.textContent =
        this.bestMs === null ? 'BEST —' : `BEST ${formatTime(this.bestMs)}`;
    }
  }

  private readBest(): number | null {
    try {
      const raw = window.localStorage.getItem(this.bestKey);
      if (raw === null) {
        return null;
      }
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  private writeBest(ms: number): void {
    try {
      window.localStorage.setItem(this.bestKey, String(Math.round(ms)));
    } catch {
      // Storage can be unavailable (private mode); a missing best is fine.
    }
  }
}

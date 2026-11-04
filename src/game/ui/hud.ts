/** Small DOM overlay: debug readout (F1) and transient messages. */
export class Hud {
  private readonly debugPanel = document.getElementById('debug');
  private readonly debugBody = document.getElementById('debug-body');
  private readonly toastEl = document.getElementById('toast');
  private debugVisible = false;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  get debugOn(): boolean {
    return this.debugVisible;
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
}

// Procedural 8-Bit Chiptune Web Audio Synthesizer for Pixel Puzzle Quest

class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainPeak = 0.08,
    endFreq?: number,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Subtle pitch variance (+/- 5%) for organic retro feel
    const variance = 1 + (Math.random() * 0.08 - 0.04);
    osc.type = type;
    osc.frequency.setValueAtTime(freq * variance, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * variance), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playStep() {
    this.playTone(190, 0.055, 'triangle', 0.06, 130);
  }

  public playPush(slid = false) {
    this.playTone(130, 0.09, 'square', 0.07, 95);
    if (slid) {
      this.playTone(320, 0.16, 'sine', 0.06, 580, 0.04);
    }
  }

  public playRotateMirror() {
    this.playTone(520, 0.07, 'triangle', 0.08, 780);
    this.playTone(780, 0.09, 'sine', 0.06, 1040, 0.05);
  }

  public playPlateActivate() {
    this.playTone(440, 0.1, 'square', 0.07);
    this.playTone(659.25, 0.16, 'square', 0.08, undefined, 0.07);
  }

  public playCrystalPower() {
    this.playTone(587.33, 0.09, 'triangle', 0.08);
    this.playTone(880, 0.14, 'triangle', 0.08, undefined, 0.06);
    this.playTone(1174.66, 0.18, 'sine', 0.07, undefined, 0.12);
  }

  public playTeleport() {
    this.playTone(280, 0.18, 'sine', 0.08, 860);
  }

  public playSentinelDestroy() {
    this.playTone(240, 0.12, 'sawtooth', 0.09, 75);
    this.playTone(160, 0.18, 'square', 0.08, 55, 0.06);
  }

  public playWindup() {
    this.playTone(620, 0.07, 'sawtooth', 0.05, 820);
  }

  public playBump() {
    this.playTone(90, 0.06, 'square', 0.05, 65);
  }

  public playHurt() {
    this.playTone(160, 0.16, 'sawtooth', 0.11, 55);
    this.playTone(110, 0.22, 'square', 0.1, 45, 0.08);
  }

  public playPortalOpen() {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => {
      this.playTone(n, 0.14, 'triangle', 0.08, undefined, i * 0.06);
    });
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, 0.18, 'square', 0.08, undefined, i * 0.09);
    });
  }

  public playUndo() {
    this.playTone(420, 0.07, 'triangle', 0.06, 260);
  }
}

export const soundEngine = new RetroSoundEngine();

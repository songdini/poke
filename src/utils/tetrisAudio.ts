// 8-Bit Retro Synthesizer Sound Engine using Web Audio API

class TetrisSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // Helper: play tone
  private playTone(freq: number, type: OscillatorType, duration: number, startDelay = 0, vol = 0.1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startDelay);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime + startDelay);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startDelay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startDelay);
      osc.stop(this.ctx.currentTime + startDelay + duration);
    } catch {
      // Audio context might be restricted
    }
  }

  public playMove() {
    this.playTone(320, 'square', 0.04, 0, 0.05);
  }

  public playRotate() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {}
  }

  public playSoftDrop() {
    this.playTone(180, 'sine', 0.04, 0, 0.04);
  }

  public playHardDrop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }

  public playHold() {
    this.playTone(550, 'sine', 0.08, 0, 0.08);
    this.playTone(700, 'sine', 0.08, 0.06, 0.08);
  }

  public playLineClear(lines: number) {
    if (this.isMuted) return;
    if (lines === 4) {
      // Tetris Fanfare!
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'triangle', 0.16, idx * 0.08, 0.14);
      });
    } else {
      const notes = [440, 554.37, 659.25];
      for (let i = 0; i < lines && i < notes.length; i++) {
        this.playTone(notes[i], 'square', 0.1, i * 0.06, 0.08);
      }
    }
  }

  public playAttack() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {}
  }

  public playGarbageRise() {
    this.playTone(110, 'sawtooth', 0.15, 0, 0.12);
    this.playTone(90, 'triangle', 0.2, 0.08, 0.15);
  }

  public playItemGain() {
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.12, idx * 0.05, 0.1);
    });
  }

  public playItemUse() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  public playGameOver() {
    const notes = [400, 350, 300, 220];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sawtooth', 0.22, idx * 0.14, 0.12);
    });
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.25, idx * 0.1, 0.15);
    });
  }
}

export const tetrisAudio = new TetrisSoundEngine();

const MUTE_KEY = 'leonida_run_muted_v1';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean = false;
  private loopsRunning: boolean = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(next: boolean): void {
    this.muted = next;
    try {
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {
      // ignore storage failure
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(next ? 0 : 0.35, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public startDrivingLoops(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.loopsRunning) return;

    try {
      // Subtle low-pass engine purr
      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 65;

      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 220;

      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0.001;

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      // Tire screech loop
      if (this.noiseBuffer) {
        this.tireNoiseNode = ctx.createBufferSource();
        this.tireNoiseNode.buffer = this.noiseBuffer;
        this.tireNoiseNode.loop = true;

        const tireFilter = ctx.createBiquadFilter();
        tireFilter.type = 'bandpass';
        tireFilter.frequency.value = 1450;
        tireFilter.Q.value = 4.5;

        this.tireGain = ctx.createGain();
        this.tireGain.gain.value = 0.0;

        this.tireNoiseNode.connect(tireFilter);
        tireFilter.connect(this.tireGain);
        this.tireGain.connect(this.masterGain);
        this.tireNoiseNode.start();
      }

      // Subtle distant siren loop
      this.sirenOsc = ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 620;

      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0.0;

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenOsc.start();

      this.loopsRunning = true;
    } catch {
      this.stopDrivingLoops();
    }
  }

  public updateDrivingLoops(params: {
    speedNorm: number;
    drifting: boolean;
    boosting: boolean;
    airborne: boolean;
    wantedLevel: number;
    time: number;
  }): void {
    if (!this.ctx || !this.loopsRunning) return;
    const now = this.ctx.currentTime;

    if (this.engineOsc && this.engineGain && this.engineFilter) {
      const targetFreq = 58 + params.speedNorm * 85 + (params.boosting ? 35 : 0) + (params.airborne ? 22 : 0);
      const targetCutoff = 180 + params.speedNorm * 320 + (params.boosting ? 250 : 0);
      const targetGain = 0.045 + params.speedNorm * 0.045 + (params.boosting ? 0.03 : 0);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.06);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);
    }

    if (this.tireGain) {
      const screech = params.drifting && !params.airborne ? 0.055 * Math.max(0.3, params.speedNorm) : 0;
      this.tireGain.gain.setTargetAtTime(screech, now, 0.04);
    }

    if (this.sirenOsc && this.sirenGain) {
      if (params.wantedLevel > 0) {
        const wail = 660 + Math.sin(params.time * 5.2) * 190;
        const vol = Math.min(0.028, 0.008 + params.wantedLevel * 0.004);
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.05);
        this.sirenGain.gain.setTargetAtTime(vol, now, 0.12);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.1);
      }
    }
  }

  public stopDrivingLoops(): void {
    this.loopsRunning = false;
    try {
      this.engineOsc?.stop();
      this.tireNoiseNode?.stop();
      this.sirenOsc?.stop();
    } catch {
      // already stopped
    }
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.tireNoiseNode = null;
    this.tireGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
  }

  public playNearMiss(combo: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = 440 * Math.pow(1.06, Math.min(combo, 12));
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.09);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playPickup(kind: 'cash' | 'nitro' | 'repair' | 'armor'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const notes =
      kind === 'cash'
        ? [587.33, 880]
        : kind === 'nitro'
        ? [440, 659.25, 987.77]
        : kind === 'armor'
        ? [392, 523.25, 659.25, 783.99]
        : [392, 523.25];

    notes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'nitro' || kind === 'armor' ? 'sawtooth' : 'sine';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(kind === 'armor' ? 0.14 : 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playBoost(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playCrash(heavy: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Sub punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 130 : 170, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + (heavy ? 0.28 : 0.14));
    gain.gain.setValueAtTime(heavy ? 0.35 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.3 : 0.16));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (heavy ? 0.31 : 0.17));

    // Metallic crunch
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = heavy ? 1600 : 1100;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(heavy ? 0.28 : 0.14, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.26 : 0.12));
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now);
      src.stop(now + (heavy ? 0.27 : 0.13));
    }
  }

  public playCopWreck(): void {
    this.playCrash(true);
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, now + 0.04);
    osc.frequency.setValueAtTime(783.99, now + 0.11);
    gain.gain.setValueAtTime(0.11, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.04);
    osc.stop(now + 0.29);
  }

  public playRamp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playStarUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playOffenseAlert(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    [520, 390].forEach((freq, i) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  public playMissileLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.28);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playBlast(): void {
    this.stopDrivingLoops();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Deep sub explosion punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.64);

    // Explosion blast noise roar
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.72);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.38, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.78);
    }

    // Dramatic descending sting
    const sting = [293.66, 233.08, 174.61];
    sting.forEach((freq, i) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + 0.18 + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public playEnd(victory: boolean): void {
    this.stopDrivingLoops();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const seq = victory ? [523.25, 659.25, 783.99, 1046.5] : [311.13, 277.18, 220, 146.83];
    seq.forEach((freq, i) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = victory ? 'triangle' : 'sawtooth';
      const t = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }
}

import { getGameItem, setGameItem } from './crazygames';

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

  // Feel-good evolving background music state
  private musicBus: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicTimerId: ReturnType<typeof setInterval> | null = null;
  private nextStepTime: number = 0;
  private musicStep: number = 0;
  private musicBar: number = 0;
  private musicIntensity: number = 0;
  private musicPlaying: boolean = false;

  constructor() {
    this.reloadMutedPreference();
  }

  public reloadMutedPreference(): boolean {
    try {
      this.muted = getGameItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime, 0.03);
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(next: boolean): void {
    this.muted = next;
    try {
      setGameItem(MUTE_KEY, next ? '1' : '0');
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
      this.startMusic();
    } catch {
      this.stopDrivingLoops();
    }
  }

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || this.musicPlaying) return;

    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 2300;
    this.musicFilter.Q.value = 0.7;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.setValueAtTime(0.001, ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.32, ctx.currentTime, 0.35);

    this.musicFilter.connect(this.musicBus);
    this.musicBus.connect(this.masterGain);

    this.musicPlaying = true;
    this.nextStepTime = ctx.currentTime + 0.05;
    this.musicStep = 0;
    this.musicBar = 0;

    // 118 BPM feel-good coastal groove (16th-note grid)
    const stepDur = 60 / 118 / 4;
    this.musicTimerId = setInterval(() => {
      if (!this.ctx || !this.musicPlaying) return;
      while (this.nextStepTime < this.ctx.currentTime + 0.16) {
        this.scheduleMusicStep(this.musicStep, this.musicBar, this.nextStepTime, stepDur);
        this.nextStepTime += stepDur;
        this.musicStep++;
        if (this.musicStep >= 16) {
          this.musicStep = 0;
          this.musicBar++;
        }
      }
    }, 45);
  }

  private scheduleMusicStep(step: number, bar: number, time: number, stepDur: number): void {
    const ctx = this.ctx;
    const out = this.musicFilter;
    if (!ctx || !out) return;

    // 4-bar uplifting sunset progression: Fmaj7 -> G6 -> Em7 -> Am9
    const chords = [
      { bass: 87.31, pad: [174.61, 220.0, 261.63, 329.63], arp: [349.23, 440.0, 523.25, 659.25], lead: [659.25, 587.33, 523.25, 659.25] }, // Fmaj7
      { bass: 98.0,  pad: [196.0, 246.94, 293.66, 329.63], arp: [392.0, 493.88, 587.33, 659.25], lead: [587.33, 659.25, 783.99, 659.25] }, // G6
      { bass: 82.41, pad: [164.81, 196.0, 246.94, 293.66], arp: [329.63, 392.0, 493.88, 587.33], lead: [493.88, 587.33, 659.25, 783.99] }, // Em7
      { bass: 110.0, pad: [220.0, 261.63, 329.63, 493.88], arp: [440.0, 523.25, 659.25, 987.77], lead: [880.0, 783.99, 659.25, 523.25] }, // Am9
    ];
    const barInPhrase = bar % 4;
    const chord = chords[barInPhrase];

    // Smooth energy progression over time:
    // Bars 0-1: Soft warm intro pad + bass + gentle arp
    // Bars 2-5: Energetic groove kick + silky offbeat shaker
    // Bars 6+: Full feel-good sunlit melody + soft clap + octave bass bounce
    const hasBeat = bar >= 2;
    const hasMelody = bar >= 6;
    const isPeak = bar >= 10 && bar % 16 >= 8;

    // 1. Lush warm pad on downbeat of every bar
    if (step === 0) {
      const padDur = stepDur * 15.5;
      chord.pad.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.setValueAtTime(idx % 2 === 0 ? -4 : 4, time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.042, time + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.018, time + padDur);
        osc.connect(gain);
        gain.connect(out);
        osc.start(time);
        osc.stop(time + padDur + 0.04);
      });
    }

    // 2. Warm bouncy sub-bass groove (steps 0, 3, 6, 8, 10, 14)
    if (step === 0 || step === 3 || step === 6 || step === 8 || step === 10 || step === 14) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const useOctave = (hasBeat && (step === 6 || step === 14)) || (isPeak && step === 10);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(useOctave ? chord.bass * 2 : chord.bass, time);
      const dur = step === 0 || step === 8 ? stepDur * 2.4 : stepDur * 1.6;
      const vol = step === 0 || step === 8 ? 0.14 : 0.10;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    }

    // 3. Soft shimmering Rhodes-like arpeggio
    const arpSteps = hasBeat ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 4, 8, 12];
    if (arpSteps.includes(step)) {
      const noteIdx = (step / 2 + bar) % chord.arp.length;
      const freq = chord.arp[noteIdx];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      const vol = isPeak ? 0.068 : 0.052;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + stepDur * 2.1);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      osc.stop(time + stepDur * 2.2);
    }

    // 4. Soft energetic four-on-the-floor kick
    if (hasBeat && step % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(106, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);
      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      osc.stop(time + 0.17);
    }

    // 5. Silky hi-hat / shaker pulse
    if (hasBeat && this.noiseBuffer && (step % 4 === 2 || (isPeak && step % 2 === 1))) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6800;
      const gain = ctx.createGain();
      const vol = step % 4 === 2 ? 0.032 : 0.015;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.045);
      src.connect(hp);
      hp.connect(gain);
      gain.connect(out);
      src.start(time);
      src.stop(time + 0.055);
    }

    // 6. Soft groove clap on beats 2 & 4 (steps 4 & 12)
    if (hasMelody && this.noiseBuffer && (step === 4 || step === 12)) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1750;
      bp.Q.value = 1.6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.038, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(out);
      src.start(time);
      src.stop(time + 0.12);
    }

    // 7. Feel-good melodic lead phrase over time
    if (hasMelody && (step === 0 || step === 3 || step === 6 || step === 10 || (isPeak && step === 13))) {
      const leadIdx = step === 0 ? 0 : step === 3 ? 1 : step === 6 ? 2 : 3;
      const freq = chord.lead[leadIdx];
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      overtone.frequency.setValueAtTime(freq * 2, time);
      const dur = step === 10 ? stepDur * 3.4 : stepDur * 2.2;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.016);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

      const ovGain = ctx.createGain();
      ovGain.gain.value = 0.25;
      overtone.connect(ovGain);
      ovGain.connect(gain);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      overtone.start(time);
      osc.stop(time + dur + 0.02);
      overtone.stop(time + dur + 0.02);
    }
  }

  private stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimerId !== null) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    try {
      if (this.musicBus && this.ctx) {
        this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
      }
      this.musicBus?.disconnect();
      this.musicFilter?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    this.musicBus = null;
    this.musicFilter = null;
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
      const targetFreq = 56 + params.speedNorm * 82 + (params.boosting ? 32 : 0) + (params.airborne ? 20 : 0);
      const targetCutoff = 160 + params.speedNorm * 240 + (params.boosting ? 180 : 0);
      const targetGain = 0.024 + params.speedNorm * 0.026 + (params.boosting ? 0.018 : 0);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.06);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);
    }

    if (this.musicFilter) {
      this.musicIntensity = Math.min(1, params.speedNorm * 0.7 + (params.boosting ? 0.35 : 0));
      const musicCutoff = 2100 + this.musicIntensity * 1450;
      this.musicFilter.frequency.setTargetAtTime(musicCutoff, now, 0.15);
    }

    if (this.tireGain) {
      const screech = params.drifting && !params.airborne ? 0.045 * Math.max(0.3, params.speedNorm) : 0;
      this.tireGain.gain.setTargetAtTime(screech, now, 0.04);
    }

    if (this.sirenOsc && this.sirenGain) {
      if (params.wantedLevel > 0) {
        const wail = 660 + Math.sin(params.time * 5.2) * 190;
        const vol = Math.min(0.022, 0.006 + params.wantedLevel * 0.003);
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.05);
        this.sirenGain.gain.setTargetAtTime(vol, now, 0.12);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.1);
      }
    }
  }

  public stopDrivingLoops(): void {
    this.loopsRunning = false;
    this.stopMusic();
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

  public playCelebrationFanfare(rank: 1 | 2 | 3): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const notes =
      rank === 1
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
        : rank === 2
        ? [440, 554.37, 659.25, 880, 1108.73]
        : [392, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.085;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }
}

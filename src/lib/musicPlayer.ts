import type { MusicMode } from './moodEngine';

interface MoodSoundscapeConfig {
  baseFreq: number;
  scale: number[];
  tempo: number;
  waveType: OscillatorType;
  filterFreq: number;
  reverbMix: number;
  volume: number;
  padVolume: number;
  leadVolume: number;
  bassFreq: number;
  chordIntervals: number[];
}

const MOOD_CONFIGS: Record<MusicMode, MoodSoundscapeConfig> = {
  uplifting: {
    baseFreq: 523.25,
    scale: [0, 2, 4, 7, 9, 12, 14],
    tempo: 120,
    waveType: 'triangle',
    filterFreq: 3000,
    reverbMix: 0.3,
    volume: 0.35,
    padVolume: 0.12,
    leadVolume: 0.1,
    bassFreq: 130.81,
    chordIntervals: [0, 4, 7, 12],
  },
  calm_ambient: {
    baseFreq: 392.0,
    scale: [0, 3, 5, 7, 10, 12],
    tempo: 60,
    waveType: 'sine',
    filterFreq: 1200,
    reverbMix: 0.5,
    volume: 0.3,
    padVolume: 0.15,
    leadVolume: 0.06,
    bassFreq: 98.0,
    chordIntervals: [0, 5, 7, 10],
  },
  deep_focus: {
    baseFreq: 440.0,
    scale: [0, 2, 3, 5, 7, 8, 10],
    tempo: 75,
    waveType: 'sine',
    filterFreq: 800,
    reverbMix: 0.4,
    volume: 0.25,
    padVolume: 0.14,
    leadVolume: 0.05,
    bassFreq: 110.0,
    chordIntervals: [0, 3, 7, 10],
  },
  high_energy: {
    baseFreq: 587.33,
    scale: [0, 2, 4, 7, 9, 11, 14],
    tempo: 140,
    waveType: 'sawtooth',
    filterFreq: 3500,
    reverbMix: 0.2,
    volume: 0.38,
    padVolume: 0.1,
    leadVolume: 0.12,
    bassFreq: 146.83,
    chordIntervals: [0, 4, 7, 11],
  },
  relaxing: {
    baseFreq: 349.23,
    scale: [0, 2, 4, 6, 9, 11, 13],
    tempo: 50,
    waveType: 'sine',
    filterFreq: 900,
    reverbMix: 0.6,
    volume: 0.28,
    padVolume: 0.16,
    leadVolume: 0.04,
    bassFreq: 87.31,
    chordIntervals: [0, 4, 6, 9],
  },
  melancholic: {
    baseFreq: 329.63,
    scale: [0, 2, 3, 5, 7, 8, 11],
    tempo: 55,
    waveType: 'triangle',
    filterFreq: 1000,
    reverbMix: 0.55,
    volume: 0.3,
    padVolume: 0.13,
    leadVolume: 0.07,
    bassFreq: 82.41,
    chordIntervals: [0, 3, 7, 10],
  },
  silence: {
    baseFreq: 0,
    scale: [],
    tempo: 0,
    waveType: 'sine',
    filterFreq: 0,
    reverbMix: 0,
    volume: 0,
    padVolume: 0,
    leadVolume: 0,
    bassFreq: 0,
    chordIntervals: [],
  },
};

export class MoodMusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private padOscillators: OscillatorNode[] = [];
  private padGains: GainNode[] = [];
  private bassOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentMode: MusicMode = 'silence';
  private playing = false;
  private noteIndex = 0;
  private onStateChange?: (playing: boolean, mode: MusicMode) => void;

  constructor(onStateChange?: (playing: boolean, mode: MusicMode) => void) {
    this.onStateChange = onStateChange;
  }

  private ensureContext(): boolean {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2000;
      this.filter.Q.value = 0.7;
      this.filter.connect(this.masterGain);

      // Reverb-ish delay
      this.delay = this.ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.35;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.35;
      this.delayWet = this.ctx.createGain();
      this.delayWet.gain.value = 0.2;

      this.delay.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delay);
      this.delay.connect(this.delayWet);
      this.delayWet.connect(this.masterGain);

      // LFO for gentle filter modulation
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.value = 0.15;
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.value = 200;
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filter.frequency);
      this.lfo.start();

      return true;
    } catch {
      return false;
    }
  }

  private freqFromSemi(base: number, semis: number): number {
    return base * Math.pow(2, semis / 12);
  }

  private startPad(cfg: MoodSoundscapeConfig) {
    if (!this.ctx || !this.filter) return;

    this.stopPad();

    for (const interval of cfg.chordIntervals) {
      const freq = this.freqFromSemi(cfg.baseFreq, interval);
      const osc = this.ctx.createOscillator();
      osc.type = cfg.waveType;
      osc.frequency.value = freq;

      // Slight detuning for warmth
      const detune = this.ctx.createOscillator();
      detune.type = cfg.waveType;
      detune.frequency.value = freq * 1.005;

      const gain = this.ctx.createGain();
      gain.gain.value = cfg.padVolume;

      osc.connect(gain);
      detune.connect(gain);
      gain.connect(this.filter);

      if (this.delay) gain.connect(this.delay);

      osc.start();
      detune.start();

      this.padOscillators.push(osc, detune);
      this.padGains.push(gain);
    }
  }

  private stopPad() {
    for (const osc of this.padOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.padOscillators = [];
    this.padGains = [];
  }

  private startBass(cfg: MoodSoundscapeConfig) {
    if (!this.ctx || !this.filter || cfg.bassFreq === 0) return;

    this.bassOsc = this.ctx.createOscillator();
    this.bassOsc.type = 'sine';
    this.bassOsc.frequency.value = cfg.bassFreq;

    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0;

    this.bassOsc.connect(this.bassGain);
    this.bassGain.connect(this.masterGain!);
    this.bassOsc.start();
  }

  private stopBass() {
    if (this.bassOsc) {
      try { this.bassOsc.stop(); } catch { /* */ }
      this.bassOsc = null;
      this.bassGain = null;
    }
  }

  private playLeadNote(cfg: MoodSoundscapeConfig) {
    if (!this.ctx || !this.filter || cfg.scale.length === 0) return;

    const note = cfg.scale[this.noteIndex % cfg.scale.length];
    const freq = this.freqFromSemi(cfg.baseFreq * 2, note);

    const osc = this.ctx.createOscillator();
    osc.type = cfg.waveType;
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(cfg.leadVolume, this.ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(this.filter);
    if (this.delay) gain.connect(this.delay);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);

    this.noteIndex++;
  }

  private startLeadLoop(cfg: MoodSoundscapeConfig) {
    if (cfg.tempo === 0) return;
    const intervalMs = 60000 / cfg.tempo / 2;
    this.noteIndex = 0;
    this.intervalId = setInterval(() => this.playLeadNote(cfg), intervalMs);
  }

  private stopLeadLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  play(mode: MusicMode) {
    if (mode === 'silence') {
      this.stop();
      return;
    }

    if (!this.ensureContext()) return;
    if (this.ctx?.state === 'suspended') this.ctx.resume();

    const cfg = MOOD_CONFIGS[mode];

    // Fade out current
    if (this.playing && this.currentMode !== mode) {
      this.fadeOut(300, () => {
        this.stopPad();
        this.stopBass();
        this.stopLeadLoop();
        this.startNewMode(cfg, mode);
      });
      return;
    }

    if (!this.playing) {
      this.startNewMode(cfg, mode);
    }
  }

  private startNewMode(cfg: MoodSoundscapeConfig, mode: MusicMode) {
    if (!this.ctx || !this.filter || !this.masterGain) return;

    this.currentMode = mode;
    this.playing = true;

    this.filter.frequency.setValueAtTime(cfg.filterFreq, this.ctx.currentTime);
    if (this.delayWet) this.delayWet.gain.value = cfg.reverbMix;

    this.startPad(cfg);
    this.startBass(cfg);
    this.startLeadLoop(cfg);

    // Fade in master
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(cfg.volume, this.ctx.currentTime + 1.5);

    // Fade in bass
    if (this.bassGain) {
      this.bassGain.gain.linearRampToValueAtTime(cfg.padVolume * 0.7, this.ctx.currentTime + 2);
    }

    this.onStateChange?.(true, mode);
  }

  private fadeOut(durationMs: number, callback?: () => void) {
    if (!this.masterGain || !this.ctx) {
      callback?.();
      return;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
    setTimeout(() => callback?.(), durationMs);
  }

  stop() {
    this.fadeOut(500, () => {
      this.stopPad();
      this.stopBass();
      this.stopLeadLoop();
      this.playing = false;
      this.currentMode = 'silence';
      this.onStateChange?.(false, 'silence');
    });
  }

  setVolume(volume: number) {
    if (!this.masterGain || !this.ctx) return;
    const cfg = MOOD_CONFIGS[this.currentMode];
    const target = Math.max(0, Math.min(0.5, volume)) * (cfg.volume / 0.38);
    this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.1);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getCurrentMode(): MusicMode {
    return this.currentMode;
  }

  dispose() {
    this.stop();
    setTimeout(() => {
      if (this.lfo) { try { this.lfo.stop(); } catch { /* */ } }
      if (this.ctx) { try { this.ctx.close(); } catch { /* */ } }
      this.ctx = null;
    }, 600);
  }
}

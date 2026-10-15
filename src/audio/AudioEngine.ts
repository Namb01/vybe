import type { AudioSource, SourceFactory, SourceKind } from './types';

export interface EngineState {
  kind: SourceKind | null;
  label: string | null;
  playing: boolean;
  /** Set only for seekable sources (uploaded files). */
  media: HTMLAudioElement | null;
}

const IDLE: EngineState = { kind: null, label: null, playing: false, media: null };

/**
 * Owns the AudioContext and the analysis graph:
 *
 *   source.output ─▶ analyser ─▶ monitor gain ─▶ speakers
 *
 * The analyser always hears the source; the monitor gain is muted for
 * mic / tab capture so you don't get feedback or doubled audio.
 *
 * The UI subscribes to `state` (changes rarely). The render loop reads
 * `frequency` / `waveform` directly each frame, bypassing React entirely.
 */
export class AudioEngine {
  frequency: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  waveform: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private monitor: GainNode | null = null;
  private current: AudioSource | null = null;
  private volume = 0.9;

  private state: EngineState = IDLE;
  private listeners = new Set<() => void>();

  // ---- React bridge (useSyncExternalStore) ----
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;

  private publish() {
    const s = this.current;
    this.state = s ? { kind: s.kind, label: s.label, playing: this.isPlaying(), media: s.media ?? null } : IDLE;
    this.listeners.forEach((l) => l());
  }

  // ---- Setup ----
  /** Created lazily: browsers only allow audio to start after a user gesture. */
  private init() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    // 4096 gives ~12 Hz per bin at 48 kHz, enough to keep bass bars distinct.
    // Light smoothing, because the visualizers apply their own attack/release.
    // A wider dB window than the default (-100 to -30) stops loud music
    // from pinning many bins at the maximum.
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.5;
    analyser.minDecibels = -85;
    analyser.maxDecibels = -15;
    const monitor = ctx.createGain();
    analyser.connect(monitor);
    monitor.connect(ctx.destination);

    this.frequency = new Uint8Array(analyser.frequencyBinCount);
    this.waveform = new Uint8Array(analyser.fftSize);
    ctx.onstatechange = () => this.publish();
    this.ctx = ctx;
    this.analyser = analyser;
    this.monitor = monitor;
  }

  // ---- Sources ----
  /**
   * Switch to a new input. If the factory throws (permission denied, bad file),
   * the current source keeps playing and the error propagates to the caller.
   */
  async setSource(factory: SourceFactory) {
    this.init();
    const ctx = this.ctx!;
    await ctx.resume();

    const next = await factory(ctx);
    this.release();
    this.current = next;

    next.output.connect(this.analyser!);
    this.monitor!.gain.value = next.audible ? this.volume : 0;
    next.onEnded = () => {
      if (this.current !== next) return;
      this.release();
      this.publish();
    };
    next.media?.addEventListener('play', () => this.publish());
    next.media?.addEventListener('pause', () => this.publish());

    try {
      await next.start();
    } catch (err) {
      this.release();
      this.publish();
      throw err;
    }
    this.publish();
  }

  stop() {
    this.release();
    this.publish();
  }

  private release() {
    this.current?.stop();
    this.current = null;
  }

  // ---- Transport ----
  private isPlaying() {
    if (!this.current) return false;
    return this.current.media ? !this.current.media.paused : this.ctx?.state === 'running';
  }

  async toggle() {
    const s = this.current;
    const ctx = this.ctx;
    if (!s || !ctx) return;
    if (s.media) {
      if (s.media.paused) await s.media.play();
      else s.media.pause();
    } else if (ctx.state === 'running') {
      await ctx.suspend();
    } else {
      await ctx.resume();
    }
    this.publish();
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.monitor && this.current?.audible) this.monitor.gain.value = this.volume;
  }

  get sampleRate() {
    return this.ctx?.sampleRate ?? 48000;
  }

  // ---- Per-frame read (called from the render loop) ----
  /** Fills `frequency` and `waveform`. Returns false when there's nothing playing. */
  read(): boolean {
    if (!this.analyser || !this.isPlaying()) return false;
    this.analyser.getByteFrequencyData(this.frequency);
    this.analyser.getByteTimeDomainData(this.waveform);
    return true;
  }

  /** Analyser settings, ready for the customization panel later. */
  configure(opts: { fftSize?: number; smoothing?: number }) {
    if (!this.analyser) return;
    if (opts.smoothing !== undefined) this.analyser.smoothingTimeConstant = opts.smoothing;
    if (opts.fftSize !== undefined) {
      this.analyser.fftSize = opts.fftSize;
      this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveform = new Uint8Array(this.analyser.fftSize);
    }
  }
}

export const engine = new AudioEngine();

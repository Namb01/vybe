import type { Palette } from '../theme/accents';

export interface FrameData {
  /** 0–255 magnitude per frequency bin, low to high. */
  frequency: Uint8Array;
  /** 0–255 time-domain samples, centered on 128. */
  waveform: Uint8Array;
  /** Average energy (0–1) in three broad bands. All zero when nothing is playing. */
  bands: { bass: number; mid: number; treble: number };
  sampleRate: number;
  /** Seconds since the render loop started. */
  time: number;
  /** Seconds since the previous frame. */
  dt: number;
  /** False when nothing is playing; visualizers should show a calm idle state. */
  active: boolean;
  reducedMotion: boolean;
  /** Canvas shadowBlur ignores the transform, so scale it by this on high-DPI screens. */
  dpr: number;
  palette: Palette;
}

/**
 * Every visual mode implements this. The canvas host calls `draw` once per
 * frame and knows nothing else about the visualizer, so adding a mode
 * means adding one file and one line in `visualizers/index.ts`.
 */
export interface Visualizer {
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, frame: FrameData): void;
}

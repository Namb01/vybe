export interface FrameData {
  /** 0–255 magnitude per frequency bin, low to high. */
  frequency: Uint8Array;
  /** 0–255 time-domain samples, centered on 128. */
  waveform: Uint8Array;
  /** Seconds since the render loop started. */
  time: number;
  /** Seconds since the previous frame. */
  dt: number;
  /** False when nothing is playing; visualizers should show a calm idle state. */
  active: boolean;
  reducedMotion: boolean;
}

/**
 * Every visual mode implements this. The canvas host calls `draw` once per
 * frame and knows nothing else about the visualizer, so adding a mode
 * means adding one file.
 */
export interface Visualizer {
  readonly name: string;
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, frame: FrameData): void;
}

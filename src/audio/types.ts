export type SourceKind = 'file' | 'mic' | 'tab';

/**
 * Anything that can feed audio into the engine. Each input (file, mic, tab
 * capture, synthesized demo) implements this, so the engine and the
 * visualizers never need to know where the sound came from.
 */
export interface AudioSource {
  readonly kind: SourceKind;
  /** Human-readable name shown in the UI (track name, "Microphone", ...). */
  readonly label: string;
  /** The node the analyser listens to. */
  readonly output: AudioNode;
  /** Whether the engine should route this source to the speakers.
   *  False for mic / tab capture, which would cause feedback or double audio. */
  readonly audible: boolean;
  /** Present for seekable sources (uploaded files). */
  readonly media?: HTMLAudioElement;
  /** Set by the engine; call when the source ends on its own
   *  (e.g. the user clicks "Stop sharing"). */
  onEnded?: () => void;
  start(): Promise<void>;
  stop(): void;
}

/** Sources are built from a factory so the engine can own the AudioContext. */
export type SourceFactory = (ctx: AudioContext) => Promise<AudioSource>;

export type AudioErrorCode = 'denied' | 'unsupported' | 'no-audio' | 'decode' | 'unknown';

/** Errors with a message that is safe to show directly to the user. */
export class AudioSourceError extends Error {
  constructor(
    public readonly code: AudioErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AudioSourceError';
  }
}

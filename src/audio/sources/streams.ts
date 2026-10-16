// This file contains functions to create audio sources from the microphone

import { AudioSourceError, type AudioSource, type SourceKind } from '../types';

// Raw signal, no processing: voice-call filters would flatten music.
const RAW_AUDIO = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

function fromStream(ctx: AudioContext, kind: SourceKind, label: string, stream: MediaStream): AudioSource {
  const output = ctx.createMediaStreamSource(stream);

  const source: AudioSource = {
    kind,
    label,
    output,
    audible: false, // never route captured audio back out to the speakers
    start: async () => {},
    stop() {
      output.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };

  // Fires when the user hits the browser's "Stop sharing" button or unplugs the mic.
  stream.getTracks().forEach((t) => t.addEventListener('ended', () => source.onEnded?.(), { once: true }));
  return source;
}

export async function createMicSource(ctx: AudioContext): Promise<AudioSource> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new AudioSourceError('unsupported', "This browser can't access a microphone.");
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO });
    return fromStream(ctx, 'mic', 'Microphone', stream);
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') {
      throw new AudioSourceError('denied', 'Microphone access was blocked. Allow it in your browser’s site settings.');
    }
    if (name === 'NotFoundError') {
      throw new AudioSourceError('unsupported', 'No microphone was found.');
    }
    throw new AudioSourceError('unknown', "Couldn't start the microphone.");
  }
}

export async function createTabSource(ctx: AudioContext): Promise<AudioSource> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new AudioSourceError('unsupported', "This browser can't capture tab audio.");
  }

  let stream: MediaStream;
  try {
    // Browsers require a video track here; we never display it. It stays alive so
    // the capture isn't dropped, and ending it also counts as "sharing stopped".
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: RAW_AUDIO });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw new AudioSourceError('denied', 'Sharing was cancelled.');
    }
    throw new AudioSourceError('unknown', "Couldn't start tab capture.");
  }

  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    throw new AudioSourceError(
      'no-audio',
      'No audio was shared. Pick a Chrome tab and turn on "Share tab audio" in the dialog.',
    );
  }

  return fromStream(ctx, 'tab', 'Tab audio', stream);
}

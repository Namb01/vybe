// This file contains functions to create audio sources from files

import { AudioSourceError, type AudioSource } from '../types';

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;

export async function createFileSource(ctx: AudioContext, file: File): Promise<AudioSource> {
  if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) {
    throw new AudioSourceError('unsupported', `"${file.name}" doesn't look like an audio file.`);
  }

  const url = URL.createObjectURL(file);
  const media = new Audio();
  media.preload = 'auto';
  media.loop = true;
  media.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      media.addEventListener('canplay', () => resolve(), { once: true });
      media.addEventListener('error', () => reject(new Error('decode')), { once: true });
    });
  } catch {
    URL.revokeObjectURL(url);
    throw new AudioSourceError('decode', `Couldn't read "${file.name}". Try an MP3, WAV, or M4A.`);
  }

  // An element can only be wrapped once, which is why each file gets its own.
  const output = ctx.createMediaElementSource(media);

  return {
    kind: 'file',
    label: file.name.replace(/\.[^.]+$/, ''),
    output,
    audible: true,
    media,
    start: () => media.play(),
    stop() {
      media.pause();
      output.disconnect();
      media.removeAttribute('src');
      media.load();
      URL.revokeObjectURL(url);
    },
  };
}

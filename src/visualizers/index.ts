import { createRadial } from './radial';
import { createSpectrum } from './spectrum';
import { createWaves } from './waves';
import type { Visualizer } from './types';

/**
 * The list of visual modes. To add one: write a `createX(): Visualizer`
 * in its own file and add an entry here. The settings menu picks it up
 * automatically, and the id is validated against this list when loading.
 */
export const VISUALIZERS = [
  {
    id: 'spectrum',
    name: 'Frequency spectrum',
    description: 'Animated bars that bounce with the bass, mids and treble, with gradients, glow and smooth transitions.',
    create: createSpectrum,
  },
  {
    id: 'radial',
    name: 'Radial pulse',
    description: 'Spikes radiate from a pulsing ring, shaped by the frequencies in the music.',
    create: createRadial,
  },
  {
    id: 'waves',
    name: 'Fluid waves',
    description: 'Flowing ribbons and layered waveforms that respond to different frequency ranges.',
    create: createWaves,
  },
] as const satisfies readonly { id: string; name: string; description: string; create: () => Visualizer }[];

export type VisualizerId = (typeof VISUALIZERS)[number]['id'];

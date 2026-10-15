import { createRadial } from './radial';
import { createSpectrum } from './spectrum';
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
    description: 'A glowing ring that expands and contracts with the music.',
    create: createRadial,
  },
] as const satisfies readonly { id: string; name: string; description: string; create: () => Visualizer }[];

export type VisualizerId = (typeof VISUALIZERS)[number]['id'];

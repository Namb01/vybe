import type { SourceFactory } from '../types';
import { createFileSource } from './file';
import { createMicSource, createTabSource } from './streams';

export const micSource: SourceFactory = createMicSource;
export const tabSource: SourceFactory = createTabSource;
export const fileSource =
  (file: File): SourceFactory =>
  (ctx) =>
    createFileSource(ctx, file);
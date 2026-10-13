import { useSyncExternalStore } from 'react';
import { engine } from './AudioEngine';

export function useAudioEngine() {
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  return { engine, state };
}

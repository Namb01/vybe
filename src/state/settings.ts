import { useSyncExternalStore } from 'react';
import { ACCENT_IDS, type AccentId } from '../theme/accents';
import { VISUALIZERS, type VisualizerId } from '../visualizers';

export type ThemePref = 'dark' | 'light' | 'system';
export const THEME_OPTIONS: { id: ThemePref; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'System' },
];

export interface Settings {
  theme: ThemePref;
  accent: AccentId;
  visualizer: VisualizerId;
}

// Bump VERSION when the shape changes and add a migration in load().
const KEY = 'vybe:settings';
const VERSION = 1;
const DEFAULTS: Settings = { theme: 'dark', accent: 'neon', visualizer: 'spectrum' };

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || raw.version !== VERSION) return DEFAULTS;
    return {
      theme: THEME_OPTIONS.some((t) => t.id === raw.theme) ? raw.theme : DEFAULTS.theme,
      accent: (ACCENT_IDS as readonly string[]).includes(raw.accent) ? raw.accent : DEFAULTS.accent,
      visualizer: VISUALIZERS.some((v) => v.id === raw.visualizer) ? raw.visualizer : DEFAULTS.visualizer,
    };
  } catch {
    return DEFAULTS; // storage blocked or corrupted: fall back silently
  }
}

let settings = load();
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => settings;

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...settings }));
  } catch {
    /* private mode or quota: the change still applies for this session */
  }
  listeners.forEach((l) => l());
}

export const useSettings = () => useSyncExternalStore(subscribe, getSnapshot);

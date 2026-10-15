import { useSyncExternalStore } from 'react';
import type { ThemePref } from '../state/settings';

const QUERY = '(prefers-color-scheme: dark)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Turns "dark | light | system" into a concrete theme, following the OS live. */
export function useResolvedTheme(pref: ThemePref): 'dark' | 'light' {
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

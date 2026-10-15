export const ACCENT_IDS = ['neon', 'aqua', 'sunset', 'mint'] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

interface AccentDef {
  name: string;
  /** Bottom / darkest tone of the gradient. */
  base: string;
  /** Main hue. Also drives the UI accent color. */
  mid: string;
  /** Hot tip of the gradient (tall bars, highlights). */
  tip: string;
  /** Peak caps and contrasting highlights. */
  cap: string;
}

export const ACCENTS: Record<AccentId, AccentDef> = {
  neon: { name: 'Neon', base: '#7a3cff', mid: '#e94fd1', tip: '#ffc2f0', cap: '#5f86ff' },
  aqua: { name: 'Aqua', base: '#2a5bff', mid: '#19c6ff', tip: '#b8fff3', cap: '#7dffcf' },
  sunset: { name: 'Sunset', base: '#8a2bff', mid: '#ff4f7b', tip: '#ffd2a0', cap: '#ffb020' },
  mint: { name: 'Mint', base: '#0f9d7a', mid: '#3df0a0', tip: '#eaffb0', cap: '#d4ff3a' },
};

/** What visualizers actually draw with. */
export interface Palette {
  light: boolean;
  base: string;
  mid: string;
  tip: string;
  cap: string;
  /** 0 or 1. Glow reads as neon on dark backgrounds and as mud on light ones. */
  glow: number;
}

const INK = '#1b0f2e';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Blend `a` toward `b` by `t` (0–1). */
export function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

export function buildPalette(id: AccentId, light: boolean): Palette {
  const c = ACCENTS[id];
  if (!light) return { light: false, base: c.base, mid: c.mid, tip: c.tip, cap: c.cap, glow: 1 };
  // On a light page the pale tones disappear, so pull everything toward a deep ink.
  return {
    light: true,
    base: mix(c.base, INK, 0.1),
    mid: mix(c.mid, INK, 0.2),
    tip: mix(c.tip, INK, 0.5),
    cap: mix(c.cap, INK, 0.3),
    glow: 0,
  };
}

/** Color for buttons, focus rings and highlights in the interface. */
export function uiAccent(id: AccentId, light: boolean) {
  const mid = ACCENTS[id].mid;
  return light ? mix(mid, INK, 0.3) : mid;
}

import type { Visualizer } from './types';

const MAX_BARS = 256;
const BAR_PITCH = 14; // target px per bar (bar + gap); count scales with screen width

/** Mirrored frequency bars spanning the full screen. */
export function createBars(): Visualizer {
  const levels = new Float32Array(MAX_BARS);

  return {
    name: 'Bars',
    draw(ctx, w, h, f) {
      ctx.clearRect(0, 0, w, h);

      const barCount = Math.min(MAX_BARS, Math.max(24, Math.floor(w / BAR_PITCH)));
      const bins = f.frequency.length;
      const minBin = 2;
      const maxBin = Math.max(minBin + barCount, Math.floor(bins * 0.7));

      // Edge to edge: bars (and the gaps between them) fill the whole width.
      const barW = w / (barCount + 0.5 * (barCount - 1));
      const gap = barW * 0.5;
      const maxH = h * 0.48;

      const attack = 1 - Math.exp(-32 * f.dt);
      const release = 1 - Math.exp(-6 * f.dt);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#7de2d1');
      grad.addColorStop(1, '#8b7bff');
      ctx.fillStyle = grad;
      ctx.beginPath();

      for (let i = 0; i < barCount; i++) {
        let target: number;
        if (f.active) {
          // Log-spaced bins, so bass doesn't get one bar and treble get forty.
          const lo = Math.floor(minBin * (maxBin / minBin) ** (i / barCount));
          const hi = Math.max(lo + 1, Math.ceil(minBin * (maxBin / minBin) ** ((i + 1) / barCount)));
          let sum = 0;
          for (let b = lo; b < hi; b++) sum += f.frequency[b];
          target = Math.min(1, (sum / (hi - lo) / 255) * (0.8 + 0.5 * (i / barCount)));
        } else {
          const breath = f.reducedMotion ? 0 : 0.5 + 0.5 * Math.sin(f.time * 1.1 + i * 0.35);
          target = 0.02 + 0.03 * breath;
        }

        levels[i] += (target - levels[i]) * (target > levels[i] ? attack : release);

        const bh = Math.max(barW, levels[i] * maxH * 2);
        ctx.roundRect(i * (barW + gap), (h - bh) / 2, barW, bh, barW / 2);
      }
      ctx.fill();
    },
  };
}
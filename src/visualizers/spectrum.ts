import { rgba } from '../theme/accents';
import { SpectrumBands } from './audio';
import type { Visualizer } from './types';

const MAX_BARS = 256;
const BAR_PITCH = 12; // target px per bar (bar + gap); the count scales with screen width
const GAP = 0.6; // gap width as a fraction of bar width

/**
 * Neon frequency bars standing on a glowing baseline, with a fading
 * reflection below and falling peak caps on top.
 */
export function createSpectrum(): Visualizer {
  const levels = new Float32Array(MAX_BARS);
  const peaks = new Float32Array(MAX_BARS);
  const heights = new Float32Array(MAX_BARS);
  const targets = new Float32Array(MAX_BARS);
  const mapper = new SpectrumBands();
  let energy = 0;

  return {
    draw(ctx, w, h, f) {
      ctx.clearRect(0, 0, w, h);
      const p = f.palette;

      const n = Math.min(MAX_BARS, Math.max(24, Math.floor(w / BAR_PITCH)));

      // Bars (and the gaps between them) fill the screen edge to edge.
      const barW = w / (n + GAP * (n - 1));
      const step = barW * (1 + GAP);
      const baseY = Math.round(h * 0.56);
      const maxH = h * 0.46;
      const reflH = h * 0.2;
      const radius = Math.min(barW / 2, 3);

      const attack = 1 - Math.exp(-40 * f.dt);
      const release = 1 - Math.exp(-9 * f.dt);
      let total = 0;

      if (f.active) mapper.read(targets, n, f.frequency, f.sampleRate, f.dt);

      for (let i = 0; i < n; i++) {
        let target: number;
        if (f.active) {
          target = targets[i];
        } else {
          const breath = f.reducedMotion ? 0 : 0.5 + 0.5 * Math.sin(f.time * 1.1 + i * 0.35);
          target = 0.02 + 0.03 * breath;
        }

        levels[i] += (target - levels[i]) * (target > levels[i] ? attack : release);
        peaks[i] = Math.max(levels[i], peaks[i] - 0.45 * f.dt);
        heights[i] = Math.max(barW, levels[i] * maxH);
        total += levels[i];
      }
      energy += (total / n - energy) * (1 - Math.exp(-4 * f.dt));

      // Soft bloom rising from the baseline, brighter with the overall level.
      const bloom = ctx.createLinearGradient(0, baseY - maxH, 0, baseY);
      bloom.addColorStop(0, rgba(p.mid, 0));
      bloom.addColorStop(1, rgba(p.mid, p.light ? 0.05 + energy * 0.1 : 0.08 + energy * 0.24));
      ctx.fillStyle = bloom;
      ctx.fillRect(0, baseY - maxH, w, maxH);

      // Reflection: shorter than the bars and fading out.
      const refl = ctx.createLinearGradient(0, baseY, 0, baseY + reflH);
      refl.addColorStop(0, rgba(p.mid, p.light ? 0.26 : 0.3));
      refl.addColorStop(1, rgba(p.base, 0));
      ctx.fillStyle = refl;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.rect(i * step, baseY + 4, barW, Math.min(heights[i] * 0.5, reflH));
      }
      ctx.fill();

      // Bars. The gradient is shared, so taller bars reach the hot tip color.
      const grad = ctx.createLinearGradient(0, baseY, 0, baseY - maxH);
      grad.addColorStop(0, p.base);
      grad.addColorStop(0.55, p.mid);
      grad.addColorStop(1, p.tip);
      ctx.fillStyle = grad;
      if (p.glow) {
        ctx.shadowColor = rgba(p.mid, 0.75);
        ctx.shadowBlur = 16 * f.dpr;
      }
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.roundRect(i * step, baseY - heights[i], barW, heights[i], radius);
      }
      ctx.fill();

      // Peak caps that hang above the bars and fall slowly.
      ctx.fillStyle = p.cap;
      if (p.glow) {
        ctx.shadowColor = rgba(p.cap, 0.8);
        ctx.shadowBlur = 10 * f.dpr;
      }
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ph = peaks[i] * maxH;
        if (ph > heights[i] + 4) ctx.roundRect(i * step, baseY - ph - 6, barW, 3, 1.5);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Baseline, fading out toward both edges.
      const line = ctx.createLinearGradient(0, 0, w, 0);
      line.addColorStop(0, rgba(p.base, 0));
      line.addColorStop(0.1, p.base);
      line.addColorStop(0.5, p.mid);
      line.addColorStop(0.9, p.base);
      line.addColorStop(1, rgba(p.base, 0));
      ctx.fillStyle = line;
      if (p.glow) {
        ctx.shadowColor = rgba(p.mid, 0.9);
        ctx.shadowBlur = 12 * f.dpr;
      }
      ctx.fillRect(0, baseY, w, 2);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    },
  };
}

import { rgba } from '../theme/accents';
import type { Visualizer } from './types';

const POINTS = 192; // vertices around the ring
const SMOOTH = 6; // waveform samples averaged each side of a vertex
const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A glowing ring. The bass makes it swell and shrink, the live waveform
 * ripples along its edge, and each beat sends a faint echo ring outward.
 */
export function createRadial(): Visualizer {
  const disp = new Float32Array(POINTS);
  const xs = new Float32Array(POINTS);
  const ys = new Float32Array(POINTS);
  const echoes: { grow: number; alpha: number }[] = [];

  let bass = 0; // smoothed 0–1 envelopes
  let mid = 0;
  let bassAvg = 0; // slow average, for beat detection
  let cooldown = 0;
  let spin = 0;

  return {
    draw(ctx, w, h, f) {
      ctx.clearRect(0, 0, w, h);
      const p = f.palette;
      const cx = w / 2;
      const cy = h * 0.47;
      const base = Math.min(w, h) * 0.23;
      const still = f.reducedMotion;

      // Envelopes: fast attack, slow release, so the ring snaps out and eases back.
      const bassTarget = f.active ? clamp01((f.bands.bass - 0.3) / 0.6) : 0;
      const midTarget = f.active ? clamp01((f.bands.mid - 0.2) / 0.5) : 0;
      bass += (bassTarget - bass) * (1 - Math.exp(-(bassTarget > bass ? 24 : 5) * f.dt));
      mid += (midTarget - mid) * (1 - Math.exp(-(midTarget > mid ? 18 : 6) * f.dt));

      // Beat: bass jumping clearly above its recent average.
      bassAvg += (f.bands.bass - bassAvg) * (1 - Math.exp(-2 * f.dt));
      cooldown -= f.dt;
      if (f.active && !still && cooldown <= 0 && f.bands.bass > 0.45 && f.bands.bass > bassAvg * 1.2) {
        echoes.push({ grow: 0, alpha: 0.5 });
        if (echoes.length > 6) echoes.shift();
        cooldown = 0.25;
      }

      const breath = still || f.active ? 0 : Math.sin(f.time * 0.9);
      const R = base * (1 + 0.3 * bass + 0.035 * breath);
      const amp = base * (0.55 + 0.35 * bass);
      if (!still) spin += f.dt * 0.3;

      // Waveform → ring. Mirrored left/right so the ends meet without a seam.
      const wave = f.waveform;
      const half = wave.length / 2;
      const follow = 1 - Math.exp(-28 * f.dt);
      for (let j = 0; j < POINTS; j++) {
        const u = j / POINTS;
        const m = u < 0.5 ? u * 2 : (1 - u) * 2;
        let target: number;
        if (f.active && wave.length) {
          const c = Math.floor(m * half);
          let sum = 0;
          let count = 0;
          for (let k = -SMOOTH; k <= SMOOTH; k++) {
            const idx = c + k;
            if (idx >= 0 && idx < wave.length) {
              sum += wave[idx];
              count++;
            }
          }
          target = (sum / count - 128) / 128;
        } else {
          target = still ? 0 : 0.06 * Math.sin(u * TAU * 5 + f.time * 0.6);
        }
        disp[j] += (target - disp[j]) * follow;

        const angle = u * TAU - Math.PI / 2;
        const r = R + disp[j] * amp;
        xs[j] = cx + Math.cos(angle) * r;
        ys[j] = cy + Math.sin(angle) * r;
      }

      // Bloom behind the ring.
      const bloom = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
      bloom.addColorStop(0, rgba(p.mid, p.light ? 0.05 + bass * 0.1 : 0.1 + bass * 0.2));
      bloom.addColorStop(1, rgba(p.mid, 0));
      ctx.fillStyle = bloom;
      ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);

      // Echoes expanding away from the ring.
      ctx.lineWidth = 1.5;
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i];
        e.grow += base * 1.0 * f.dt;
        e.alpha -= 0.6 * f.dt;
        if (e.alpha <= 0) {
          echoes.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = rgba(p.mid, e.alpha);
        ctx.beginPath();
        ctx.arc(cx, cy, R + e.grow, 0, TAU);
        ctx.stroke();
      }

      // Thin inner ring, nudged by the mids.
      ctx.strokeStyle = rgba(p.tip, 0.3 + 0.3 * mid);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.8 * (1 - 0.05 * bass), 0, TAU);
      ctx.stroke();

      // Main ring: a smooth closed curve through the vertices.
      ctx.beginPath();
      ctx.moveTo((xs[POINTS - 1] + xs[0]) / 2, (ys[POINTS - 1] + ys[0]) / 2);
      for (let j = 0; j < POINTS; j++) {
        const nx = (j + 1) % POINTS;
        ctx.quadraticCurveTo(xs[j], ys[j], (xs[j] + xs[nx]) / 2, (ys[j] + ys[nx]) / 2);
      }
      ctx.closePath();

      if (typeof ctx.createConicGradient === 'function') {
        const g = ctx.createConicGradient(spin, cx, cy);
        g.addColorStop(0, p.mid);
        g.addColorStop(0.33, p.base);
        g.addColorStop(0.66, p.cap);
        g.addColorStop(1, p.mid);
        ctx.strokeStyle = g;
      } else {
        ctx.strokeStyle = p.mid;
      }
      ctx.lineWidth = 2.5 + 2 * bass;
      ctx.lineJoin = 'round';
      if (p.glow) {
        ctx.shadowColor = rgba(p.mid, 0.85);
        ctx.shadowBlur = (14 + 22 * bass) * f.dpr;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    },
  };
}

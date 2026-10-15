import { rgba } from '../theme/accents';
import type { Visualizer } from './types';

const MAX_SPIKES = 180;
const SPIKE_PITCH = 9; // target px between spikes along the ring
const WAVE_POINTS = 160; // vertices on the inner waveform ring
const WAVE_SMOOTH = 6; // waveform samples averaged each side of a vertex
const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Spikes radiate from a pulsing ring, each one driven by a slice of the
 * frequency spectrum (bass at the bottom, treble at the top, mirrored left
 * and right). A thin inner ring traces the live waveform, and every beat
 * sends an echo ring outward.
 */
export function createRadial(): Visualizer {
  const levels = new Float32Array(MAX_SPIKES);
  const disp = new Float32Array(WAVE_POINTS);
  const wx = new Float32Array(WAVE_POINTS);
  const wy = new Float32Array(WAVE_POINTS);
  const echoes: { grow: number; alpha: number }[] = [];

  let bass = 0; // smoothed 0–1 envelope
  let bassAvg = 0; // slow average, for beat detection
  let cooldown = 0;
  let spin = 0;

  return {
    draw(ctx, w, h, f) {
      ctx.clearRect(0, 0, w, h);
      const p = f.palette;
      const cx = w / 2;
      const cy = h * 0.47;
      const base = Math.min(w, h) * 0.2;
      const still = f.reducedMotion;

      // Bass envelope: fast attack, slow release, so the ring snaps out and eases back.
      const bassTarget = f.active ? clamp01((f.bands.bass - 0.3) / 0.6) : 0;
      bass += (bassTarget - bass) * (1 - Math.exp(-(bassTarget > bass ? 24 : 5) * f.dt));

      // Beat: bass jumping clearly above its recent average.
      bassAvg += (f.bands.bass - bassAvg) * (1 - Math.exp(-2 * f.dt));
      cooldown -= f.dt;
      if (f.active && !still && cooldown <= 0 && f.bands.bass > 0.45 && f.bands.bass > bassAvg * 1.2) {
        echoes.push({ grow: 0, alpha: 0.4 });
        if (echoes.length > 6) echoes.shift();
        cooldown = 0.25;
      }

      const breath = still || f.active ? 0 : Math.sin(f.time * 0.9);
      const R = base * (1 + 0.12 * bass + 0.03 * breath);
      const maxLen = base * 0.95;
      if (!still) spin += f.dt * 0.3;

      // ---- Spike levels from the spectrum ----
      const n = Math.min(MAX_SPIKES, Math.max(48, Math.floor((TAU * R) / SPIKE_PITCH)));
      const half = n / 2;
      const bins = f.frequency.length;
      const minBin = 2;
      const maxBin = Math.max(minBin + half, Math.floor(bins * 0.7));
      const attack = 1 - Math.exp(-34 * f.dt);
      const release = 1 - Math.exp(-7 * f.dt);

      for (let i = 0; i < n; i++) {
        // Mirror so the left and right halves match: index 0 sits at the bottom
        // (lowest frequencies) and the top of the ring holds the highest.
        const k = i <= half ? i : n - i;
        const pos = k / half;
        let target: number;
        if (f.active) {
          const lo = Math.floor(minBin * (maxBin / minBin) ** pos);
          const hi = Math.max(lo + 1, Math.ceil(minBin * (maxBin / minBin) ** ((k + 1) / half)));
          let sum = 0;
          for (let b = lo; b < hi; b++) sum += f.frequency[b];
          const raw = (sum / (hi - lo) / 255) * (0.8 + 0.5 * pos);
          // Cut the floor and curve upward so quiet bands stay short and loud ones spike.
          target = clamp01((raw - 0.12) / 0.88) ** 1.4;
        } else {
          target = still ? 0.02 : 0.025 + 0.03 * (0.5 + 0.5 * Math.sin(f.time * 1.1 + pos * 12));
        }
        levels[i] += (target - levels[i]) * (target > levels[i] ? attack : release);
      }

      // ---- Waveform ring points (inner) ----
      const wave = f.waveform;
      const wHalf = wave.length / 2;
      const follow = 1 - Math.exp(-28 * f.dt);
      const waveR = R * 0.78;
      const waveAmp = base * 0.14;
      for (let j = 0; j < WAVE_POINTS; j++) {
        const u = j / WAVE_POINTS;
        const m = u < 0.5 ? u * 2 : (1 - u) * 2; // mirrored so the ends meet without a seam
        let target: number;
        if (f.active && wave.length) {
          const c = Math.floor(m * wHalf);
          let sum = 0;
          let count = 0;
          for (let k = -WAVE_SMOOTH; k <= WAVE_SMOOTH; k++) {
            const idx = c + k;
            if (idx >= 0 && idx < wave.length) {
              sum += wave[idx];
              count++;
            }
          }
          target = (sum / count - 128) / 128;
        } else {
          target = still ? 0 : 0.08 * Math.sin(u * TAU * 5 + f.time * 0.6);
        }
        disp[j] += (target - disp[j]) * follow;
        const angle = u * TAU - Math.PI / 2;
        const r = waveR + disp[j] * waveAmp * 2;
        wx[j] = cx + Math.cos(angle) * r;
        wy[j] = cy + Math.sin(angle) * r;
      }

      // ---- Bloom behind everything ----
      const bloom = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.2);
      bloom.addColorStop(0, rgba(p.mid, p.light ? 0.05 + bass * 0.09 : 0.1 + bass * 0.2));
      bloom.addColorStop(1, rgba(p.mid, 0));
      ctx.fillStyle = bloom;
      ctx.fillRect(cx - R * 2.3, cy - R * 2.3, R * 4.6, R * 4.6);

      // ---- Beat echoes ----
      ctx.lineWidth = 1.5;
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i];
        e.grow += base * 1.1 * f.dt;
        e.alpha -= 0.5 * f.dt;
        if (e.alpha <= 0) {
          echoes.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = rgba(p.mid, e.alpha);
        ctx.beginPath();
        ctx.arc(cx, cy, R + maxLen * 0.4 + e.grow, 0, TAU);
        ctx.stroke();
      }

      // ---- Spikes ----
      // One radial gradient shared by every spike: base color at the ring,
      // hot tip color at full length, so taller spikes burn brighter.
      const grad = ctx.createRadialGradient(cx, cy, R, cx, cy, R + maxLen);
      grad.addColorStop(0, p.base);
      grad.addColorStop(0.45, p.mid);
      grad.addColorStop(1, p.tip);
      ctx.strokeStyle = grad;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.min(5, Math.max(2, ((TAU * R) / n) * 0.42));
      if (p.glow) {
        ctx.shadowColor = rgba(p.mid, 0.8);
        ctx.shadowBlur = (10 + 10 * bass) * f.dpr;
      }
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = Math.PI / 2 + (i / n) * TAU; // starts at the bottom
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const len = 2 + levels[i] * maxLen;
        ctx.moveTo(cx + cos * R, cy + sin * R);
        ctx.lineTo(cx + cos * (R + len), cy + sin * (R + len));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // ---- Core ring, pulsing with the bass ----
      ctx.strokeStyle = rgba(p.mid, 0.9);
      ctx.lineWidth = 2 + 1.5 * bass;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 4, 0, TAU);
      ctx.stroke();

      // ---- Inner waveform ring ----
      ctx.beginPath();
      ctx.moveTo((wx[WAVE_POINTS - 1] + wx[0]) / 2, (wy[WAVE_POINTS - 1] + wy[0]) / 2);
      for (let j = 0; j < WAVE_POINTS; j++) {
        const nx = (j + 1) % WAVE_POINTS;
        ctx.quadraticCurveTo(wx[j], wy[j], (wx[j] + wx[nx]) / 2, (wy[j] + wy[nx]) / 2);
      }
      ctx.closePath();
      if (typeof ctx.createConicGradient === 'function') {
        const g = ctx.createConicGradient(spin, cx, cy);
        g.addColorStop(0, p.tip);
        g.addColorStop(0.33, p.mid);
        g.addColorStop(0.66, p.cap);
        g.addColorStop(1, p.tip);
        ctx.strokeStyle = g;
      } else {
        ctx.strokeStyle = p.tip;
      }
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke();
    },
  };
}
import { rgba } from '../theme/accents';
import { SpectrumBands } from './audio';
import type { Visualizer } from './types';

const TAU = Math.PI * 2;
const BANDS = 6;

// One wave per frequency range, bass first. Low ranges make big swells,
// high ranges add finer ripples on top.
const WEIGHTS = [1, 0.8, 0.58, 0.38, 0.24, 0.15]; // how much each range moves the strands
const CYCLES = [0.7, 1.2, 1.9, 2.9, 4.2, 6]; // wave cycles across the screen width
// Radians per second. Two ranges travel the opposite way, so waves pass through
// each other like ripples on water instead of sliding as one rigid shape.
const SPEEDS = [1.5, 2.2, -2.0, 3.9, -2.8, 5.9];

// Springs for each range's level. Underdamped on purpose: strands overshoot
// and wobble back when the music hits, instead of just easing to a value.
const SPRING = 140;
const DAMPING = 12;

interface Ribbon {
  /** -1 = far, 0 = in focus, +1 = near. Drives size, speed, softness and position. */
  depth: number;
  strands: number;
  /** Stroke width in px for a sharp strand, or the full soft width when defocused. */
  width: number;
  alpha: number;
  seed: number;
}

// Drawn back to front. Far and near ribbons are wide and soft, like depth of
// field; the middle ones are thin and sharp.
const RIBBONS: Ribbon[] = [
  { depth: -1, strands: 3, width: 46, alpha: 0.3, seed: 1.7 },
  { depth: -0.5, strands: 5, width: 3.4, alpha: 0.55, seed: 4.1 },
  { depth: 0, strands: 7, width: 1.5, alpha: 0.95, seed: 7.3 },
  { depth: 0.55, strands: 4, width: 2.6, alpha: 0.65, seed: 2.9 },
  { depth: 1.1, strands: 3, width: 56, alpha: 0.28, seed: 5.5 },
];

interface Pulse {
  /** Position along the screen, 0 = left edge, 1 = right edge. */
  at: number;
  strength: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Bundles of glowing strands that braid together and fan apart as they flow
 * across the screen. Each strand's shape is the sum of six waves, one per
 * frequency range. Several things keep it from looking rigid:
 *
 * - levels follow springs, so strands snap and rebound with the music
 * - the wave positions are warped, so wavelengths stretch and squeeze
 * - each strand drifts on its own slow cycle, so bundles keep re-braiding
 * - whole ribbons sway and tilt
 * - every beat launches a ripple that travels along the ribbons
 */
export function createWaves(): Visualizer {
  const raw = new Float32Array(BANDS);
  const levels = new Float32Array(BANDS);
  const vel = new Float32Array(BANDS);
  const mapper = new SpectrumBands();
  const xs = new Float32Array(256);
  const ys = new Float32Array(256);
  const pulses: Pulse[] = [];

  let energy = 0; // smoothed low-end level, for pulsing size and speed
  let flow = 0; // accumulated travel; speeds up when the music is loud
  let bassAvg = 0; // slow average, for beat detection
  let cooldown = 0;

  return {
    draw(ctx, w, h, f) {
      ctx.clearRect(0, 0, w, h);
      const p = f.palette;
      const still = f.reducedMotion;

      // ---- Levels, driven through springs ----
      if (f.active) mapper.read(raw, BANDS, f.frequency, f.sampleRate, f.dt);
      for (let b = 0; b < BANDS; b++) {
        const target = f.active ? raw[b] : still ? 0.12 : 0.24 + 0.12 * Math.sin(f.time * 0.9 + b * 1.3);
        vel[b] += ((target - levels[b]) * SPRING - vel[b] * DAMPING) * f.dt;
        levels[b] = Math.min(1.4, Math.max(0, levels[b] + vel[b] * f.dt));
      }
      energy += ((levels[0] + levels[1]) / 2 - energy) * (1 - Math.exp(-6 * f.dt));
      if (!still) flow += f.dt * (0.9 + 1.6 * energy);

      // ---- Beats launch a ripple from the left that travels across ----
      bassAvg += (f.bands.bass - bassAvg) * (1 - Math.exp(-2 * f.dt));
      cooldown -= f.dt;
      if (f.active && !still && cooldown <= 0 && f.bands.bass > 0.45 && f.bands.bass > bassAvg * 1.2) {
        pulses.push({ at: -0.15, strength: 0.5 + clamp01((f.bands.bass - 0.45) * 3) });
        if (pulses.length > 4) pulses.shift();
        cooldown = 0.3;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].at += f.dt * 0.6;
        if (pulses[i].at > 1.3) pulses.splice(i, 1);
      }

      // ---- Geometry shared by every strand ----
      const amp = h * 0.22 * (1 + 0.3 * energy);
      const cy = h * 0.46;
      const step = Math.min(16, Math.max(8, w / 90));
      const margin = step * 2;
      const count = Math.min(256, Math.ceil((w + margin * 2) / step) + 1);
      const colors = [p.mid, p.cap, p.base, p.tip];
      const brighten = 0.85 + 0.35 * energy;

      // On dark backgrounds light adds up where strands cross, which gives the
      // bright knots. On light backgrounds plain layering reads better.
      ctx.globalCompositeOperation = p.light ? 'source-over' : 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let r = 0; r < RIBBONS.length; r++) {
        const ribbon = RIBBONS[r];
        const d = ribbon.depth;
        const scale = 1 + 0.32 * d; // nearer ribbons are bigger
        const speed = 1 + 0.45 * d; // and travel faster
        const seed = ribbon.seed;
        const soft = Math.abs(d) > 0.8; // far and near ribbons are out of focus

        // The whole ribbon sways up and down and tilts slowly.
        const rowY = cy + d * h * 0.06 + Math.sin(flow * 0.35 + seed) * h * 0.035 * scale;
        const tilt = Math.sin(flow * 0.22 + seed * 1.3) * h * 0.09 * scale;

        for (let s = 0; s < ribbon.strands; s++) {
          const sc = s - (ribbon.strands - 1) / 2; // -n..+n around the ribbon's center

          for (let i = 0; i < count; i++) {
            const x = i * step - margin;
            const u = x / w;

            // Warp the position along the screen: wavelengths stretch and squeeze
            // over time, and differently for each strand.
            const uw =
              u + 0.06 * Math.sin(TAU * 1.3 * u - flow * 0.8 + seed * 2) + 0.02 * Math.sin(TAU * 2.9 * u + flow * 1.3 + sc * 0.9);

            let sum = 0;
            for (let b = 0; b < BANDS; b++) {
              // Strands share the big swells but drift apart in the finer detail,
              // and each wanders on its own slow cycle.
              const phase =
                TAU * CYCLES[b] * uw * (1 + 0.03 * sc) -
                SPEEDS[b] * flow * speed +
                seed * (b + 1) +
                sc * 0.07 * (1 + b * 0.5) +
                0.7 * Math.sin(flow * 0.6 + seed + sc * 1.9 + b * 0.7);
              sum += WEIGHTS[b] * levels[b] * Math.sin(phase);
            }

            // Beat ripples: a short wave packet travelling along the ribbon.
            for (let k = 0; k < pulses.length; k++) {
              const q = (u - pulses[k].at) / 0.13;
              sum += pulses[k].strength * 0.6 * Math.exp(-q * q) * Math.cos(q * 5 + sc * 0.35);
            }

            // The right side is "closer", so waves grow toward it.
            const taper = 0.75 + 0.5 * clamp01(u);
            // The bundle opens and pinches along its length.
            const spread = (4 + 20 * (0.5 + 0.5 * Math.sin(TAU * 1.1 * u + flow * 0.7 + seed))) * scale;

            xs[i] = x;
            ys[i] = rowY + tilt * (u - 0.5) + Math.tanh(sum) * amp * scale * taper + sc * spread;
          }

          // Smooth curve through the sampled points.
          ctx.beginPath();
          ctx.moveTo(xs[0], ys[0]);
          for (let i = 1; i < count - 1; i++) {
            ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
          }
          ctx.lineTo(xs[count - 1], ys[count - 1]);

          const color = colors[(s + r) % colors.length];
          const a = ribbon.alpha * brighten;
          if (soft) {
            // Fake a blur with stacked strokes: wide and faint, then narrower and stronger.
            ctx.strokeStyle = rgba(color, a * 0.22);
            ctx.lineWidth = ribbon.width;
            ctx.stroke();
            ctx.strokeStyle = rgba(color, a * 0.38);
            ctx.lineWidth = ribbon.width * 0.5;
            ctx.stroke();
            ctx.strokeStyle = rgba(color, a * 0.5);
            ctx.lineWidth = ribbon.width * 0.2;
            ctx.stroke();
          } else {
            if (!p.light) {
              ctx.strokeStyle = rgba(color, a * 0.14); // glow
              ctx.lineWidth = ribbon.width * 5;
              ctx.stroke();
            }
            ctx.strokeStyle = rgba(color, a);
            ctx.lineWidth = ribbon.width;
            ctx.stroke();
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
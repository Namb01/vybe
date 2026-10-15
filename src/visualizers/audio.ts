/** Average magnitude (0–1) of the frequency bins between two frequencies. */
export function bandEnergy(freq: Uint8Array, sampleRate: number, loHz: number, hiHz: number) {
  const hzPerBin = sampleRate / 2 / freq.length;
  const lo = Math.max(0, Math.floor(loHz / hzPerBin));
  const hi = Math.min(freq.length, Math.max(lo + 1, Math.ceil(hiHz / hzPerBin)));
  let sum = 0;
  for (let i = lo; i < hi; i++) sum += freq[i];
  return sum / (hi - lo) / 255;
}

// MAX_HZ: lower it if the right side feels dead, since most music has little energy up there.
// FLOOR: raise it if quiet bars still look busy, lower it if too much disappears.
// GAMMA: higher makes peaks pickier and spikier, and 1 is linear.

const MIN_HZ = 40;
const MAX_HZ = 10000;
const FLOOR = 0.2; // levels below this are cut to zero, so quiet bands stay low
const GAMMA = 1.7; // >1 pushes mid levels down so loud bands stand out

const mel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const invMel = (m: number) => 700 * (10 ** (m / 2595) - 1);

/**
 * Turns the raw analyser spectrum into `count` bar levels (0-1, low to high).
 *
 * - Bars are spaced on the mel scale. A plain log scale gives the lowest bars
 *   less than one FFT bin each, so many of them read identical values and
 *   look "meshed together". Mel keeps bass bars distinct and still gives the
 *   treble a fair share of the screen.
 * - Auto-gain tracks the loudest recent band and scales to it, so quiet and
 *   loud tracks both use the full height instead of clipping flat.
 * - A floor and a power curve add contrast between neighbouring bars.
 *
 * Each visualizer keeps its own instance, because the gain is stateful.
 */
export class SpectrumBands {
  private peak = 0.5;

  read(out: Float32Array, count: number, freq: Uint8Array, sampleRate: number, dt: number) {
    const len = freq.length;
    const hzPerBin = sampleRate / 2 / len;
    const melLo = mel(MIN_HZ);
    const melHi = mel(Math.min(MAX_HZ, sampleRate * 0.45));
    let frameMax = 0;

    for (let i = 0; i < count; i++) {
      const b0 = invMel(melLo + ((melHi - melLo) * i) / count) / hzPerBin;
      const b1 = invMel(melLo + ((melHi - melLo) * (i + 1)) / count) / hzPerBin;

      let v: number;
      if (b1 - b0 < 1.5) {
        // Narrower than a bin: interpolate between neighbours for a smooth curve.
        const c = (b0 + b1) / 2;
        const a = Math.min(len - 2, Math.floor(c));
        const t = c - a;
        v = freq[a] * (1 - t) + freq[a + 1] * t;
      } else {
        // Wide range: blend the peak with the average. Pure averaging smears
        // sharp peaks into a flat plateau.
        const a = Math.floor(b0);
        const b = Math.min(len, Math.ceil(b1));
        let sum = 0;
        let max = 0;
        for (let k = a; k < b; k++) {
          const x = freq[k];
          sum += x;
          if (x > max) max = x;
        }
        v = 0.5 * max + (0.5 * sum) / (b - a);
      }

      // Music loses roughly 3 dB per octave, so lift the highs to match.
      const pos = count > 1 ? i / (count - 1) : 0;
      v = (v / 255) * (0.75 + 0.75 * pos);
      out[i] = v;
      if (v > frameMax) frameMax = v;
    }

    // Auto-gain: jump up instantly on loud moments, drift back down slowly.
    this.peak = Math.max(frameMax, this.peak - 0.12 * dt);
    const scale = 0.95 / Math.max(this.peak, 0.4);
    for (let i = 0; i < count; i++) {
      const x = Math.min(1, out[i] * scale);
      out[i] = Math.max(0, (x - FLOOR) / (1 - FLOOR)) ** GAMMA;
    }
  }
}

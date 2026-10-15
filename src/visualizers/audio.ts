/** Average magnitude (0–1) of the frequency bins between two frequencies. */
export function bandEnergy(freq: Uint8Array, sampleRate: number, loHz: number, hiHz: number) {
  const hzPerBin = sampleRate / 2 / freq.length;
  const lo = Math.max(0, Math.floor(loHz / hzPerBin));
  const hi = Math.min(freq.length, Math.max(lo + 1, Math.ceil(hiHz / hzPerBin)));
  let sum = 0;
  for (let i = lo; i < hi; i++) sum += freq[i];
  return sum / (hi - lo) / 255;
}

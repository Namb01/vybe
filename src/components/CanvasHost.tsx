import { useEffect, useRef } from 'react';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Palette } from '../theme/accents';
import { bandEnergy } from '../visualizers/audio';
import type { FrameData, Visualizer } from '../visualizers/types';

interface Props {
  engine: AudioEngine;
  visualizer: Visualizer;
  palette: Palette;
}

/**
 * Runs the render loop outside React: no setState at 60fps.
 * Reads the analyser directly and hands the data to the active visualizer.
 */
export function CanvasHost({ engine, visualizer, palette }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The loop reads the palette from a ref, so changing colors doesn't restart it.
  const paletteRef = useRef(palette);
  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // One frame object, mutated each tick, so the loop doesn't allocate.
    const frame: FrameData = {
      frequency: engine.frequency,
      waveform: engine.waveform,
      bands: { bass: 0, mid: 0, treble: 0 },
      sampleRate: 48000,
      time: 0,
      dt: 0,
      active: false,
      reducedMotion: motion.matches,
      dpr,
      palette: paletteRef.current,
    };

    const start = performance.now();
    let last = start;
    let raf = 0;
    const loop = (now: number) => {
      frame.dt = Math.min((now - last) / 1000, 0.1);
      frame.time = (now - start) / 1000;
      last = now;

      frame.active = engine.read();
      frame.frequency = engine.frequency; // may be swapped if fftSize changes
      frame.waveform = engine.waveform;
      frame.sampleRate = engine.sampleRate;
      if (frame.active) {
        frame.bands.bass = bandEnergy(frame.frequency, frame.sampleRate, 20, 250);
        frame.bands.mid = bandEnergy(frame.frequency, frame.sampleRate, 250, 4000);
        frame.bands.treble = bandEnergy(frame.frequency, frame.sampleRate, 4000, 16000);
      } else {
        frame.bands.bass = frame.bands.mid = frame.bands.treble = 0;
      }
      frame.reducedMotion = motion.matches;
      frame.dpr = dpr;
      frame.palette = paletteRef.current;

      visualizer.draw(ctx, w, h, frame);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [engine, visualizer]);

  return <canvas ref={canvasRef} className="stage" aria-hidden="true" />;
}

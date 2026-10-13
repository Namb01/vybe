import { useEffect, useRef } from 'react';
import type { AudioEngine } from '../audio/AudioEngine';
import type { FrameData, Visualizer } from '../visualizers/types';

interface Props {
  engine: AudioEngine;
  visualizer: Visualizer;
}

/**
 * Runs the render loop outside React: no setState at 60fps.
 * Reads the analyser directly and hands the data to the active visualizer.
 */
export function CanvasHost({ engine, visualizer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      time: 0,
      dt: 0,
      active: false,
      reducedMotion: motion.matches,
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
      frame.reducedMotion = motion.matches;
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

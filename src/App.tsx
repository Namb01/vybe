import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAudioEngine } from './audio/useAudioEngine';
import { fileSource, micSource, tabSource } from './audio/sources';
import { AudioSourceError, type SourceFactory } from './audio/types';
import { CanvasHost } from './components/CanvasHost';
import { Controls } from './components/Controls';
import { useIdle } from './hooks/useIdle';
import { createBars } from './visualizers/bars';

export default function App() {
  const { engine, state } = useAudioEngine();
  const visualizer = useMemo(() => createBars(), []);
  const idle = useIdle(3000);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const run = async (factory: SourceFactory) => {
    setError(null);
    try {
      await engine.setSource(factory);
    } catch (err) {
      setError(err instanceof AudioSourceError ? err.message : 'Something went wrong starting that source.');
    }
  };

  // Controls fade away while the music plays, but stay put on the empty state.
  const hideControls = idle && state.kind !== null && state.playing;
  useEffect(() => {
    document.body.classList.toggle('idle', hideControls);
  }, [hideControls]);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  // Drop an audio file anywhere on the page.
  useEffect(() => {
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) void run(fileSource(file));
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space toggles playback, unless a button or slider has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.code !== 'Space' || target?.closest('button, input')) return;
      e.preventDefault();
      void engine.toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  return (
    <>
      <CanvasHost engine={engine} visualizer={visualizer} />

      <div className="dock">
        <motion.div
          className="dock-inner"
          animate={{ opacity: hideControls ? 0 : 1, y: hideControls ? 12 : 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ pointerEvents: hideControls ? 'none' : 'auto' }}
        >
          <Controls
            state={state}
            onPick={(kind) => run(kind === 'mic' ? micSource : tabSource)}
            onFile={(file) => run(fileSource(file))}
            onToggle={() => void engine.toggle()}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            className="toast"
            role="alert"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {error}
          </motion.div>
        )}
        {dragging && (
          <motion.div
            key="drop"
            className="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Drop to play
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

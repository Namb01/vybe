import { useEffect, useState } from 'react';
 
/** True after `ms` without real pointer, touch, or keyboard activity. */
export function useIdle(ms: number) {
  const [idle, setIdle] = useState(false);
 
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
 
    // Browsers sometimes fire pointermove without the mouse moving (after a
    // layout change, or a hover state update). Those would keep resetting the
    // timer forever, so only count movement of a few pixels.
    let lastX = NaN;
    let lastY = NaN;
    const onMove = (e: PointerEvent) => {
      if (Math.abs(e.clientX - lastX) < 3 && Math.abs(e.clientY - lastY) < 3) return;
      lastX = e.clientX;
      lastY = e.clientY;
      wake();
    };
 
    window.addEventListener('pointermove', onMove, { passive: true });
    const others = ['pointerdown', 'keydown', 'touchstart'] as const;
    others.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      others.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [ms]);
 
  return idle;
}
 
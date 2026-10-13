import { useEffect, useState } from 'react';

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export function Scrubber({ media }: { media: HTMLAudioElement }) {
  const [time, setTime] = useState(media.currentTime);
  const [duration, setDuration] = useState(media.duration);

  useEffect(() => {
    const sync = () => {
      setTime(media.currentTime);
      setDuration(media.duration);
    };
    sync();
    media.addEventListener('timeupdate', sync);
    media.addEventListener('loadedmetadata', sync);
    return () => {
      media.removeEventListener('timeupdate', sync);
      media.removeEventListener('loadedmetadata', sync);
    };
  }, [media]);

  const progress = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="scrubber">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={time}
        aria-label="Seek"
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
        onChange={(e) => (media.currentTime = Number(e.target.value))}
      />
      <span className="time">
        {fmt(time)} / {fmt(duration)}
      </span>
    </div>
  );
}

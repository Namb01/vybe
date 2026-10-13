import { useRef } from 'react';
import type { EngineState } from '../audio/AudioEngine';
import type { SourceKind } from '../audio/types';
import { Scrubber } from './Scrubber';

interface Props {
  state: EngineState;
  onPick: (kind: Exclude<SourceKind, 'file'>) => void;
  onFile: (file: File) => void;
  onToggle: () => void;
}

const OPTIONS: { kind: SourceKind; label: string }[] = [
  { kind: 'file', label: 'Upload' },
  { kind: 'mic', label: 'Microphone' },
  { kind: 'tab', label: 'Tab audio' },
];

export function Controls({ state, onPick, onFile, onToggle }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const hasSource = state.kind !== null;

  return (
    <div className="panel">
      {state.media && <Scrubber media={state.media} />}

      <div className="row">
        {hasSource && (
          <>
            <button className="icon-btn" onClick={onToggle} aria-label={state.playing ? 'Pause' : 'Play'}>
              {state.playing ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                </svg>
              )}
            </button>
            <span className="divider" aria-hidden="true" />
          </>
        )}

        {OPTIONS.map(({ kind, label }) => (
          <button
            key={kind}
            className="source-btn"
            aria-pressed={state.kind === kind}
            onClick={() => (kind === 'file' ? fileInput.current?.click() : onPick(kind))}
          >
            {label}
          </button>
        ))}

        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = ''; // lets the same file be picked again
          }}
        />
      </div>
    </div>
  );
}
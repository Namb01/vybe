import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { THEME_OPTIONS, updateSettings, useSettings } from '../state/settings';
import { ACCENT_IDS, ACCENTS } from '../theme/accents';
import { VISUALIZERS } from '../visualizers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsMenu({ open, onOpenChange }: Props) {
  const settings = useSettings();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="settings" ref={wrapRef}>
      <button
        className="icon-btn ghost"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="popover"
            role="dialog"
            aria-label="Settings"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <section>
              <h2>Visualizer</h2>
              <div className="viz-list" role="radiogroup" aria-label="Visualizer">
                {VISUALIZERS.map((v) => (
                  <label key={v.id} className="viz-option">
                    <input
                      type="radio"
                      name="visualizer"
                      checked={settings.visualizer === v.id}
                      onChange={() => updateSettings({ visualizer: v.id })}
                    />
                    <span className="viz-body">
                      <span className="viz-name">{v.name}</span>
                      <span className="viz-desc">{v.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2>Appearance</h2>

              <div className="field">
                <span className="field-label" id="theme-label">
                  Interface theme
                </span>
                <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
                  {THEME_OPTIONS.map((t) => (
                    <label key={t.id}>
                      <input
                        type="radio"
                        name="theme"
                        checked={settings.theme === t.id}
                        onChange={() => updateSettings({ theme: t.id })}
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field-label" id="accent-label">
                  Accent color
                </span>
                <div className="swatches" role="radiogroup" aria-labelledby="accent-label">
                  {ACCENT_IDS.map((id) => {
                    const a = ACCENTS[id];
                    return (
                      <label key={id} title={a.name}>
                        <input
                          type="radio"
                          name="accent"
                          checked={settings.accent === id}
                          onChange={() => updateSettings({ accent: id })}
                        />
                        <span
                          className="swatch"
                          style={{ background: `linear-gradient(135deg, ${a.base}, ${a.mid} 55%, ${a.tip})` }}
                        />
                        <span className="sr-only">{a.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

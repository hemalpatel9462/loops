import { useEffect, useId, useRef } from 'react';
import type { AppSettings, GameplayMode } from '@loops/puzzle-format';
import { AccessibilitySettings } from '../accessibility';

export interface SettingsPanelProps {
  readonly open: boolean;
  readonly settings: AppSettings;
  readonly onChange: (settings: AppSettings) => void;
  readonly onClose: () => void;
}

const gameplayModes: readonly {
  readonly value: GameplayMode;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    value: 'relaxed',
    label: 'Relaxed',
    description: 'Explore freely and solve the puzzle at your own pace.',
  },
  {
    value: 'assisted',
    label: 'Assisted',
    description: 'Get immediate feedback when a move conflicts with the rules.',
  },
];

export function SettingsPanel({ open, settings, onChange, onClose }: SettingsPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const updateMode = (mode: GameplayMode): void => {
    onChange({ ...settings, defaultMode: mode });
  };

  return (
    <div className="settings-backdrop" role="presentation">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="settings-panel"
        id="settings-panel"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="settings-panel__header">
          <div>
            <p className="eyebrow">Your preferences</p>
            <h2 id={titleId}>Settings</h2>
          </div>
          <button aria-label="Close settings" className="settings-panel__close" onClick={onClose} type="button">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="settings-panel__body">
          <fieldset className="settings-panel__group">
            <legend>Gameplay mode</legend>
            <p className="settings-panel__hint">This default is used when you start a new selected puzzle or Daily Loop.</p>
            <div className="settings-panel__options">
              {gameplayModes.map((mode) => (
                <label className="settings-panel__option" key={mode.value}>
                  <input
                    checked={settings.defaultMode === mode.value}
                    name="default-gameplay-mode"
                    onChange={() => updateMode(mode.value)}
                    type="radio"
                    value={mode.value}
                  />
                  <span>
                    <strong>{mode.label}</strong>
                    <small>{mode.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <AccessibilitySettings
            preferences={{ reducedMotion: settings.reducedMotion }}
            onChange={(preferences) => onChange({ ...settings, reducedMotion: preferences.reducedMotion })}
          />
        </div>
      </section>
    </div>
  );
}

export default SettingsPanel;

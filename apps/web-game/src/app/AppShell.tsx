import { useEffect, useState } from 'react';
import type { AppSettings } from '@loops/puzzle-format';
import { applyAccessibilityPreferences } from '../accessibility';
import { getPersistenceRepository } from '../persistence';
import { Tutorial } from '../components/tutorial';
import { GameIntegration } from './integration';
import { SettingsPanel } from './SettingsPanel';

type InfoModal = 'how-to-play' | 'rules';

export default function AppShell() {
  const repository = getPersistenceRepository();
  const [settings, setSettings] = useState<AppSettings>(() => repository.getSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModal | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    applyAccessibilityPreferences(
      { reducedMotion: settings.reducedMotion },
      document.documentElement,
    );
    return () => {
      applyAccessibilityPreferences({ reducedMotion: false }, document.documentElement);
    };
  }, [settings.reducedMotion]);

  const updateSettings = (nextSettings: AppSettings): void => {
    repository.saveSettings(nextSettings);
    setSettings(nextSettings);
  };

  const closeInfoModal = (): void => {
    setInfoModal(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Loops home">
          <span className="brand__mark" aria-hidden="true">
            <svg
              aria-hidden="true"
              className="brand__mark-icon"
              focusable="false"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="12" cy="12" r="1.75" fill="currentColor" />
            </svg>
          </span>
          <span className="brand__name">Loops</span>
        </a>
        <button
          aria-controls="settings-panel"
          aria-expanded={settingsOpen}
          aria-label="Open settings"
          className="icon-button"
          onClick={() => setSettingsOpen(true)}
          type="button"
        >
          <span aria-hidden="true">⚙</span>
        </button>
      </header>

      <main className="app-content" id="play">
        <GameIntegration
          defaultMode={settings.defaultMode}
          onGameRules={() => setInfoModal('rules')}
          onHowToPlay={() => setInfoModal('how-to-play')}
        />
      </main>

      <footer className="app-footer">
        <span>Loops · A thoughtful moment for your day</span>
        <span>Built for curious minds</span>
      </footer>

      <SettingsPanel
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
        settings={settings}
      />
      <Tutorial
        onClose={closeInfoModal}
        onComplete={closeInfoModal}
        open={infoModal !== null}
        variant={infoModal ?? 'how-to-play'}
      />
    </div>
  );
}

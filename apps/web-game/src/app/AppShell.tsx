import { useId, useState } from 'react';
import { GameIntegration } from './integration';

type VisualMode = 'light' | 'dark' | 'high-contrast';

const visualModes: Array<{ value: VisualMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'high-contrast', label: 'High contrast' },
];

function ModePicker({
  mode,
  onChange,
}: {
  mode: VisualMode;
  onChange: (mode: VisualMode) => void;
}) {
  const labelId = useId();

  return (
    <div className="mode-picker">
      <span className="mode-picker__label" id={labelId}>
        Appearance
      </span>
      <div className="mode-picker__options" role="group" aria-labelledby={labelId}>
        {visualModes.map((option) => (
          <button
            aria-pressed={mode === option.value}
            className="mode-picker__option"
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AppShell() {
  const [visualMode, setVisualMode] = useState<VisualMode>('light');

  return (
    <div className="app-shell" data-visual-mode={visualMode}>
      <header className="app-header">
        <a className="brand" href="/" aria-label="Loops home">
          <span className="brand__mark" aria-hidden="true">
            ◌
          </span>
          <span className="brand__name">Loops</span>
        </a>
        <nav className="app-nav" aria-label="Primary navigation">
          <a className="app-nav__link app-nav__link--active" href="#play">
            Play
          </a>
          <a className="app-nav__link" href="#how-to-play">
            How to play
          </a>
        </nav>
        <ModePicker mode={visualMode} onChange={setVisualMode} />
        <button className="icon-button" type="button" aria-label="Open settings">
          <span aria-hidden="true">⚙</span>
        </button>
      </header>

      <main className="app-content" id="play">
        <GameIntegration />
      </main>

      <footer className="app-footer">
        <span>Loops · A thoughtful moment for your day</span>
        <span>Built for curious minds</span>
      </footer>
    </div>
  );
}

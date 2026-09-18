import { useId, useState } from 'react';

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
        <button className="icon-button" type="button" aria-label="Open settings">
          <span aria-hidden="true">⚙</span>
        </button>
      </header>

      <main className="app-content" id="play">
        <section className="hero-panel" aria-labelledby="welcome-title">
          <div className="hero-panel__copy">
            <p className="eyebrow">A calm logic puzzle</p>
            <h1 id="welcome-title">Make one perfect loop.</h1>
            <p className="hero-panel__description">
              Connect the clues with a single continuous line. Take your time,
              find the pattern, and enjoy the satisfying click of a puzzle
              coming together.
            </p>
            <div className="hero-panel__actions">
              <button className="button button--primary" type="button">
                Start a puzzle
                <span aria-hidden="true">→</span>
              </button>
              <button className="button button--secondary" type="button">
                Continue
              </button>
            </div>
            <p className="progress-note">
              <span className="progress-note__dot" aria-hidden="true" />
              Your progress is saved on this device.
            </p>
          </div>

          <div className="loop-preview" aria-hidden="true">
            <div className="loop-preview__glow" />
            <div className="loop-preview__grid">
              {Array.from({ length: 16 }, (_, index) => (
                <span className="loop-preview__cell" key={index}>
                  {index % 5 === 0 ? index % 3 : ''}
                </span>
              ))}
            </div>
            <svg className="loop-preview__line" viewBox="0 0 240 240" role="presentation">
              <path d="M36 36H204V84H156V156H204V204H36V108H84V36" />
            </svg>
          </div>
        </section>

        <section className="mode-panel" aria-labelledby="mode-title">
          <div>
            <p className="eyebrow">Set the mood</p>
            <h2 id="mode-title">Make it yours</h2>
          </div>
          <ModePicker mode={visualMode} onChange={setVisualMode} />
        </section>

        <section className="feature-grid" id="how-to-play" aria-label="Game highlights">
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true">✦</span>
            <h2>Daily loop</h2>
            <p>One shared puzzle each day, with a fresh little challenge waiting.</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true">↺</span>
            <h2>Play at your pace</h2>
            <p>Pause, undo, and come back whenever the next move finds you.</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true">♡</span>
            <h2>Gentle guidance</h2>
            <p>Optional hints help you learn the pattern without giving it all away.</p>
          </article>
        </section>
      </main>

      <footer className="app-footer">
        <span>Loops · A thoughtful moment for your day</span>
        <span>Built for curious minds</span>
      </footer>
    </div>
  );
}

import type { Difficulty } from '@loops/puzzle-format';
import { useId } from 'react';
import type { ModeSelectionProps } from './types';
import './screens.css';

const difficulties: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

export function ModeSelectionScreen({
  selectedDifficulty = 'beginner',
  selectedMode,
  onDifficultyChange,
  onModeChange,
  onQuickPlay,
  onDailyLoop,
  onContinue,
  continueAvailable,
}: ModeSelectionProps) {
  const difficultyLabel = useId();
  const modeLabel = useId();
  return (
    <section className="flow-screen flow-screen--modes" aria-labelledby="mode-screen-title">
      <p className="flow-screen__eyebrow">Choose your next loop</p>
      <h1 id="mode-screen-title">Play at your pace.</h1>
      <p className="flow-screen__intro">Every puzzle is validated locally and works offline.</p>

      <fieldset className="flow-picker" aria-labelledby={difficultyLabel}>
        <legend id={difficultyLabel}>Difficulty</legend>
        <div className="flow-picker__options">
          {difficulties.map((difficulty) => (
            <button
              className="flow-choice"
              aria-pressed={selectedDifficulty === difficulty}
              key={difficulty}
              onClick={() => onDifficultyChange(difficulty)}
              type="button"
            >
              {difficulty[0].toUpperCase() + difficulty.slice(1)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flow-picker" aria-labelledby={modeLabel}>
        <legend id={modeLabel}>Play mode</legend>
        <div className="flow-picker__options">
          <button className="flow-choice" aria-pressed={selectedMode === 'relaxed'} onClick={() => onModeChange('relaxed')} type="button">
            Relaxed <span>Check when you choose</span>
          </button>
          <button className="flow-choice" aria-pressed={selectedMode === 'assisted'} onClick={() => onModeChange('assisted')} type="button">
            Assisted <span>Flag impossible moves</span>
          </button>
        </div>
      </fieldset>

      <div className="flow-actions flow-actions--primary">
        <button className="button button--primary" onClick={onQuickPlay} type="button">Quick Play <span aria-hidden="true">→</span></button>
        <button className="button button--secondary" onClick={onDailyLoop} type="button">Daily Loop</button>
        <button className="button button--secondary" disabled={!continueAvailable} onClick={onContinue} type="button">Continue</button>
      </div>
    </section>
  );
}

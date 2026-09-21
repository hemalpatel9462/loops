import type { DailyLoopScreenProps } from './types';
import './screens.css';

const difficulties = ['beginner', 'easy', 'medium', 'hard', 'expert'] as const;

function titleCase(value: string): string {
  return value[0].toUpperCase() + value.slice(1);
}

function statusLabel(status: DailyLoopScreenProps['status']): string {
  if (status === 'completed') return 'Completed today';
  if (status === 'in-progress') return 'In progress';
  return 'Ready to play';
}

export function DailyLoopScreen({
  date,
  dailyPuzzles,
  selectedDifficulty,
  puzzle,
  status,
  mode,
  onDifficultyChange,
  onStart,
  onBack,
}: DailyLoopScreenProps) {
  return (
    <section className="flow-screen" aria-labelledby="daily-loop-title">
      <button className="flow-back" onClick={onBack} type="button">← Back</button>
      <p className="flow-screen__eyebrow">Daily Loop · {date}</p>
      <h1 id="daily-loop-title">A fresh loop for today.</h1>
      <p className="flow-screen__intro">One manually curated puzzle per difficulty, updated each day.</p>
      <fieldset aria-label="Daily difficulty" className="flow-picker">
        <div className="flow-picker__options">
          {difficulties.map((difficulty) => {
            const option = dailyPuzzles.find((candidate) => candidate.difficulty === difficulty);
            return (
              <button
                aria-pressed={selectedDifficulty === difficulty}
                className="flow-choice"
                key={difficulty}
                onClick={() => onDifficultyChange(difficulty)}
                type="button"
              >
                <span>{titleCase(difficulty)}</span>
                <small>{option?.status === 'completed' ? 'Done' : option?.status === 'in-progress' ? 'Resume' : 'New'}</small>
              </button>
            );
          })}
        </div>
      </fieldset>
      {puzzle ? (
        <>
          <dl className="flow-summary">
            <div><dt>Board</dt><dd>{puzzle.width} × {puzzle.height}</dd></div>
            <div><dt>Difficulty</dt><dd>{puzzle.difficulty}</dd></div>
            <div><dt>Status</dt><dd>{statusLabel(status)}</dd></div>
            <div><dt>Mode</dt><dd>{mode}</dd></div>
          </dl>
          <button className="button button--primary" onClick={onStart} type="button">{status === 'in-progress' ? 'Resume' : 'Start'} today’s loop <span aria-hidden="true">→</span></button>
        </>
      ) : (
        <p className="flow-screen__intro" role="status">No {selectedDifficulty} Daily Loop has been scheduled for this date yet.</p>
      )}
    </section>
  );
}

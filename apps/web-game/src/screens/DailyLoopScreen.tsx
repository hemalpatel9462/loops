import type { DailyLoopScreenProps } from './types';
import './screens.css';

export function DailyLoopScreen({ date, puzzle, mode, onStart, onBack }: DailyLoopScreenProps) {
  return (
    <section className="flow-screen" aria-labelledby="daily-loop-title">
      <button className="flow-back" onClick={onBack} type="button">← Back</button>
      <p className="flow-screen__eyebrow">Daily Loop · {date}</p>
      <h1 id="daily-loop-title">A fresh loop for today.</h1>
      <p className="flow-screen__intro">One deterministic offline puzzle, shared by every player on this date.</p>
      <dl className="flow-summary">
        <div><dt>Board</dt><dd>{puzzle.width} × {puzzle.height}</dd></div>
        <div><dt>Difficulty</dt><dd>{puzzle.difficulty}</dd></div>
        <div><dt>Mode</dt><dd>{mode}</dd></div>
      </dl>
      <button className="button button--primary" onClick={onStart} type="button">Start today’s loop <span aria-hidden="true">→</span></button>
    </section>
  );
}

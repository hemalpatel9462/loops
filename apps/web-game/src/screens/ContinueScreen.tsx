import type { ContinueScreenProps } from './types';
import './screens.css';

export function ContinueScreen({ summary, onResume, onBack }: ContinueScreenProps) {
  const { puzzle, progress } = summary;
  return (
    <section className="flow-screen" aria-labelledby="continue-title">
      <button className="flow-back" onClick={onBack} type="button">← Back</button>
      <p className="flow-screen__eyebrow">Saved on this device</p>
      <h1 id="continue-title">Continue your loop.</h1>
      <p className="flow-screen__intro">Your unfinished puzzle is ready exactly where you left it.</p>
      <dl className="flow-summary">
        <div><dt>Difficulty</dt><dd>{puzzle.difficulty}</dd></div>
        <div><dt>Mode</dt><dd>{progress.mode}</dd></div>
        <div><dt>Time</dt><dd>{progress.elapsedSeconds}s</dd></div>
        <div><dt>Hints</dt><dd>{progress.hintsUsed}</dd></div>
      </dl>
      <button className="button button--primary" onClick={onResume} type="button">Resume puzzle <span aria-hidden="true">→</span></button>
    </section>
  );
}

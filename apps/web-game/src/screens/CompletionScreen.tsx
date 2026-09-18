import type { CompletionScreenProps } from './types';
import './screens.css';

export function CompletionScreen({ completion, onPlayAgain, onBackToModes }: CompletionScreenProps) {
  return (
    <section className="flow-screen flow-screen--complete" aria-labelledby="completion-title">
      <p className="flow-screen__eyebrow">Loop complete</p>
      <h1 id="completion-title">Beautifully done.</h1>
      <p className="flow-screen__intro">You completed the {completion.difficulty} puzzle in {completion.mode} mode.</p>
      <dl className="flow-summary flow-summary--completion">
        <div><dt>Time</dt><dd>{completion.elapsedSeconds}s</dd></div>
        <div><dt>Hints used</dt><dd>{completion.hintsUsed}</dd></div>
      </dl>
      <div className="flow-actions">
        <button className="button button--primary" onClick={onPlayAgain} type="button">Play another</button>
        <button className="button button--secondary" onClick={onBackToModes} type="button">Back to modes</button>
      </div>
    </section>
  );
}

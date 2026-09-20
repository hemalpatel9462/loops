import type { StartScreenProps } from './types';
import './screens.css';

export function StartScreen({ onStart, onDailyLoop, onContinue, continueAvailable }: StartScreenProps) {
  return (
    <section className="flow-screen flow-screen--start" aria-labelledby="start-screen-title">
      <p className="flow-screen__eyebrow">Loops</p>
      <h1 id="start-screen-title">Find your next loop.</h1>
      <p className="flow-screen__intro">Choose a difficulty, then solve each puzzle in order at your own pace.</p>
      <div className="flow-actions flow-actions--primary">
        <button className="button button--primary flow-start" onClick={onStart} type="button">
          Start <span aria-hidden="true">→</span>
        </button>
        <button className="button button--secondary" onClick={onDailyLoop} type="button">Daily Loop</button>
        {continueAvailable ? <button className="button button--secondary" onClick={onContinue} type="button">Continue</button> : null}
      </div>
    </section>
  );
}

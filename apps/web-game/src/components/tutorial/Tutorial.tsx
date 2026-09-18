import { useEffect, useId, useState } from 'react';
import { clampTutorialStep, TUTORIAL_STEPS } from './steps.ts';
import type { TutorialProps } from './types.ts';
import './tutorial.css';

function PracticeBoard() {
  return (
    <div className="tutorial-practice" aria-label="Small two by two practice puzzle" role="img">
      <div className="tutorial-practice__grid" aria-hidden="true">
        <span>2</span><span>1</span>
        <span>1</span><span>2</span>
      </div>
      <p className="tutorial-practice__caption">A small puzzle: every number counts its four surrounding edges.</p>
    </div>
  );
}

export function Tutorial({
  open,
  onComplete,
  onSkip,
  onClose,
  initialStep = 0,
}: TutorialProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [stepIndex, setStepIndex] = useState(() => clampTutorialStep(initialStep));
  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (open) setStepIndex(clampTutorialStep(initialStep));
  }, [initialStep, open]);

  if (!open) return null;

  return (
    <div className="tutorial-backdrop" role="presentation">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="tutorial-dialog"
        data-step={step.id}
        role="dialog"
      >
        <header className="tutorial-dialog__header">
          <div>
            <p className="tutorial-dialog__eyebrow">How to play · Step {stepIndex + 1} of {TUTORIAL_STEPS.length}</p>
            <h2 id={titleId}>{step.title}</h2>
          </div>
          {onClose && (
            <button aria-label="Close tutorial" className="tutorial-dialog__close" onClick={onClose} type="button">
              <span aria-hidden="true">×</span>
            </button>
          )}
        </header>

        <div aria-label="Tutorial progress" className="tutorial-progress" role="list">
          {TUTORIAL_STEPS.map((tutorialStep, index) => (
            <span
              aria-current={index === stepIndex ? 'step' : undefined}
              aria-label={`${tutorialStep.title}${index < stepIndex ? ', completed' : index === stepIndex ? ', current' : ''}`}
              className={index <= stepIndex ? 'tutorial-progress__dot tutorial-progress__dot--active' : 'tutorial-progress__dot'}
              key={tutorialStep.id}
              role="listitem"
            />
          ))}
        </div>

        <div className="tutorial-dialog__body">
          <p id={descriptionId}>{step.body}</p>
          <p className="tutorial-dialog__prompt">{step.prompt}</p>
          {step.id === 'practice' && <PracticeBoard />}
        </div>

        <footer className="tutorial-dialog__footer">
          {onSkip && (
            <button className="tutorial-button tutorial-button--quiet" onClick={onSkip} type="button">
              Skip tutorial
            </button>
          )}
          <div className="tutorial-dialog__navigation">
            <button
              className="tutorial-button tutorial-button--secondary"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              Back
            </button>
            <button
              className="tutorial-button tutorial-button--primary"
              onClick={isLastStep ? onComplete : () => setStepIndex((current) => Math.min(TUTORIAL_STEPS.length - 1, current + 1))}
              type="button"
            >
              {isLastStep ? 'Start puzzle' : 'Next'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default Tutorial;

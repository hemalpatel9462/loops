import { useEffect, useId, useRef, useState } from 'react';
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
  variant,
}: TutorialProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [stepIndex, setStepIndex] = useState(() => clampTutorialStep(initialStep));
  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (open) setStepIndex(clampTutorialStep(initialStep));
  }, [initialStep, open]);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    previouslyFocusedRef.current = previouslyFocused;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const focusable = () => Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const firstFocusable = focusable()[0] ?? dialog;
    firstFocusable.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  if (variant) {
    const isRules = variant === 'rules';
    const close = (): void => {
      const previouslyFocused = previouslyFocusedRef.current;
      previouslyFocused?.focus();
      if (onClose) onClose();
      else onComplete();
    };

    return (
      <div className="tutorial-backdrop" role="presentation">
        <section
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          aria-modal="true"
          className="tutorial-dialog"
          data-view={variant}
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <header className="tutorial-dialog__header">
            <div>
              <p className="tutorial-dialog__eyebrow">Loops</p>
              <h2 id={titleId}>{isRules ? 'Game Rules' : 'How to play'}</h2>
            </div>
            <button aria-label={`Close ${isRules ? 'game rules' : 'tutorial'}`} className="tutorial-dialog__close" onClick={close} type="button">
              <span aria-hidden="true">×</span>
            </button>
          </header>

          {isRules ? (
            <div className="tutorial-dialog__body tutorial-rules" id={descriptionId}>
              <p className="tutorial-rules__intro">Solve the puzzle by drawing one loop that satisfies every clue.</p>
              <div className="tutorial-rules__list">
                <article className="tutorial-rule">
                  <h3>Read the clues</h3>
                  <p>Each number tells you exactly how many of the four edges around that cell belong to the loop.</p>
                </article>
                <article className="tutorial-rule">
                  <h3>Keep lines continuous</h3>
                  <p>At every grid dot, lines must have either zero or two connections. Never create a dead end or a branch.</p>
                </article>
                <article className="tutorial-rule">
                  <h3>Make one loop</h3>
                  <p>All selected edges must form one connected, closed loop. Do not close a smaller loop while other clues remain unresolved.</p>
                </article>
              </div>
            </div>
          ) : (
            <div className="tutorial-dialog__body tutorial-how-to-play" id={descriptionId}>
              <p>Watch this quick guide to see how to read clues and complete a single loop.</p>
              <img
                alt="Animated demonstration of how to play the Loops game"
                className="tutorial-how-to-play__gif"
                src="/Loops-How-To-Play.gif"
              />
            </div>
          )}

        </section>
      </div>
    );
  }

  return (
    <div className="tutorial-backdrop" role="presentation">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="tutorial-dialog"
        data-step={step.id}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
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

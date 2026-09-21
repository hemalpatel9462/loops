import { useEffect, useState } from 'react';
import type { Dispatch } from 'react';
import { ArrowRight, Check, Clock3, Lightbulb, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import type { EdgeId } from '@loops/puzzle-format';
import { LoopBoard } from '../../components/board';
import type { EdgeAction } from '../../components/edge';
import { getLocalPuzzleSequence } from '../../state/game-flow';
import type { GameAction, GameReducerState } from '../../state/game-reducer';
import { PUZZLE_SLOT_COUNT } from '../../screens/puzzle-constants';

export interface GamePlayScreenProps {
  readonly state: GameReducerState;
  readonly elapsedSeconds: number;
  readonly dispatch: Dispatch<GameAction>;
  readonly onExit: () => void;
  readonly onNextPuzzle: () => void;
}

function validationMessage(state: GameReducerState): string | undefined {
  const validation = state.validation;
  if (!validation) return undefined;
  if (validation.complete) return 'Every clue is satisfied and the board contains one closed loop.';
  if (validation.clues.violations.length > 0) {
    return `${validation.clues.violations.length} clue${validation.clues.violations.length === 1 ? '' : 's'} still need attention.`;
  }
  if (validation.vertices.violations.length > 0) return 'Check the loop edges around the marked vertices.';
  if (!validation.connectivity.hasSingleLoop) return 'The selected edges must form one continuous closed loop.';
  return 'The loop is not complete yet.';
}

function puzzleProgressLabel(state: GameReducerState): string {
  const puzzleNumber = getLocalPuzzleSequence(state.puzzle.difficulty)
    .findIndex(({ puzzle }) => puzzle.id === state.puzzle.id) + 1;
  return puzzleNumber > 0 ? `${puzzleNumber}/${PUZZLE_SLOT_COUNT}` : '';
}

function formatElapsedTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function GamePlayScreen({ state, elapsedSeconds, dispatch, onExit, onNextPuzzle }: GamePlayScreenProps) {
  const [showCompletion, setShowCompletion] = useState(state.completed);
  const feedback = validationMessage(state);
  const puzzleProgress = puzzleProgressLabel(state);

  useEffect(() => {
    if (!state.completed) {
      setShowCompletion(false);
      return undefined;
    }

    setShowCompletion(true);
    const timeout = window.setTimeout(() => setShowCompletion(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [state.completed, state.puzzle.id]);

  const onEdgeAction = (edge: EdgeId, action: EdgeAction) => {
    if (action === 'apply-hint' && state.hint?.reveal?.edge === edge) {
      dispatch({ type: 'apply-hint' });
      return;
    }
    dispatch({ type: 'cycle-edge', edge });
  };

  return (
    <section className="flow-screen game-play" aria-label="Loops puzzle">
      <div className="game-play__header">
        <button aria-label="Back to modes" className="flow-back flow-back--icon" onClick={onExit} type="button">
          <span aria-hidden="true">←</span>
        </button>
        <p className="flow-screen__eyebrow game-play__meta">
          {[state.puzzle.difficulty, state.mode, puzzleProgress].filter(Boolean).join(' · ')}
        </p>
        <p aria-label={`Elapsed time ${formatElapsedTime(elapsedSeconds)}`} className="game-play__stats" role="timer">
          <span className="game-play__timer">
            <Clock3 aria-hidden="true" className="game-play__timer-icon" />
            <time>{formatElapsedTime(elapsedSeconds)}</time>
          </span>
          <span aria-hidden="true">·</span>
          <span>{state.hintsUsed} hint{state.hintsUsed === 1 ? '' : 's'}</span>
        </p>
      </div>

      <div className="game-play__board-wrap">
        <LoopBoard
          ariaLabel={`${state.puzzle.difficulty} Loops puzzle`}
          clues={state.puzzle.clues}
          edgeStates={state.gameState.edgeStates}
          fixedEdges={state.gameState.fixedEdges}
          height={state.puzzle.height}
          hint={state.hint?.reveal}
          onEdgeAction={onEdgeAction}
          width={state.puzzle.width}
        />
        {state.completed && showCompletion && (
          <div aria-live="polite" className="game-play__completion-layer">
            <button
              aria-label="Dismiss puzzle complete message"
              className="game-play__success"
              onClick={() => setShowCompletion(false)}
              type="button"
            >
              <span aria-hidden="true" className="game-play__success-icon">
                <Check className="game-play__success-check" />
              </span>
              <span>Puzzle complete!</span>
            </button>
          </div>
        )}
      </div>

      <div className="game-play__controls" aria-label="Puzzle controls">
        <button aria-label="Undo" className="button button--secondary game-play__icon-button" disabled={state.completed || state.gameState.history.past.length === 0} onClick={() => dispatch({ type: 'undo' })} type="button">
          <Undo2 aria-hidden="true" className="game-play__icon" />
        </button>
        <button aria-label="Redo" className="button button--secondary game-play__icon-button" disabled={state.completed || state.gameState.history.future.length === 0} onClick={() => dispatch({ type: 'redo' })} type="button">
          <Redo2 aria-hidden="true" className="game-play__icon" />
        </button>
        <button aria-label="Reset" className="button button--secondary game-play__icon-button" onClick={() => dispatch({ type: 'reset' })} type="button">
          <RotateCcw aria-hidden="true" className="game-play__icon" />
        </button>
        <button aria-label="Hint" className="button button--secondary game-play__icon-button" disabled={state.completed} onClick={() => dispatch({ type: 'request-hint', level: 3 })} type="button">
          <Lightbulb aria-hidden="true" className="game-play__icon" />
        </button>
        {state.completed && (
          <button aria-label="Next puzzle" className="button button--primary game-play__icon-button game-play__next-button" onClick={onNextPuzzle} type="button">
            <ArrowRight aria-hidden="true" className="game-play__icon" />
          </button>
        )}
      </div>

      <div aria-live="polite" className="game-play__feedback">
        {!state.completed && (
          <>
            {feedback && <p>{feedback}</p>}
          </>
        )}
      </div>
    </section>
  );
}

export default GamePlayScreen;

import type { Dispatch } from 'react';
import type { EdgeId } from '@loops/puzzle-format';
import { LoopBoard } from '../../components/board';
import type { GameAction, GameReducerState } from '../../state/game-reducer';

export interface GamePlayScreenProps {
  readonly state: GameReducerState;
  readonly dispatch: Dispatch<GameAction>;
  readonly onExit: () => void;
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

function describeHint(state: GameReducerState): string | undefined {
  if (!state.hint) return undefined;
  const target = state.hint.targetEdge ? `Edge ${state.hint.targetEdge}` : 'The highlighted area';
  const recommendation = state.hint.recommendedState
    ? ` Set it to ${state.hint.recommendedState === 'line' ? 'a line' : 'X'}.`
    : '';
  return `${target}: ${state.hint.explanation ?? 'the engine found a forced move.'}${recommendation}`;
}

export function GamePlayScreen({ state, dispatch, onExit }: GamePlayScreenProps) {
  const hintDescription = describeHint(state);
  const feedback = validationMessage(state);

  const onEdgeAction = (edge: EdgeId) => {
    dispatch({ type: 'cycle-edge', edge });
  };

  return (
    <section className="flow-screen game-play" aria-labelledby="game-play-title">
      <div className="game-play__header">
        <div>
          <button className="flow-back" onClick={onExit} type="button">← Back to modes</button>
          <p className="flow-screen__eyebrow">{state.puzzle.difficulty} · {state.mode}</p>
          <h1 id="game-play-title">Complete the loop.</h1>
        </div>
        <p aria-live="polite" className="game-play__stats">
          {state.hintsUsed} hint{state.hintsUsed === 1 ? '' : 's'} · {state.checksUsed} check{state.checksUsed === 1 ? '' : 's'}
        </p>
      </div>

      <p className="flow-screen__intro">
        Draw one continuous loop. Tap an edge to cycle line, X, and empty.
      </p>

      <LoopBoard
        ariaLabel={`${state.puzzle.difficulty} Loops puzzle`}
        clues={state.puzzle.clues}
        edgeStates={state.gameState.edgeStates}
        fixedEdges={state.gameState.fixedEdges}
        height={state.puzzle.height}
        onEdgeAction={onEdgeAction}
        width={state.puzzle.width}
      />

      <div className="game-play__controls" aria-label="Puzzle controls">
        <button className="button button--secondary" disabled={state.gameState.history.past.length === 0} onClick={() => dispatch({ type: 'undo' })} type="button">Undo</button>
        <button className="button button--secondary" disabled={state.gameState.history.future.length === 0} onClick={() => dispatch({ type: 'redo' })} type="button">Redo</button>
        <button className="button button--secondary" onClick={() => dispatch({ type: 'reset' })} type="button">Reset</button>
        <button className="button button--secondary" onClick={() => dispatch({ type: 'request-hint', level: 2 })} type="button">Hint</button>
        <button className="button button--secondary" onClick={() => dispatch({ type: 'check-progress' })} type="button">Check progress</button>
        <button className="button button--primary" disabled={state.completed} onClick={() => dispatch({ type: 'complete' })} type="button">{state.completed ? 'Completed' : 'Complete loop'}</button>
      </div>

      <div aria-live="polite" className="game-play__feedback">
        {hintDescription && <p>{hintDescription}</p>}
        {state.hint?.reveal && (
          <button className="button button--secondary" onClick={() => dispatch({ type: 'apply-hint' })} type="button">
            Apply engine suggestion
          </button>
        )}
        {feedback && <p>{feedback}</p>}
      </div>
    </section>
  );
}

export default GamePlayScreen;

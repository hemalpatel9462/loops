import {
  cycleEdge,
  createInitialGameState,
  redo,
  setEdgeState,
  undo,
} from '@loops/game-engine/state';
import type { GameState } from '@loops/game-engine/state';
import { computeHint, findDeductions } from '@loops/game-engine/hints';
import type { RuntimeHint } from '@loops/game-engine/hints';
import type { EdgeState } from '@loops/game-engine/model';
import type { EdgeId, GameplayMode, PuzzleDefinition } from '@loops/puzzle-format';
import { validateCompletion } from '@loops/game-engine/validation';
import type { RuleValidationResult } from '@loops/game-engine/validation';

/** State owned by the browser presentation for one real PuzzleDefinition. */
export interface GameReducerState {
  readonly puzzle: PuzzleDefinition;
  readonly mode: GameplayMode;
  readonly gameState: GameState;
  readonly hint?: RuntimeHint;
  readonly validation?: RuleValidationResult;
  readonly completed: boolean;
  readonly hintsUsed: number;
}

export type GameAction =
  | { readonly type: 'cycle-edge'; readonly edge: EdgeId }
  | { readonly type: 'set-edge'; readonly edge: EdgeId; readonly state: EdgeState }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'reset' }
  | { readonly type: 'request-hint'; readonly level?: 1 | 2 | 3 }
  | { readonly type: 'apply-hint' }
  | { readonly type: 'complete' }
  | { readonly type: 'set-mode'; readonly mode: GameplayMode };

function evaluateMove(state: GameReducerState, gameState: GameState): GameReducerState {
  const validation = validateCompletion(state.puzzle, gameState);
  return {
    ...state,
    gameState,
    hint: undefined,
    validation: validation.complete ? validation : undefined,
    completed: validation.complete,
  };
}

export function createGameReducerState(
  puzzle: PuzzleDefinition,
  mode: GameplayMode = 'relaxed',
  gameState?: GameState,
): GameReducerState {
  return Object.freeze({
    puzzle,
    mode,
    gameState: gameState ?? createInitialGameState({
      width: puzzle.width,
      height: puzzle.height,
      startingEdges: puzzle.startingEdges,
    }),
    completed: false,
    hintsUsed: 0,
  });
}

/**
 * The only state transition boundary used by the web integration.
 * Every edge mutation delegates to the platform-independent game engine.
 */
export function gameReducer(state: GameReducerState, action: GameAction): GameReducerState {
  switch (action.type) {
    case 'cycle-edge': {
      const candidate = cycleEdge(state.gameState, action.edge);
      if (candidate === state.gameState) return state;
      if (
        state.mode === 'assisted' &&
        !findDeductions(state.puzzle, {
          edgeStates: candidate.edgeStates,
          fixedEdges: candidate.fixedEdges,
        }).stateIsConsistent
      ) {
        return state;
      }
      return evaluateMove(state, candidate);
    }
    case 'set-edge': {
      const candidate = setEdgeState(state.gameState, action.edge, action.state);
      if (candidate === state.gameState) return state;
      return evaluateMove(state, candidate);
    }
    case 'undo': {
      const candidate = undo(state.gameState);
      return candidate === state.gameState ? state : evaluateMove(state, candidate);
    }
    case 'redo': {
      const candidate = redo(state.gameState);
      return candidate === state.gameState ? state : evaluateMove(state, candidate);
    }
    case 'reset':
      return createGameReducerState(state.puzzle, state.mode);
    case 'request-hint': {
      const hint = computeHint(
        state.puzzle,
        { edgeStates: state.gameState.edgeStates, fixedEdges: state.gameState.fixedEdges },
        action.level ?? 1,
      );
      if (!hint) return { ...state, hint: undefined };
      if (!hint.reveal) return { ...state, hint, hintsUsed: state.hintsUsed + 1 };

      const candidate = setEdgeState(
        state.gameState,
        hint.reveal.edge,
        hint.reveal.state,
      );
      if (candidate === state.gameState) return { ...state, hint, hintsUsed: state.hintsUsed + 1 };
      const validation = validateCompletion(state.puzzle, candidate);
      return {
        ...state,
        gameState: candidate,
        hint,
        validation: validation.complete ? validation : undefined,
        completed: validation.complete,
        hintsUsed: state.hintsUsed + 1,
      };
    }
    case 'apply-hint': {
      if (!state.hint?.reveal) return state;
      const candidate = setEdgeState(
        state.gameState,
        state.hint.reveal.edge,
        state.hint.reveal.state,
      );
      return candidate === state.gameState ? state : evaluateMove(state, candidate);
    }
    case 'complete': {
      const validation = validateCompletion(state.puzzle, state.gameState);
      return {
        ...state,
        validation,
        completed: validation.complete,
      };
    }
    case 'set-mode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
  }
}

export const createInitialGameReducerState = createGameReducerState;
export const reduceGameState = gameReducer;

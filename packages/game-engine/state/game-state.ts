import type { EdgeId } from '@loops/puzzle-format';
import {
  asGameBoardDefinition,
  assertBoardEdge,
  createUnknownEdgeStateMap,
} from '../model/board';
import {
  cycleEdgeState,
  getEdgeState,
} from '../model/edge-state';
import type { EdgeState, EdgeStateMap } from '../model/edge-state';
import {
  EMPTY_HISTORY,
  redoHistory,
  pushHistory,
  undoHistory,
} from './history';
import type { EdgeTransition, HistoryState } from './history';
import type { GameBoardDefinition } from '../model/board';

export interface GameState {
  readonly width: number;
  readonly height: number;
  readonly fixedEdges: readonly EdgeId[];
  readonly edgeStates: EdgeStateMap;
  readonly history: HistoryState;
}

function freezeState(
  state: Omit<GameState, 'history'> & { readonly history: HistoryState },
): GameState {
  return Object.freeze({
    ...state,
    fixedEdges: Object.freeze([...state.fixedEdges]),
    edgeStates: Object.freeze({ ...state.edgeStates }),
    history: Object.freeze({
      past: Object.freeze([...state.history.past]),
      future: Object.freeze([...state.history.future]),
    }),
  });
}

function updateEdgeState(
  state: GameState,
  edge: EdgeId,
  nextState: EdgeState,
  transition: EdgeTransition,
): GameState {
  const edgeStates = {
    ...state.edgeStates,
    [edge]: nextState,
  };
  return freezeState({
    ...state,
    edgeStates,
    history: pushHistory(state.history, transition),
  });
}

export function createInitialGameState(
  definition: GameBoardDefinition,
): GameState {
  const board = asGameBoardDefinition(definition);
  const edgeStates = {
    ...createUnknownEdgeStateMap(board.width, board.height),
  } as Record<string, EdgeState>;
  for (const edge of board.startingEdges) {
    edgeStates[edge] = 'line';
  }

  return freezeState({
    width: board.width,
    height: board.height,
    fixedEdges: board.startingEdges,
    edgeStates,
    history: EMPTY_HISTORY,
  });
}

export function setEdgeState(
  state: GameState,
  edge: EdgeId,
  nextState: EdgeState,
): GameState {
  assertBoardEdge(edge, state.width, state.height);
  if (state.fixedEdges.includes(edge)) {
    return state;
  }

  const before = getEdgeState(state.edgeStates, edge);
  if (before === nextState) {
    return state;
  }

  return updateEdgeState(state, edge, nextState, {
    edge,
    before,
    after: nextState,
  });
}

export function cycleEdge(
  state: GameState,
  edge: EdgeId,
): GameState {
  const before = getEdgeState(state.edgeStates, edge);
  return setEdgeState(state, edge, cycleEdgeState(before));
}

export function undo(state: GameState): GameState {
  const result = undoHistory(state.history);
  if (!result.transition) {
    return state;
  }

  return freezeState({
    ...state,
    edgeStates: {
      ...state.edgeStates,
      [result.transition.edge]: result.transition.before,
    },
    history: result.history,
  });
}

export function redo(state: GameState): GameState {
  const result = redoHistory(state.history);
  if (!result.transition) {
    return state;
  }

  return freezeState({
    ...state,
    edgeStates: {
      ...state.edgeStates,
      [result.transition.edge]: result.transition.after,
    },
    history: result.history,
  });
}

export function canUndo(state: GameState): boolean {
  return state.history.past.length > 0;
}

export function canRedo(state: GameState): boolean {
  return state.history.future.length > 0;
}

export function getStateSnapshot(state: GameState): EdgeStateMap {
  return state.edgeStates;
}

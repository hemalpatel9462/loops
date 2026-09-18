import type { EdgeId } from '@loops/puzzle-format';
import type { EdgeState } from '../model/edge-state';

export interface EdgeTransition {
  readonly edge: EdgeId;
  readonly before: EdgeState;
  readonly after: EdgeState;
}

export interface HistoryState {
  readonly past: readonly EdgeTransition[];
  readonly future: readonly EdgeTransition[];
}

export const EMPTY_HISTORY: HistoryState = Object.freeze({
  past: Object.freeze([]),
  future: Object.freeze([]),
});

export function pushHistory(
  history: HistoryState,
  transition: EdgeTransition,
): HistoryState {
  return Object.freeze({
    past: Object.freeze([...history.past, transition]),
    future: Object.freeze([]),
  });
}

export function undoHistory(
  history: HistoryState,
): { readonly history: HistoryState; readonly transition?: EdgeTransition } {
  const transition = history.past.at(-1);
  if (!transition) {
    return { history };
  }

  return {
    transition,
    history: Object.freeze({
      past: Object.freeze(history.past.slice(0, -1)),
      future: Object.freeze([...history.future, transition]),
    }),
  };
}

export function redoHistory(
  history: HistoryState,
): { readonly history: HistoryState; readonly transition?: EdgeTransition } {
  const transition = history.future.at(-1);
  if (!transition) {
    return { history };
  }

  return {
    transition,
    history: Object.freeze({
      past: Object.freeze([...history.past, transition]),
      future: Object.freeze(history.future.slice(0, -1)),
    }),
  };
}

import type { EdgeId } from '@loops/puzzle-format';

/** The three states an editable edge can occupy during play. */
export type EdgeState = 'unknown' | 'line' | 'x';

/** A complete, immutable board mapping keyed by canonical EdgeId strings. */
export type EdgeStateMap = Readonly<Record<string, EdgeState>>;

export function cycleEdgeState(state: EdgeState): EdgeState {
  switch (state) {
    case 'unknown':
      return 'line';
    case 'line':
      return 'x';
    case 'x':
      return 'unknown';
  }
}

export function getEdgeState(edgeStates: EdgeStateMap, edge: EdgeId): EdgeState {
  return edgeStates[edge] ?? 'unknown';
}

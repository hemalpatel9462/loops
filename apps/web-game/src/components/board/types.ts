import type { EdgeId } from '@loops/puzzle-format';
import type { EdgeState, EdgeStateMap } from '@loops/game-engine/model';
import type { EdgeAction } from '../edge/types.ts';

export interface LoopBoardProps {
  readonly width: number;
  readonly height: number;
  readonly clues: readonly (readonly number[])[];
  readonly edgeStates?: EdgeStateMap;
  readonly fixedEdges?: readonly EdgeId[];
  readonly hint?: {
    readonly edge: EdgeId;
    readonly state: Exclude<EdgeState, 'unknown'>;
  };
  /** Dispatches a semantic action to the game engine/state owner. */
  readonly onEdgeAction?: (edge: EdgeId, action: EdgeAction) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export interface BoardCell {
  readonly row: number;
  readonly column: number;
  readonly clue: number;
}

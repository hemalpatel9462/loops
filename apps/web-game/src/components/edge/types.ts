import type { EdgeId } from '@loops/puzzle-format';
import type { EdgeState } from '@loops/game-engine/model';

export type EdgeAction = 'cycle';

export interface EdgeGeometry {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly orientation: 'horizontal' | 'vertical';
}

export interface EdgeSegmentProps {
  readonly edgeId: EdgeId;
  readonly geometry: EdgeGeometry;
  readonly state?: EdgeState;
  readonly hintState?: Exclude<EdgeState, 'unknown'>;
  readonly fixed?: boolean;
  readonly onAction?: (edge: EdgeId, action: EdgeAction) => void;
}

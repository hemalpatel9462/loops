import {
  createEdgeId,
  isEdgeInBounds,
  parseEdgeId,
} from '@loops/puzzle-format';
import type { EdgeId, PuzzleDefinition } from '@loops/puzzle-format';
import type { EdgeStateMap } from './edge-state';

export interface GameBoardDefinition {
  readonly width: number;
  readonly height: number;
  readonly startingEdges: readonly EdgeId[];
}

export function allBoardEdges(width: number, height: number): readonly EdgeId[] {
  if (!Number.isInteger(width) || width < 2 || !Number.isInteger(height) || height < 2) {
    throw new RangeError('Board width and height must be integers of at least 2.');
  }

  const edges: EdgeId[] = [];
  for (let row = 0; row <= height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      edges.push(createEdgeId('h', row, column));
    }
  }
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column <= width; column += 1) {
      edges.push(createEdgeId('v', row, column));
    }
  }
  return Object.freeze(edges);
}

export function assertBoardEdge(
  edge: EdgeId,
  width: number,
  height: number,
): void {
  const parsed = parseEdgeId(edge);
  if (!parsed || !isEdgeInBounds(parsed, width, height)) {
    throw new RangeError(`Edge ${String(edge)} is outside the ${width}x${height} board.`);
  }
}

export function asGameBoardDefinition(
  definition: GameBoardDefinition | Pick<PuzzleDefinition, 'width' | 'height' | 'startingEdges'>,
): GameBoardDefinition {
  const { width, height, startingEdges } = definition;
  if (!Number.isInteger(width) || width < 2 || !Number.isInteger(height) || height < 2) {
    throw new RangeError('Board width and height must be integers of at least 2.');
  }

  const canonicalStartingEdges = [...new Set(startingEdges)];
  canonicalStartingEdges.forEach((edge) => assertBoardEdge(edge, width, height));
  canonicalStartingEdges.sort();

  return {
    width,
    height,
    startingEdges: Object.freeze(canonicalStartingEdges),
  };
}

export function createUnknownEdgeStateMap(
  width: number,
  height: number,
): EdgeStateMap {
  const states: Record<string, 'unknown'> = {};
  for (const edge of allBoardEdges(width, height)) {
    states[edge] = 'unknown';
  }
  return Object.freeze(states);
}

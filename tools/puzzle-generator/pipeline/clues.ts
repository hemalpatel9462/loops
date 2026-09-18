import { createEdgeId } from '@loops/puzzle-format';
import type { EdgeId } from '@loops/puzzle-format';

export function deriveClues(
  width: number,
  height: number,
  hiddenLoopEdges: readonly EdgeId[],
): readonly (readonly number[])[] {
  const solution = new Set(hiddenLoopEdges);
  const clues: number[][] = [];
  for (let row = 0; row < height; row += 1) {
    const clueRow: number[] = [];
    clues.push(clueRow);
    for (let column = 0; column < width; column += 1) {
      const cellEdges = [
        createEdgeId('h', row, column),
        createEdgeId('h', row + 1, column),
        createEdgeId('v', row, column),
        createEdgeId('v', row, column + 1),
      ];
      clueRow.push(cellEdges.filter((edge) => solution.has(edge)).length);
    }
  }
  return clues;
}

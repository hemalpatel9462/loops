import { createEdgeId, parseEdgeId } from '@loops/puzzle-format';
import type { Difficulty, EdgeId } from '@loops/puzzle-format';
import type { StartingEdgeScore, StartingEdgeSelection } from './types.ts';

function adjacentCells(edge: EdgeId, width: number, height: number): readonly [number, number][] {
  const parsed = parseEdgeId(edge);
  if (!parsed) return [];
  const cells: [number, number][] = [];
  if (parsed.orientation === 'h') {
    if (parsed.row > 0) cells.push([parsed.row - 1, parsed.column]);
    if (parsed.row < height) cells.push([parsed.row, parsed.column]);
  } else {
    if (parsed.column > 0) cells.push([parsed.row, parsed.column - 1]);
    if (parsed.column < width) cells.push([parsed.row, parsed.column]);
  }
  return cells.filter(([row, column]) => row >= 0 && row < height && column >= 0 && column < width);
}

function difficultyTargetRatio(difficulty: Difficulty, min: number, max: number): number {
  const bias = difficulty === 'beginner' ? 0.5 : difficulty === 'easy' ? 0.45 : 0.4;
  return min + (max - min) * bias;
}

function scoreEdge(
  edge: EdgeId,
  solution: ReadonlySet<EdgeId>,
  clues: readonly (readonly number[])[],
  width: number,
  height: number,
): StartingEdgeScore {
  const cells = adjacentCells(edge, width, height);
  const adjacentClues = cells.map(([row, column]) => clues[row][column]);
  const clueValue = adjacentClues.reduce((score, clue) => {
    if (clue === 1) return score + 4;
    if (clue === 2) return score + 3;
    if (clue === 3) return score + 2;
    return score + 1;
  }, 0);
  const parsed = parseEdgeId(edge);
  const neighbors: EdgeId[] = [];
  if (parsed) {
    if (parsed.orientation === 'h') {
      if (parsed.column > 0) neighbors.push(createEdgeId('h', parsed.row, parsed.column - 1));
      if (parsed.column + 1 < width) neighbors.push(createEdgeId('h', parsed.row, parsed.column + 1));
    } else {
      if (parsed.row > 0) neighbors.push(createEdgeId('v', parsed.row - 1, parsed.column));
      if (parsed.row + 1 < height) neighbors.push(createEdgeId('v', parsed.row + 1, parsed.column));
    }
  }
  const neighboringSolutionEdges = neighbors.filter((candidate) => solution.has(candidate)).length;
  const score = clueValue + neighboringSolutionEdges * 0.5;
  const deductionValue = adjacentClues.includes(1)
    ? 'touches a clue-1 cell and creates immediate exclusions'
    : adjacentClues.includes(2)
      ? 'touches a clue-2 cell and supports local continuation'
      : 'provides a stable loop starting point';
  return { edge, score, adjacentClues, deductionValue };
}

export function selectStartingEdges(
  difficulty: Difficulty,
  width: number,
  height: number,
  solutionEdges: readonly EdgeId[],
  clues: readonly (readonly number[])[],
  ratio: { readonly min: number; readonly max: number },
): StartingEdgeSelection {
  const targetRatio = difficultyTargetRatio(difficulty, ratio.min, ratio.max);
  const targetCount = Math.max(1, Math.min(solutionEdges.length, Math.round(solutionEdges.length * targetRatio)));
  const solution = new Set(solutionEdges);
  const scores = solutionEdges
    .map((edge) => scoreEdge(edge, solution, clues, width, height))
    .sort((a, b) => b.score - a.score || a.edge.localeCompare(b.edge, 'en'));
  return {
    edges: scores.slice(0, targetCount).map(({ edge }) => edge).sort((a, b) => a.localeCompare(b, 'en')),
    targetRatio,
    scores,
  };
}

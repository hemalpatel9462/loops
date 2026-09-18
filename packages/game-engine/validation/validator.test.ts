import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../state/game-state';
import {
  branchPuzzle,
  openPathPuzzle,
  validLoopPuzzle,
} from '../../../test-fixtures/puzzles';
import {
  validateClues,
  validateConnectivity,
  validateRules,
  validateVertices,
} from './validator';

function stateFor(puzzle: typeof validLoopPuzzle, edges: readonly string[]) {
  return createInitialGameState({
    width: puzzle.width,
    height: puzzle.height,
    startingEdges: edges as never,
  });
}

function lineMap(edges: readonly string[]) {
  return Object.fromEntries(edges.map((edge) => [edge, 'line'])) as never;
}

describe('core loop validation', () => {
  it('accepts a connected closed loop with satisfied clues', () => {
    const state = stateFor(validLoopPuzzle, validLoopPuzzle.solutionEdges);
    const result = validateRules(validLoopPuzzle, state);

    expect(result.valid).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.clues.valid).toBe(true);
    expect(result.vertices.valid).toBe(true);
    expect(result.connectivity.hasSingleLoop).toBe(true);
  });

  it('reports clue count mismatches', () => {
    const puzzle = { ...validLoopPuzzle, clues: [[3, 2], [2, 2]] };
    const result = validateClues(puzzle, lineMap(validLoopPuzzle.solutionEdges));

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([
      { row: 0, column: 0, expected: 3, actual: 2 },
    ]);
  });

  it('detects endpoints and branches through vertex degree violations', () => {
    const branchResult = validateVertices(branchPuzzle, lineMap(branchPuzzle.solutionEdges));
    const openResult = validateVertices(openPathPuzzle, lineMap(openPathPuzzle.solutionEdges));

    expect(branchResult.valid).toBe(false);
    expect(branchResult.branches.some(({ degree }) => degree === 3)).toBe(true);
    expect(openResult.valid).toBe(false);
    expect(openResult.endpoints).toHaveLength(2);
  });

  it('rejects multiple loops and open paths as non-single-loop connectivity', () => {
    const disconnectedLoopEdges = [
      'h:0:0',
      'h:0:1',
      'h:2:0',
      'h:2:1',
      'v:0:0',
      'v:1:0',
      'v:0:2',
      'v:1:2',
      'h:3:3',
      'h:3:4',
      'h:5:3',
      'h:5:4',
      'v:3:3',
      'v:4:3',
      'v:3:5',
      'v:4:5',
    ] as const;
    const disconnectedPuzzle = {
      width: 5,
      height: 5,
      clues: Array.from({ length: 5 }, () => Array<number>(5).fill(0)),
    };
    const multipleResult = validateConnectivity(
      disconnectedPuzzle,
      lineMap(disconnectedLoopEdges),
    );
    const openResult = validateConnectivity(
      openPathPuzzle,
      lineMap(openPathPuzzle.solutionEdges),
    );

    expect(multipleResult.componentCount).toBe(2);
    expect(multipleResult.hasSingleLoop).toBe(false);
    expect(openResult.componentCount).toBe(1);
    expect(openResult.closed).toBe(false);
    expect(openResult.hasSingleLoop).toBe(false);
  });
});

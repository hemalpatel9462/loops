import { describe, expect, it } from 'vitest';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import { deriveClues } from './clues.ts';
import { emitAcceptedPuzzle, generateAcceptedPuzzle, generatePipelineResult } from './pipeline.ts';
import { selectStartingEdges } from './starting-edges.ts';
import type { EdgeId } from '@loops/puzzle-format';

const square: readonly EdgeId[] = [
  'h:0:0', 'h:0:1', 'h:2:0', 'h:2:1',
  'v:0:0', 'v:1:0', 'v:0:2', 'v:1:2',
] as EdgeId[];

describe('puzzle-generation pipeline', () => {
  it('derives one clue count per cell from hidden loop edges', () => {
    expect(deriveClues(2, 2, square)).toEqual([[2, 2], [2, 2]]);
  });

  it('selects a deterministic ratio of high-deduction starting edges', () => {
    const clues = deriveClues(2, 2, square);
    const first = selectStartingEdges('beginner', 2, 2, square, clues, { min: 0.4, max: 0.5 });
    const second = selectStartingEdges('beginner', 2, 2, square, clues, { min: 0.4, max: 0.5 });
    expect(first).toEqual(second);
    expect(first.edges.length).toBe(4);
    expect(first.scores.every((score) => score.deductionValue.length > 0)).toBe(true);
  });

  it('emits only schema-valid puzzles proven unique by the solver', () => {
    const puzzle = generateAcceptedPuzzle({ difficulty: 'beginner', seed: 'pipeline-test', maxAttempts: 64 });
    expect(parsePuzzleDefinition(puzzle)).toEqual(puzzle);
    expect(puzzle.solutionEdges.length).toBeGreaterThanOrEqual(4);
    expect(puzzle.startingEdges.length).toBeGreaterThan(0);
    expect(emitAcceptedPuzzle(puzzle)).toContain('"solutionEdges"');
  });

  it('returns an explicit accepted/rejected pipeline result', () => {
    const result = generatePipelineResult({ difficulty: 'beginner', seed: 'pipeline-result', maxAttempts: 64 });
    expect(result.accepted).toBe(true);
    expect(result.puzzle).toBeDefined();
    expect(result.solverReport?.unique).toBe(true);
  });
});

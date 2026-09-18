import { describe, expect, it } from 'vitest';
import type { PuzzleDefinition } from '@loops/puzzle-format';
import { solvePuzzle } from './solver.ts';

function puzzle(overrides: Partial<PuzzleDefinition> = {}): PuzzleDefinition {
  return {
    schemaVersion: '1.0', id: 'loop-test-solver', seed: 'solver', generatorVersion: '1.0',
    width: 2, height: 2, difficulty: 'beginner', clues: [[2, 2], [2, 2]],
    solutionEdges: ['h:0:0', 'h:0:1', 'h:2:0', 'h:2:1', 'v:0:0', 'v:1:0', 'v:0:2', 'v:1:2'] as unknown as PuzzleDefinition['solutionEdges'],
    startingEdges: [],
    metadata: { loopLength: 8, complexityScore: 0.1, difficultyScore: 0.1, turnCount: 4, regionalCoverage: 1, startingEdgeRatio: 0 },
    ...overrides,
  };
}

describe('exhaustive uniqueness solver', () => {
  it('returns one solution for a constrained perimeter puzzle', () => {
    const result = solvePuzzle(puzzle());
    expect(result.solutionCount).toBe(1);
    expect(result.report.unique).toBe(true);
    expect(result.solutions[0]).toHaveLength(8);
  });

  it('returns zero for an impossible all-zero puzzle with a fixed line', () => {
    const result = solvePuzzle(puzzle({ id: 'loop-test-zero', clues: [[0, 0], [0, 0]], startingEdges: ['h:0:0'] as unknown as PuzzleDefinition['startingEdges'], metadata: { ...puzzle().metadata, loopLength: 8, startingEdgeRatio: 0.125 } }));
    expect(result.solutionCount).toBe(0);
    expect(result.report.valid).toBe(false);
  });

  it('honors excluded and fixed edges', () => {
    const result = solvePuzzle(puzzle(), { fixedEdges: ['h:0:1'] as unknown as PuzzleDefinition['solutionEdges'], excludedEdges: ['h:1:0'] as unknown as PuzzleDefinition['solutionEdges'] });
    expect(result.solutionCount).toBe(1);
    expect(result.solutions[0]).toContain('h:0:1');
    expect(result.solutions[0]).not.toContain('h:1:0');
  });

  it('returns multiple solutions and stops after the second', () => {
    const result = solvePuzzle(puzzle({ id: 'loop-test-multiple', clues: [[2, 2], [2, 1]] }));
    expect(result.solutionCount).toBe(2);
    expect(result.solutions).toHaveLength(2);
    expect(result.report.solutionCount).toBe(2);
  });

  it('emits the approved report shape', () => {
    const report = solvePuzzle(puzzle()).report;
    expect(report).toMatchObject({ schemaVersion: '1.0', puzzleId: 'loop-test-solver', solutionCount: 1, unique: true, valid: true });
    expect(report.deductions).toEqual(expect.objectContaining({ direct: expect.any(Number), vertex: expect.any(Number), connectivity: expect.any(Number), contradiction: expect.any(Number), searchOnly: expect.any(Number), maximumDepth: expect.any(Number) }));
  });
});

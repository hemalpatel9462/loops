import { describe, expect, it } from 'vitest';
import type { EdgeId, PuzzleDefinition, SolverReport } from '@loops/puzzle-format';
import { analyzePuzzle, DIFFICULTY_PROFILES, evaluateQuality, measureLoop } from './index.ts';

const perimeter: PuzzleDefinition = {
  schemaVersion: '1.0', id: 'loop-analyzer-perimeter', seed: 'fixture', generatorVersion: '1.0',
  width: 4, height: 4, difficulty: 'beginner', clues: Array.from({ length: 4 }, () => [2, 2, 2, 2]),
  solutionEdges: ['h:0:0', 'h:0:1', 'h:0:2', 'h:0:3', 'h:4:0', 'h:4:1', 'h:4:2', 'h:4:3', 'v:0:0', 'v:1:0', 'v:2:0', 'v:3:0', 'v:0:4', 'v:1:4', 'v:2:4', 'v:3:4'] as unknown as EdgeId[],
  startingEdges: ['h:0:0', 'h:0:1', 'h:0:2', 'h:0:3', 'v:0:0', 'v:1:0', 'v:2:0', 'v:3:0'] as unknown as EdgeId[],
  metadata: { loopLength: 16, complexityScore: 0.2, difficultyScore: 0.1, turnCount: 4, regionalCoverage: 9, startingEdgeRatio: 0.5 },
};

function puzzleWithEdges(edges: readonly EdgeId[], width = 10, height = 10, difficulty: PuzzleDefinition['difficulty'] = 'expert'): PuzzleDefinition {
  return {
    ...perimeter,
    id: `loop-analyzer-${edges.length}-${width}`,
    width,
    height,
    difficulty,
    clues: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    solutionEdges: edges,
    startingEdges: [],
    metadata: { ...perimeter.metadata, loopLength: edges.length, startingEdgeRatio: 0 },
  };
}

describe('difficulty analyzer and quality evaluator', () => {
  it('measures coverage, regions, length, turns, density, and repetition', () => {
    const metrics = measureLoop(perimeter);
    expect(metrics.loopLength).toBe(16);
    expect(metrics.boundingBoxWidthRatio).toBe(1);
    expect(metrics.boundingBoxHeightRatio).toBe(1);
    expect(metrics.rowsUsed).toBe(5);
    expect(metrics.columnsUsed).toBe(5);
    expect(metrics.regionalCoverage).toBe(8);
    expect(metrics.turnCount).toBe(4);
    expect(metrics.density).toBeGreaterThan(0);
    expect(metrics.repetitionScore).toBeGreaterThanOrEqual(0);
  });

  it('exposes approved fixed-edge ratios for every difficulty', () => {
    expect(DIFFICULTY_PROFILES.beginner.startingEdgeRatio).toEqual({ min: 0.4, max: 0.5 });
    expect(DIFFICULTY_PROFILES.easy.startingEdgeRatio).toEqual({ min: 0.25, max: 0.3 });
    expect(DIFFICULTY_PROFILES.medium.startingEdgeRatio).toEqual({ min: 0.15, max: 0.2 });
    expect(DIFFICULTY_PROFILES.hard.startingEdgeRatio).toEqual({ min: 0.1, max: 0.15 });
    expect(DIFFICULTY_PROFILES.expert.startingEdgeRatio).toEqual({ min: 0.05, max: 0.1 });
  });

  it('rejects tiny, trivial, concentrated, and dense loops', () => {
    const tiny = evaluateQuality(puzzleWithEdges(['h:0:0', 'h:0:1', 'v:0:0', 'v:1:0'] as unknown as EdgeId[]));
    expect(tiny.accepted).toBe(false);
    expect(tiny.rejectionReasons).toEqual(expect.arrayContaining(['loop-too-short', 'trivial-rectangle-or-low-turn-shape', 'loop-too-concentrated']));
    const denseEdges = [
      ...Array.from({ length: 11 }, (_, row) => Array.from({ length: 10 }, (_, column) => `h:${row}:${column}` as EdgeId)).flat(),
      ...Array.from({ length: 10 }, (_, row) => Array.from({ length: 11 }, (_, column) => `v:${row}:${column}` as EdgeId)).flat(),
    ];
    const dense = evaluateQuality(puzzleWithEdges(denseEdges));
    expect(dense.rejectionReasons).toContain('loop-too-dense');
    const concentrated = evaluateQuality(puzzleWithEdges(['h:4:4', 'h:4:5', 'h:6:4', 'h:6:5', 'v:4:4', 'v:5:4', 'v:4:6', 'v:5:6'] as unknown as EdgeId[]));
    expect(concentrated.rejectionReasons).toContain('loop-too-concentrated');
  });

  it('includes solver deduction metrics in analysis output', () => {
    const solverReport: SolverReport = {
      schemaVersion: '1.0', puzzleId: perimeter.id, solutionCount: 1, unique: true, valid: true,
      deductions: { direct: 4, vertex: 8, connectivity: 2, contradiction: 1, searchOnly: 3, maximumDepth: 2 },
    };
    const analysis = analyzePuzzle(perimeter, { solverReport });
    expect(analysis.solverDeductions).toEqual(solverReport.deductions);
    expect(analysis.solverReport).toEqual(solverReport);
  });
});

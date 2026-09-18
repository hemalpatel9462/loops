import { solvePuzzle } from '../solver/solver.ts';
import type { PuzzleDefinition } from '@loops/puzzle-format';

declare const process: { readonly stdout: { write(value: string): void } };

const perimeter: PuzzleDefinition = {
  schemaVersion: '1.0', id: 'loop-fixture-perimeter', seed: 'fixture', generatorVersion: '1.0',
  width: 2, height: 2, difficulty: 'beginner', clues: [[2, 2], [2, 2]],
  solutionEdges: ['h:0:0', 'h:0:1', 'h:2:0', 'h:2:1', 'v:0:0', 'v:1:0', 'v:0:2', 'v:1:2'] as unknown as PuzzleDefinition['solutionEdges'],
  startingEdges: ['h:0:0'] as unknown as PuzzleDefinition['startingEdges'],
  metadata: { loopLength: 8, complexityScore: 0.1, difficultyScore: 0.1, turnCount: 4, regionalCoverage: 1, startingEdgeRatio: 0.125 },
};

const zero: PuzzleDefinition = {
  ...perimeter, id: 'loop-fixture-zero', clues: [[0, 0], [0, 0]], solutionEdges: ['h:0:0', 'h:0:1', 'h:2:0', 'h:2:1'] as unknown as PuzzleDefinition['solutionEdges'], startingEdges: [], metadata: { ...perimeter.metadata, loopLength: 4, startingEdgeRatio: 0 },
};

const fixtures = [
  { name: 'perimeter', puzzle: perimeter, expected: 1 as const },
  { name: 'zero-clues', puzzle: zero, expected: 0 as const },
];

for (const fixture of fixtures) {
  const result = solvePuzzle(fixture.puzzle);
  if (result.solutionCount !== fixture.expected) {
    throw new Error(`${fixture.name}: expected ${fixture.expected}, received ${String(result.solutionCount)}`);
  }
}

process.stdout.write(`Validated ${fixtures.length} solver fixtures.\n`);

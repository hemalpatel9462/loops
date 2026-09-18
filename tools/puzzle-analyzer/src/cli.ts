import { generateCandidateLoop } from '../../puzzle-generator/src/generator.ts';
import { analyzePuzzle } from './analyzer.ts';
import type { EdgeId, PuzzleDefinition } from '@loops/puzzle-format';

declare const process: {
  readonly argv: readonly string[];
  readonly stdout: { write(value: string): void };
};

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const width = Number(option('--width', '4'));
const height = Number(option('--height', '4'));
const seed = option('--seed', 'analyzer-smoke');
const candidate = generateCandidateLoop({ width, height, seed, minRowsUsed: 3, minColumnsUsed: 3 });
const solution = new Set(candidate.edges);
const clues = Array.from({ length: height }, (_, row) =>
  Array.from({ length: width }, (_, column) => {
    const edges = [`h:${row}:${column}`, `h:${row + 1}:${column}`, `v:${row}:${column}`, `v:${row}:${column + 1}`] as EdgeId[];
    return edges.filter((edge) => solution.has(edge)).length;
  }),
);
const startingEdges = candidate.edges.slice(0, Math.max(1, Math.round(candidate.edges.length * 0.45)));
const puzzle: PuzzleDefinition = {
  schemaVersion: '1.0',
  id: `loop-analyzer-${seed.replace(/[^A-Za-z0-9._-]/g, '-')}`,
  seed,
  generatorVersion: 'analyzer-cli-1.0.0',
  width,
  height,
  difficulty: 'beginner',
  clues,
  solutionEdges: candidate.edges,
  startingEdges,
  metadata: {
    loopLength: candidate.edges.length,
    complexityScore: 0.2,
    difficultyScore: 0.2,
    turnCount: 4,
    regionalCoverage: 1,
    startingEdgeRatio: startingEdges.length / candidate.edges.length,
  },
};
process.stdout.write(`${JSON.stringify(analyzePuzzle(puzzle), null, 2)}\n`);

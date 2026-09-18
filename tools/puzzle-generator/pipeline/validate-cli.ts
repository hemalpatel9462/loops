import { generatePipelineResult } from './pipeline.ts';

declare const process: {
  readonly stdout: { write(value: string): void };
  readonly stderr: { write(value: string): void };
  exitCode: number;
};

const result = generatePipelineResult({
  difficulty: 'beginner',
  seed: 'validate-puzzles',
  maxAttempts: 64,
});

if (!result.accepted || !result.puzzle || !result.solverReport?.valid || !result.solverReport.unique) {
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ id: result.puzzle.id, solutionCount: result.solverReport.solutionCount, unique: result.solverReport.unique }, null, 2)}\n`);
}

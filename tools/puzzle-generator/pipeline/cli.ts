import { generatePuzzles } from './pipeline.ts';
import type { Difficulty } from '@loops/puzzle-format';

declare const process: {
  readonly argv: readonly string[];
  readonly stdout: { write(value: string): void };
};

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const difficulty = option('--difficulty', 'beginner') as Difficulty;
const count = Number(option('--count', '1'));
const seed = option('--seed', `pipeline-${difficulty}`);

const puzzles = generatePuzzles({ difficulty, seed }, count);
process.stdout.write(`${JSON.stringify(puzzles, null, 2)}\n`);

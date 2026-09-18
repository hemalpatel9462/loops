import { generateCandidates } from './generator.ts';

declare const process: {
  readonly argv: readonly string[];
  readonly stdout: { write(value: string): void };
};

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const width = Number(option('--width', '4'));
const height = Number(option('--height', '4'));
const count = Number(option('--count', '3'));
const seed = option('--seed', 'test-candidates');

if (![width, height, count].every(Number.isInteger) || width < 2 || height < 2 || count < 1) {
  throw new Error('--width, --height, and --count must be positive integers (width/height at least 2)');
}

const candidates = generateCandidates({ width, height, seed }, count);
process.stdout.write(`${JSON.stringify({ artifactType: 'candidate-loop-set', version: '1.0', candidates }, null, 2)}\n`);

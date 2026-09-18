import { resolve } from 'node:path';
import { buildCatalog, DEFAULT_OUTPUT_DIR } from './builder.ts';
import { assertCatalogValid } from './catalog.ts';

declare const process: {
  readonly argv: readonly string[];
  readonly cwd: () => string;
  readonly stdout: { write(value: string): void };
  readonly stderr: { write(value: string): void };
  exitCode: number;
};

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const command = process.argv[2] ?? 'build';
const outputDir = resolve(process.cwd(), option('--output', DEFAULT_OUTPUT_DIR));
if (command === 'build') {
  const result = buildCatalog({ outputDir, seed: option('--seed', 'catalog') });
  process.stdout.write(`${JSON.stringify({ catalog: result.catalog, files: result.puzzlePaths }, null, 2)}\n`);
} else if (command === 'validate') {
  const catalog = assertCatalogValid(resolve(outputDir, 'catalog.json'), { dataRoot: outputDir });
  process.stdout.write(`${JSON.stringify({ valid: true, puzzleCount: catalog.puzzles.length, catalogVersion: catalog.catalogVersion }, null, 2)}\n`);
} else {
  process.stderr.write(`Unknown catalog command: ${command}\n`);
  process.exitCode = 1;
}

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { generateAcceptedPuzzle } from '../../puzzle-generator/pipeline/pipeline.ts';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import type { Difficulty, PuzzleCatalog, PuzzleCatalogEntry, PuzzleDefinition } from '@loops/puzzle-format';
import { validateCatalogFile } from './catalog.ts';
import type { CatalogBuildOptions, CatalogBuildResult } from './types.ts';

const ALL_DIFFICULTIES: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];
const DEFAULT_OUTPUT_DIR = resolve(process.cwd(), '../../packages/puzzle-data');

function catalogPath(outputDir: string): string {
  return resolve(outputDir, 'catalog.json');
}

function puzzleFileName(puzzle: PuzzleDefinition): string {
  return `puzzles/${puzzle.difficulty}/${puzzle.id}.json`;
}

function generatedPuzzles(options: CatalogBuildOptions): readonly PuzzleDefinition[] {
  if (options.puzzles) return options.puzzles;
  const difficulties = options.difficulties ?? ALL_DIFFICULTIES;
  const count = options.countPerDifficulty ?? 1;
  if (!Number.isInteger(count) || count < 1) throw new RangeError('countPerDifficulty must be a positive integer');
  const seed = options.seed ?? 'catalog';
  return difficulties.flatMap((difficulty) => Array.from({ length: count }, (_, index) =>
    generateAcceptedPuzzle({ difficulty, seed: `${seed}-${difficulty}-${index}`, maxAttempts: 64 }),
  ));
}

function duplicateIds(puzzles: readonly PuzzleDefinition[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const puzzle of puzzles) {
    if (seen.has(puzzle.id)) duplicates.add(puzzle.id);
    seen.add(puzzle.id);
  }
  return [...duplicates];
}

export function buildCatalog(options: CatalogBuildOptions = {}): CatalogBuildResult {
  const outputDir = resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR);
  const puzzles = generatedPuzzles(options).map((puzzle) => parsePuzzleDefinition(puzzle));
  const duplicates = duplicateIds(puzzles);
  if (duplicates.length > 0) throw new Error(`Duplicate puzzle IDs are not allowed: ${duplicates.join(', ')}`);
  mkdirSync(outputDir, { recursive: true });
  const entries: PuzzleCatalogEntry[] = [];
  const puzzlePaths: string[] = [];
  for (const puzzle of puzzles) {
    const path = puzzleFileName(puzzle);
    const absolutePath = resolve(outputDir, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, `${JSON.stringify(puzzle, null, 2)}\n`, 'utf8');
    puzzlePaths.push(absolutePath);
    entries.push({ id: puzzle.id, difficulty: puzzle.difficulty, width: puzzle.width, height: puzzle.height, path });
  }
  const catalog: PuzzleCatalog = {
    schemaVersion: '1.0',
    catalogVersion: options.catalogVersion ?? '1.0.0',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    puzzles: entries.sort((a, b) => a.id.localeCompare(b.id, 'en')),
  };
  const outputCatalogPath = catalogPath(outputDir);
  writeFileSync(outputCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  const validation = validateCatalogFile(outputCatalogPath, { dataRoot: outputDir });
  if (!validation.valid) throw new Error(`Built catalog failed validation: ${validation.errors.join('; ')}`);
  return { catalog, puzzlePaths };
}

export { DEFAULT_OUTPUT_DIR };

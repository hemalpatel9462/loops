import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateAcceptedPuzzle } from './pipeline.ts';
import type { DailyPuzzleCatalog, Difficulty, PuzzleDefinition } from '@loops/puzzle-format';

declare const process: {
  readonly argv: readonly string[];
  readonly cwd: () => string;
  readonly stdout: { write(value: string): void };
};

const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: string, offset: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function readDailyCatalog(path: string): DailyPuzzleCatalog {
  if (!existsSync(path)) {
    return { schemaVersion: '1.0', catalogVersion: '1.0.0', days: [] };
  }
  return JSON.parse(readFileSync(path, 'utf8')) as DailyPuzzleCatalog;
}

function writePuzzle(outputDir: string, puzzle: PuzzleDefinition): string {
  const relativePath = `${puzzle.difficulty}/${puzzle.id}.json`;
  const absolutePath = resolve(outputDir, relativePath);
  mkdirSync(resolve(outputDir, puzzle.difficulty), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(puzzle, null, 2)}\n`, 'utf8');
  return relativePath;
}

const startDate = option('--start-date', localDateKey(new Date()));
const dayCount = Number(option('--days', '30'));
const outputDir = resolve(process.cwd(), option('--output', '../../packages/puzzle-data/daily-puzzles'));
const catalogPath = resolve(process.cwd(), option('--catalog', '../../packages/puzzle-data/daily-catalog.json'));

if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(dayCount) || dayCount < 1) {
  throw new Error('--start-date must be YYYY-MM-DD and --days must be a positive integer');
}

const catalog = readDailyCatalog(catalogPath);
const assignments = new Map(catalog.days.map((day) => [day.date, day]));
const generated: string[] = [];

for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
  const date = addDays(startDate, dayIndex);
  const puzzles = {} as Record<Difficulty, string>;
  for (const difficulty of DIFFICULTIES) {
    const puzzle = generateAcceptedPuzzle({
      difficulty,
      seed: `daily-${date}-${difficulty}`,
      maxAttempts: 64,
    });
    writePuzzle(outputDir, puzzle);
    puzzles[difficulty] = puzzle.id;
    generated.push(puzzle.id);
  }
  assignments.set(date, { date, puzzles });
}

const nextCatalog: DailyPuzzleCatalog = {
  ...catalog,
  days: [...assignments.values()].sort((a, b) => a.date.localeCompare(b.date)),
};
mkdirSync(resolve(catalogPath, '..'), { recursive: true });
writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ startDate, dayCount, puzzleCount: generated.length, catalogPath, outputDir }, null, 2)}\n`);

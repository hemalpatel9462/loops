import catalogJson from '../../../../../packages/puzzle-data/catalog.json';
import dailyCatalogJson from '../../../../../packages/puzzle-data/daily-catalog.json';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import type {
  DailyPuzzleCatalog,
  Difficulty,
  PuzzleCatalog,
  PuzzleDefinition,
} from '@loops/puzzle-format';
import type { LocalPuzzleSource, PuzzleSequenceItem } from './types';

// Vite expands this at build time, keeping every validated puzzle in the
// static bundle as the catalog grows. The generator remains development-only.
const puzzleJsonFiles = import.meta.glob('../../../../../packages/puzzle-data/puzzles/**/*.json', {
  eager: true,
  import: 'default',
});
const dailyPuzzleJsonFiles = import.meta.glob('../../../../../packages/puzzle-data/daily-puzzles/**/*.json', {
  eager: true,
  import: 'default',
});

function loadLocalSource(): LocalPuzzleSource {
  const catalog = catalogJson as PuzzleCatalog;
  const parsedPuzzles = new Map<string, PuzzleDefinition>();
  for (const candidate of Object.values(puzzleJsonFiles)) {
    const puzzle = parsePuzzleDefinition(candidate);
    if (parsedPuzzles.has(puzzle.id)) {
      throw new Error(`Duplicate local puzzle ${puzzle.id} is not allowed.`);
    }
    parsedPuzzles.set(puzzle.id, puzzle);
  }

  const catalogIds = new Set<string>();
  const puzzles = catalog.puzzles.map((entry) => {
    if (catalogIds.has(entry.id)) {
      throw new Error(`Duplicate catalog puzzle ${entry.id} is not allowed.`);
    }
    catalogIds.add(entry.id);
    const puzzle = parsedPuzzles.get(entry.id);
    if (!puzzle) {
      throw new Error(`Catalog puzzle ${entry.id} is missing from the local bundle.`);
    }
    if (puzzle.difficulty !== entry.difficulty) {
      throw new Error(`Catalog difficulty for ${entry.id} does not match its puzzle definition.`);
    }
    if (puzzle.width !== entry.width || puzzle.height !== entry.height) {
      throw new Error(`Catalog dimensions for ${entry.id} do not match its puzzle definition.`);
    }
    return puzzle;
  });
  return Object.freeze({ catalog, puzzles: Object.freeze(puzzles) });
}

let cachedSource: LocalPuzzleSource | undefined;
let cachedDailyCatalog: DailyPuzzleCatalog | undefined;
let cachedDailyPuzzles: readonly PuzzleDefinition[] | undefined;

export function getLocalPuzzleSource(): LocalPuzzleSource {
  cachedSource ??= loadLocalSource();
  return cachedSource;
}

export function getLocalPuzzles(difficulty?: Difficulty): readonly PuzzleDefinition[] {
  const puzzles = getLocalPuzzleSource().puzzles;
  return difficulty ? puzzles.filter((puzzle) => puzzle.difficulty === difficulty) : puzzles;
}

/** Return the validated catalog sequence with a one-based number per difficulty. */
export function getLocalPuzzleSequence(difficulty: Difficulty): readonly PuzzleSequenceItem[] {
  return Object.freeze(getLocalPuzzles(difficulty).map((puzzle, index) => Object.freeze({
    number: index + 1,
    puzzle,
  })));
}

export function getLocalPuzzleById(puzzleId: string): PuzzleDefinition | undefined {
  return getLocalPuzzleSource().puzzles.find((puzzle) => puzzle.id === puzzleId);
}

function getLocalDailyPuzzles(): readonly PuzzleDefinition[] {
  if (cachedDailyPuzzles) return cachedDailyPuzzles;
  const parsedPuzzles = new Map<string, PuzzleDefinition>();
  for (const candidate of Object.values(dailyPuzzleJsonFiles)) {
    const puzzle = parsePuzzleDefinition(candidate);
    if (parsedPuzzles.has(puzzle.id)) throw new Error(`Duplicate daily puzzle ${puzzle.id} is not allowed.`);
    parsedPuzzles.set(puzzle.id, puzzle);
  }
  cachedDailyPuzzles = Object.freeze([...parsedPuzzles.values()]);
  return cachedDailyPuzzles;
}

export function getDailyPuzzleById(puzzleId: string): PuzzleDefinition | undefined {
  return getLocalPuzzleById(puzzleId) ?? getLocalDailyPuzzles().find((puzzle) => puzzle.id === puzzleId);
}

function getDailyCatalog(): DailyPuzzleCatalog {
  if (cachedDailyCatalog) return cachedDailyCatalog;
  const candidate = dailyCatalogJson as DailyPuzzleCatalog;
  if (candidate.schemaVersion !== '1.0' || !candidate.catalogVersion || !Array.isArray(candidate.days)) {
    throw new Error('The bundled Daily Puzzle Catalog is invalid.');
  }

  const seenDates = new Set<string>();
  for (const day of candidate.days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || seenDates.has(day.date)) {
      throw new Error(`Duplicate or invalid Daily Puzzle Catalog date: ${day.date}`);
    }
    seenDates.add(day.date);
    for (const difficulty of ['beginner', 'easy', 'medium', 'hard', 'expert'] as const) {
      const puzzleId = day.puzzles?.[difficulty];
      const puzzle = typeof puzzleId === 'string' ? getDailyPuzzleById(puzzleId) : undefined;
      if (!puzzle || puzzle.difficulty !== difficulty) {
        throw new Error(`Daily Puzzle Catalog maps ${day.date}/${difficulty} to an invalid puzzle.`);
      }
    }
  }

  cachedDailyCatalog = Object.freeze(candidate);
  return cachedDailyCatalog;
}

export function getDailyPuzzle(date: string, difficulty: Difficulty): PuzzleDefinition | undefined {
  const day = getDailyCatalog().days.find((candidate) => candidate.date === date);
  const puzzleId = day?.puzzles?.[difficulty];
  return puzzleId ? getDailyPuzzleById(puzzleId) : undefined;
}

export function resetLocalPuzzleSourceForTests(): void {
  cachedSource = undefined;
  cachedDailyCatalog = undefined;
  cachedDailyPuzzles = undefined;
}

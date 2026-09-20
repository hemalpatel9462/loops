import catalogJson from '../../../../../packages/puzzle-data/catalog.json';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import type {
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

export function resetLocalPuzzleSourceForTests(): void {
  cachedSource = undefined;
}

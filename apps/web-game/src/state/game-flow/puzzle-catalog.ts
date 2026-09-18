import catalogJson from '../../../../../packages/puzzle-data/catalog.json';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import type {
  Difficulty,
  PuzzleCatalog,
  PuzzleDefinition,
} from '@loops/puzzle-format';
import type { LocalPuzzleSource } from './types';

// Vite expands this at build time, keeping every validated puzzle in the
// static bundle as the catalog grows. The generator remains development-only.
const puzzleJsonFiles = import.meta.glob('../../../../../packages/puzzle-data/puzzles/**/*.json', {
  eager: true,
  import: 'default',
});

function loadLocalSource(): LocalPuzzleSource {
  const catalog = catalogJson as PuzzleCatalog;
  const catalogIds = new Set(catalog.puzzles.map((entry) => entry.id));
  const puzzles = Object.values(puzzleJsonFiles)
    .map((candidate) => parsePuzzleDefinition(candidate))
    .filter((puzzle) => catalogIds.has(puzzle.id))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));

  const puzzleIds = new Set(puzzles.map((puzzle) => puzzle.id));
  for (const entry of catalog.puzzles) {
    if (!puzzleIds.has(entry.id)) {
      throw new Error(`Catalog puzzle ${entry.id} is missing from the local bundle.`);
    }
  }
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

export function getLocalPuzzleById(puzzleId: string): PuzzleDefinition | undefined {
  return getLocalPuzzleSource().puzzles.find((puzzle) => puzzle.id === puzzleId);
}

export function resetLocalPuzzleSourceForTests(): void {
  cachedSource = undefined;
}

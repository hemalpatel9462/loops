import beginnerPuzzle from '../../../../../packages/puzzle-data/puzzles/beginner/loop-beginner-catalog-beginner-0.json';
import easyPuzzle from '../../../../../packages/puzzle-data/puzzles/easy/loop-easy-catalog-easy-0.json';
import mediumPuzzle from '../../../../../packages/puzzle-data/puzzles/medium/loop-medium-catalog-medium-0.json';
import hardPuzzle from '../../../../../packages/puzzle-data/puzzles/hard/loop-hard-catalog-hard-0.json';
import expertPuzzle from '../../../../../packages/puzzle-data/puzzles/expert/loop-expert-catalog-expert-0.json';
import catalogJson from '../../../../../packages/puzzle-data/catalog.json';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import type {
  Difficulty,
  PuzzleCatalog,
  PuzzleDefinition,
} from '@loops/puzzle-format';
import type { LocalPuzzleSource } from './types';

const puzzleJsonByDifficulty = {
  beginner: beginnerPuzzle,
  easy: easyPuzzle,
  medium: mediumPuzzle,
  hard: hardPuzzle,
  expert: expertPuzzle,
} as const;

function loadLocalSource(): LocalPuzzleSource {
  const catalog = catalogJson as PuzzleCatalog;
  const puzzles = Object.values(puzzleJsonByDifficulty)
    .map((candidate) => parsePuzzleDefinition(candidate))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));

  const catalogIds = new Set(catalog.puzzles.map((entry) => entry.id));
  for (const puzzle of puzzles) {
    if (!catalogIds.has(puzzle.id)) {
      throw new Error(`Local puzzle ${puzzle.id} is missing from the catalog.`);
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

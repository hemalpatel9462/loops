import type { Difficulty, PuzzleDefinition } from '@loops/puzzle-format';
import {
  getLocalPuzzleById,
  getLocalPuzzles,
  selectDailyPuzzle,
  selectQuickPlayPuzzle,
} from '../../state/game-flow';

/** Load a puzzle from the validated, bundled puzzle-data package. */
export function loadPuzzleDefinition(puzzleId: string): PuzzleDefinition {
  const puzzle = getLocalPuzzleById(puzzleId);
  if (!puzzle) throw new Error(`Validated puzzle ${puzzleId} is not available locally.`);
  return puzzle;
}

export function loadQuickPlayPuzzle(difficulty?: Difficulty): PuzzleDefinition {
  return selectQuickPlayPuzzle({ difficulty });
}

export function loadDailyPuzzle(date: string): PuzzleDefinition {
  return selectDailyPuzzle(date);
}

export function loadAvailablePuzzles(difficulty?: Difficulty): readonly PuzzleDefinition[] {
  return getLocalPuzzles(difficulty);
}

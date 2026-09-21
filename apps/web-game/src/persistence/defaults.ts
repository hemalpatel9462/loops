import type {
  AppSettings,
  Difficulty,
  DailyLoopState,
  DifficultyStatistics,
  PlayerStatistics,
} from '@loops/puzzle-format';

export const DEFAULT_SETTINGS: AppSettings = Object.freeze({
  schemaVersion: '1.0',
  defaultMode: 'relaxed',
  reducedMotion: false,
  lineThickness: 'standard',
  haptics: true,
  sound: true,
  tutorialCompleted: false,
});

const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

function emptyDifficultyStats(): DifficultyStatistics {
  return { started: 0, completed: 0, hintsUsed: 0 };
}

export function createDefaultStatistics(): PlayerStatistics {
  const byDifficulty = {} as Record<Difficulty, DifficultyStatistics>;
  for (const difficulty of DIFFICULTIES) byDifficulty[difficulty] = emptyDifficultyStats();
  return {
    schemaVersion: '1.0',
    totalCompleted: 0,
    totalStarted: 0,
    totalHintsUsed: 0,
    byDifficulty,
  };
}

export function createDefaultDailyState(
  date: string,
  difficulty: DailyLoopState['difficulty'],
  seed: string,
  puzzleId: string,
): DailyLoopState {
  return {
    schemaVersion: '1.0',
    date,
    difficulty,
    seed,
    puzzleId,
    status: 'not-started',
    streakCount: 0,
    hintsUsed: 0,
  };
}

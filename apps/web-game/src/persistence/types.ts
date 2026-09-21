import type {
  AppSettings,
  DailyLoopState,
  Difficulty,
  PlayerProgress,
  PlayerStatistics,
} from '@loops/puzzle-format';

export type PersistedRecord =
  | AppSettings
  | DailyLoopState
  | PlayerProgress
  | PlayerStatistics;

/** The browser storage contract used by the repository and its tests. */
export interface StorageLike {
  readonly length?: number;
  getItem(key: string): string | null;
  key?(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface ContinuePointer {
  readonly schemaVersion: '1.0';
  readonly puzzleId: string;
  readonly updatedAt: string;
}

export interface PersistenceRepository {
  saveProgress(progress: PlayerProgress): void;
  loadProgress(puzzleId: string): PlayerProgress | undefined;
  removeProgress(puzzleId: string): void;

  saveContinue(progress: PlayerProgress): void;
  loadContinue(expectedPuzzleId?: string): PlayerProgress | undefined;
  clearContinue(): void;

  saveDailyProgress(date: string, difficulty: Difficulty, progress: PlayerProgress): void;
  loadDailyProgress(date: string, difficulty: Difficulty): PlayerProgress | undefined;
  removeDailyProgress(date: string, difficulty: Difficulty): void;

  saveSettings(settings: AppSettings): void;
  loadSettings(): AppSettings | undefined;
  getSettings(): AppSettings;
  resetSettings(): void;

  saveStatistics(statistics: PlayerStatistics): void;
  loadStatistics(): PlayerStatistics | undefined;
  getStatistics(): PlayerStatistics;
  resetStatistics(): void;

  saveDailyState(state: DailyLoopState): void;
  loadDailyState(date?: string, difficulty?: Difficulty): DailyLoopState | undefined;
  removeDailyState(date?: string, difficulty?: Difficulty): void;

  resetAll(): void;
}

export const STORAGE_NAMESPACE = 'loops';
export const STORAGE_VERSION = 'v1';

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value);
}

export const storageKeys = {
  progress: (puzzleId: string): string =>
    `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:progress:${encodeKeyPart(puzzleId)}`,
  continue: `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:continue`,
  settings: `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:settings`,
  statistics: `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:statistics`,
  daily: (date: string, difficulty: Difficulty): string =>
    `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:daily:${encodeKeyPart(date)}:${encodeKeyPart(difficulty)}`,
  dailyProgress: (date: string, difficulty: Difficulty): string =>
    `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:daily-progress:${encodeKeyPart(date)}:${encodeKeyPart(difficulty)}`,
  prefix: `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:`,
} as const;

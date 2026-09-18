import type {
  AppSettings,
  DailyLoopState,
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

  saveSettings(settings: AppSettings): void;
  loadSettings(): AppSettings | undefined;
  getSettings(): AppSettings;
  resetSettings(): void;

  saveStatistics(statistics: PlayerStatistics): void;
  loadStatistics(): PlayerStatistics | undefined;
  getStatistics(): PlayerStatistics;
  resetStatistics(): void;

  saveDailyState(state: DailyLoopState): void;
  loadDailyState(date?: string): DailyLoopState | undefined;
  removeDailyState(date?: string): void;

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
  daily: (date: string): string =>
    `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:daily:${encodeKeyPart(date)}`,
  prefix: `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:`,
} as const;

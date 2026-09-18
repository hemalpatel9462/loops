import { createDefaultDailyState, createDefaultStatistics, DEFAULT_SETTINGS } from './defaults';
import {
  parseAppSettings,
  parseContinuePointer,
  parseDailyLoopState,
  parsePlayerProgress,
  parsePlayerStatistics,
} from './schema-validation';
import type {
  AppSettings,
  DailyLoopState,
  PlayerProgress,
  PlayerStatistics,
} from '@loops/puzzle-format';
import {
  storageKeys,
  type ContinuePointer,
  type PersistenceRepository,
  type StorageLike,
} from './types';

export class PersistenceValidationError extends Error {
  readonly issues: readonly string[];

  constructor(recordType: string, issues: readonly string[]) {
    super(`Invalid ${recordType} persistence record: ${issues.join('; ')}`);
    this.name = 'PersistenceValidationError';
    this.issues = issues;
  }
}

export function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function readJson(storage: StorageLike, key: string): unknown | undefined {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable or read-only. A corrupt value is still treated as absent.
    }
    return undefined;
  }
}

function writeJson(storage: StorageLike, key: string, value: unknown): void {
  storage.setItem(key, serialize(value));
}

function remove(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // A storage security exception should not make a reset action fatal.
  }
}

function writeValidated<T>(
  storage: StorageLike,
  key: string,
  value: T,
  parse: (candidate: unknown) => { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly string[] },
  recordType: string,
): void {
  const result = parse(value);
  if (!result.ok) throw new PersistenceValidationError(recordType, result.issues);
  writeJson(storage, key, result.value);
}

function readValidated<T>(
  storage: StorageLike,
  key: string,
  parse: (candidate: unknown) => { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly string[] },
): T | undefined {
  const candidate = readJson(storage, key);
  if (candidate === undefined) return undefined;
  const result = parse(candidate);
  if (!result.ok) {
    remove(storage, key);
    return undefined;
  }
  return result.value;
}

function createContinuePointer(progress: PlayerProgress): ContinuePointer {
  return {
    schemaVersion: '1.0',
    puzzleId: progress.puzzleId,
    updatedAt: progress.updatedAt,
  };
}

function createRepository(storage: StorageLike): PersistenceRepository {
  const saveProgress = (progress: PlayerProgress): void => {
    writeValidated(storage, storageKeys.progress(progress.puzzleId), progress, parsePlayerProgress, 'player progress');
  };

  const loadProgress = (puzzleId: string): PlayerProgress | undefined =>
    readValidated(storage, storageKeys.progress(puzzleId), parsePlayerProgress);

  const saveContinue = (progress: PlayerProgress): void => {
    if (progress.completed) {
      saveProgress(progress);
      const pointer = readValidated(storage, storageKeys.continue, parseContinuePointer);
      if (pointer?.puzzleId === progress.puzzleId) remove(storage, storageKeys.continue);
      return;
    }
    saveProgress(progress);
    writeValidated(storage, storageKeys.continue, createContinuePointer(progress), parseContinuePointer, 'continue pointer');
  };

  return {
    saveProgress,
    loadProgress,
    removeProgress: (puzzleId) => {
      remove(storage, storageKeys.progress(puzzleId));
      const pointer = readValidated(storage, storageKeys.continue, parseContinuePointer);
      if (pointer?.puzzleId === puzzleId) remove(storage, storageKeys.continue);
    },
    saveContinue,
    loadContinue: (expectedPuzzleId) => {
      const pointer = readValidated(storage, storageKeys.continue, parseContinuePointer);
      if (!pointer || (expectedPuzzleId && pointer.puzzleId !== expectedPuzzleId)) return undefined;
      const progress = loadProgress(pointer.puzzleId);
      if (!progress || progress.puzzleId !== pointer.puzzleId || progress.completed) {
        remove(storage, storageKeys.continue);
        return undefined;
      }
      return progress;
    },
    clearContinue: () => remove(storage, storageKeys.continue),
    saveSettings: (settings) => writeValidated(storage, storageKeys.settings, settings, parseAppSettings, 'app settings'),
    loadSettings: () => readValidated(storage, storageKeys.settings, parseAppSettings),
    getSettings: () => readValidated(storage, storageKeys.settings, parseAppSettings) ?? DEFAULT_SETTINGS,
    resetSettings: () => remove(storage, storageKeys.settings),
    saveStatistics: (statistics) => writeValidated(storage, storageKeys.statistics, statistics, parsePlayerStatistics, 'player statistics'),
    loadStatistics: () => readValidated(storage, storageKeys.statistics, parsePlayerStatistics),
    getStatistics: () => readValidated(storage, storageKeys.statistics, parsePlayerStatistics) ?? createDefaultStatistics(),
    resetStatistics: () => remove(storage, storageKeys.statistics),
    saveDailyState: (state) => writeValidated(storage, storageKeys.daily(state.date), state, parseDailyLoopState, 'Daily Loop state'),
    loadDailyState: (date) => {
      if (!date) return undefined;
      return readValidated(storage, storageKeys.daily(date), parseDailyLoopState);
    },
    removeDailyState: (date) => {
      if (date) remove(storage, storageKeys.daily(date));
    },
    resetAll: () => {
      remove(storage, storageKeys.continue);
      remove(storage, storageKeys.settings);
      remove(storage, storageKeys.statistics);
      if (typeof storage.length !== 'number' || !storage.key) return;
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(storageKeys.prefix)) keys.push(key);
      }
      for (const key of keys) remove(storage, key);
    },
  };
}

let defaultRepository: PersistenceRepository | undefined;

export function createPersistenceRepository(storage: StorageLike): PersistenceRepository {
  return createRepository(storage);
}

export function getPersistenceRepository(): PersistenceRepository {
  if (!defaultRepository) {
    const storage = getBrowserStorage();
    defaultRepository = createRepository(storage ?? new MemoryStorage());
  }
  return defaultRepository;
}

export function resetPersistenceRepositoryForTests(): void {
  defaultRepository = undefined;
}

export function getDefaultDailyState(date: string, seed: string, puzzleId: string): DailyLoopState {
  return createDefaultDailyState(date, seed, puzzleId);
}

export type { AppSettings, DailyLoopState, PlayerProgress, PlayerStatistics };

import type {
  AppSettings,
  DailyLoopState,
  GameplayMode,
  LineThickness,
  PlayerProgress,
  PlayerStatistics,
} from '@loops/puzzle-format';
import type { ContinuePointer } from './types';

export interface ValidationResult<T> {
  readonly ok: true;
  readonly value: T;
}

export interface ValidationFailure {
  readonly ok: false;
  readonly issues: readonly string[];
}

export type ParseResult<T> = ValidationResult<T> | ValidationFailure;

const MODES = new Set<GameplayMode>(['relaxed', 'assisted']);
const THICKNESSES = new Set<LineThickness>(['thin', 'standard', 'thick']);
const DAILY_STATUSES = new Set(['not-started', 'in-progress', 'completed']);
const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'expert'] as const;
const EDGE_ID_PATTERN = /^[hv]:[0-9]+:[0-9]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  issues: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${key}: unexpected property`);
  }
}

function requireString(value: unknown, path: string, issues: string[], minLength = 1): value is string {
  if (typeof value !== 'string' || value.length < minLength) {
    issues.push(`${path}: must be a string with at least ${minLength} character(s)`);
    return false;
  }
  return true;
}

function requireNonNegativeInteger(value: unknown, path: string, issues: string[]): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    issues.push(`${path}: must be a non-negative integer`);
    return false;
  }
  return true;
}

function requireBoolean(value: unknown, path: string, issues: string[]): value is boolean {
  if (typeof value !== 'boolean') {
    issues.push(`${path}: must be a boolean`);
    return false;
  }
  return true;
}

function requireDateTime(value: unknown, path: string, issues: string[], optional = false): value is string {
  if (value === undefined && optional) return true;
  if (!requireString(value, path, issues)) return false;
  if (Number.isNaN(Date.parse(value))) {
    issues.push(`${path}: must be an ISO date-time`);
    return false;
  }
  return true;
}

function finish<T>(value: T, issues: readonly string[]): ParseResult<T> {
  return issues.length === 0 ? { ok: true, value } : { ok: false, issues };
}

function validateEdgeStates(value: unknown, issues: string[]): boolean {
  if (!isRecord(value)) {
    issues.push('edgeStates: must be an object');
    return false;
  }
  for (const [edge, state] of Object.entries(value)) {
    if (!EDGE_ID_PATTERN.test(edge)) issues.push(`edgeStates.${edge}: invalid edge id`);
    if (state !== 'line' && state !== 'x') issues.push(`edgeStates.${edge}: must be line or x`);
  }
  return issues.length === 0;
}

export function parsePlayerProgress(input: unknown): ParseResult<PlayerProgress> {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['$: must be an object'] };
  hasOnlyKeys(input, new Set([
    'schemaVersion', 'puzzleId', 'mode', 'edgeStates', 'elapsedSeconds', 'hintsUsed',
    'checksUsed', 'completed', 'startedAt', 'completedAt', 'updatedAt', 'dailyDate', 'dailyDifficulty',
  ]), issues);
  if (input.schemaVersion !== '1.0') issues.push('schemaVersion: must equal 1.0');
  requireString(input.puzzleId, 'puzzleId', issues);
  if (!MODES.has(input.mode as GameplayMode)) issues.push('mode: invalid gameplay mode');
  validateEdgeStates(input.edgeStates, issues);
  requireNonNegativeInteger(input.elapsedSeconds, 'elapsedSeconds', issues);
  requireNonNegativeInteger(input.hintsUsed, 'hintsUsed', issues);
  if (input.checksUsed !== undefined) requireNonNegativeInteger(input.checksUsed, 'checksUsed', issues);
  requireBoolean(input.completed, 'completed', issues);
  requireDateTime(input.startedAt, 'startedAt', issues, true);
  requireDateTime(input.completedAt, 'completedAt', issues, true);
  requireDateTime(input.updatedAt, 'updatedAt', issues);
  if (input.dailyDate !== undefined &&
      (!requireString(input.dailyDate, 'dailyDate', issues) ||
       !DATE_PATTERN.test(input.dailyDate) ||
       Number.isNaN(Date.parse(`${input.dailyDate}T00:00:00Z`)))) {
    issues.push('dailyDate: must be an ISO calendar date');
  }
  if (input.dailyDifficulty !== undefined && !DIFFICULTIES.includes(input.dailyDifficulty as typeof DIFFICULTIES[number])) {
    issues.push('dailyDifficulty: invalid difficulty');
  }
  return finish(input as unknown as PlayerProgress, issues);
}

export function parseAppSettings(input: unknown): ParseResult<AppSettings> {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['$: must be an object'] };
  hasOnlyKeys(input, new Set([
    'schemaVersion', 'defaultMode', 'reducedMotion',
    'lineThickness', 'haptics', 'sound', 'tutorialCompleted', 'locale',
  ]), issues);
  if (input.schemaVersion !== '1.0') issues.push('schemaVersion: must equal 1.0');
  if (!MODES.has(input.defaultMode as GameplayMode)) issues.push('defaultMode: invalid gameplay mode');
  requireBoolean(input.reducedMotion, 'reducedMotion', issues);
  if (!THICKNESSES.has(input.lineThickness as LineThickness)) issues.push('lineThickness: invalid line thickness');
  requireBoolean(input.haptics, 'haptics', issues);
  if (input.sound !== undefined) requireBoolean(input.sound, 'sound', issues);
  requireBoolean(input.tutorialCompleted, 'tutorialCompleted', issues);
  if (input.locale !== undefined) requireString(input.locale, 'locale', issues, 2);
  return finish(input as unknown as AppSettings, issues);
}

/**
 * Remove settings fields that were persisted by versions that supported
 * appearance preferences before validating the remaining canonical record.
 */
export function normalizeLegacyAppSettings(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const normalized = { ...input };
  delete normalized.theme;
  delete normalized.highContrast;
  return normalized;
}

function parseDifficultyStats(value: unknown, path: string, issues: string[]): boolean {
  if (!isRecord(value)) {
    issues.push(`${path}: must be an object`);
    return false;
  }
  hasOnlyKeys(value, new Set(['started', 'completed', 'hintsUsed', 'bestTimeSeconds', 'averageTimeSeconds']), issues);
  requireNonNegativeInteger(value.started, `${path}.started`, issues);
  requireNonNegativeInteger(value.completed, `${path}.completed`, issues);
  requireNonNegativeInteger(value.hintsUsed, `${path}.hintsUsed`, issues);
  if (value.bestTimeSeconds !== undefined) requireNonNegativeInteger(value.bestTimeSeconds, `${path}.bestTimeSeconds`, issues);
  if (value.averageTimeSeconds !== undefined &&
      (typeof value.averageTimeSeconds !== 'number' || !Number.isFinite(value.averageTimeSeconds) || value.averageTimeSeconds < 0)) {
    issues.push(`${path}.averageTimeSeconds: must be a non-negative number`);
  }
  return true;
}

export function parsePlayerStatistics(input: unknown): ParseResult<PlayerStatistics> {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['$: must be an object'] };
  hasOnlyKeys(input, new Set([
    'schemaVersion', 'totalCompleted', 'totalStarted', 'totalHintsUsed',
    'bestOverallTimeSeconds', 'currentDailyStreak', 'longestDailyStreak', 'byDifficulty',
  ]), issues);
  if (input.schemaVersion !== '1.0') issues.push('schemaVersion: must equal 1.0');
  requireNonNegativeInteger(input.totalCompleted, 'totalCompleted', issues);
  requireNonNegativeInteger(input.totalStarted, 'totalStarted', issues);
  requireNonNegativeInteger(input.totalHintsUsed, 'totalHintsUsed', issues);
  for (const key of ['bestOverallTimeSeconds', 'currentDailyStreak', 'longestDailyStreak']) {
    if (input[key] !== undefined) requireNonNegativeInteger(input[key], key, issues);
  }
  if (!isRecord(input.byDifficulty)) {
    issues.push('byDifficulty: must be an object');
  } else {
    hasOnlyKeys(input.byDifficulty, new Set(DIFFICULTIES), issues);
    for (const difficulty of DIFFICULTIES) parseDifficultyStats(input.byDifficulty[difficulty], `byDifficulty.${difficulty}`, issues);
  }
  return finish(input as unknown as PlayerStatistics, issues);
}

export function parseDailyLoopState(input: unknown): ParseResult<DailyLoopState> {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['$: must be an object'] };
  hasOnlyKeys(input, new Set([
    'schemaVersion', 'date', 'difficulty', 'seed', 'puzzleId', 'status', 'streakCount',
    'completedAt', 'hintsUsed', 'completionTimeSeconds',
  ]), issues);
  if (input.schemaVersion !== '1.0') issues.push('schemaVersion: must equal 1.0');
  const date = input.date;
  if (!requireString(date, 'date', issues) || !DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    issues.push('date: must be an ISO calendar date');
  }
  if (!DIFFICULTIES.includes(input.difficulty as typeof DIFFICULTIES[number])) issues.push('difficulty: invalid difficulty');
  requireString(input.seed, 'seed', issues);
  requireString(input.puzzleId, 'puzzleId', issues);
  if (!DAILY_STATUSES.has(input.status as string)) issues.push('status: invalid daily status');
  requireNonNegativeInteger(input.streakCount, 'streakCount', issues);
  requireDateTime(input.completedAt, 'completedAt', issues, true);
  if (input.hintsUsed !== undefined) requireNonNegativeInteger(input.hintsUsed, 'hintsUsed', issues);
  if (input.completionTimeSeconds !== undefined) requireNonNegativeInteger(input.completionTimeSeconds, 'completionTimeSeconds', issues);
  return finish(input as unknown as DailyLoopState, issues);
}

export function parseContinuePointer(input: unknown): ParseResult<ContinuePointer> {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['$: must be an object'] };
  hasOnlyKeys(input, new Set(['schemaVersion', 'puzzleId', 'updatedAt']), issues);
  if (input.schemaVersion !== '1.0') issues.push('schemaVersion: must equal 1.0');
  requireString(input.puzzleId, 'puzzleId', issues);
  requireDateTime(input.updatedAt, 'updatedAt', issues);
  return finish(input as unknown as ContinuePointer, issues);
}

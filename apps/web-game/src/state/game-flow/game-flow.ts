import { computeHint, findDeductions } from '@loops/game-engine/hints';
import {
  cycleEdge,
  createInitialGameState,
  setEdgeState,
} from '@loops/game-engine/state';
import { validateCompletion } from '@loops/game-engine/validation';
import type { EdgeState } from '@loops/game-engine/model';
import type {
  Difficulty,
  EdgeId,
  GameplayMode,
  PlayerStatistics,
  PuzzleDefinition,
} from '@loops/puzzle-format';
import {
  createDefaultDailyState,
  createDefaultStatistics,
  getPersistenceRepository,
} from '../../persistence';
import type { PersistenceRepository } from '../../persistence';
import { restoreGameStateFromProgress, toPlayerProgress } from '../persistence';
import {
  getLocalPuzzleById,
  getLocalPuzzles,
} from './puzzle-catalog';
import type {
  CompletionStats,
  ContinueOptions,
  DailyLoopOptions,
  FlowDependencies,
  FlowProgressSummary,
  GameFlowSession,
  GameFlowSource,
  PuzzleSelectionOptions,
} from './types';

function resolveRepository(dependencies?: FlowDependencies): PersistenceRepository {
  return dependencies?.repository ?? getPersistenceRepository();
}

function resolveNow(dependencies?: FlowDependencies): Date {
  return dependencies?.now?.() ?? new Date();
}

function isoNow(dependencies?: FlowDependencies): string {
  return resolveNow(dependencies).toISOString();
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Stable, small string hash used for offline Daily Loop selection. */
export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectDailyPuzzle(date: string): PuzzleDefinition {
  const puzzles = getLocalPuzzles();
  if (puzzles.length === 0) throw new Error('No validated local puzzles are available.');
  return puzzles[stableHash(`daily:${date}`) % puzzles.length];
}

export function selectQuickPlayPuzzle(options: PuzzleSelectionOptions = {}): PuzzleDefinition {
  const puzzles = getLocalPuzzles(options.difficulty);
  if (puzzles.length === 0) {
    throw new Error(`No validated local puzzles are available for ${options.difficulty ?? 'all difficulties'}.`);
  }
  const seed = options.seed ?? `${options.difficulty ?? 'all'}:quick-play`;
  return puzzles[stableHash(seed) % puzzles.length];
}

function startStatistics(repository: PersistenceRepository, difficulty: Difficulty): void {
  const current = repository.loadStatistics() ?? createDefaultStatistics();
  const byDifficulty = {
    ...current.byDifficulty,
    [difficulty]: {
      ...current.byDifficulty[difficulty],
      started: current.byDifficulty[difficulty].started + 1,
    },
  };
  repository.saveStatistics({
    ...current,
    totalStarted: current.totalStarted + 1,
    byDifficulty,
  });
}

function createSession(
  puzzle: PuzzleDefinition,
  source: GameFlowSource,
  mode: GameplayMode,
  dependencies: FlowDependencies = {},
  extra: { readonly startedAt?: string; readonly elapsedSeconds?: number; readonly hintsUsed?: number; readonly checksUsed?: number; readonly dailyDate?: string; readonly restoreProgress?: Parameters<typeof restoreGameStateFromProgress>[0] } = {},
): GameFlowSession {
  const repository = resolveRepository(dependencies);
  const startedAt = extra.startedAt ?? isoNow(dependencies);
  const gameState = extra.restoreProgress
    ? restoreGameStateFromProgress(extra.restoreProgress, {
        puzzleId: puzzle.id,
        width: puzzle.width,
        height: puzzle.height,
        startingEdges: puzzle.startingEdges,
      })
    : createInitialGameState({
        width: puzzle.width,
        height: puzzle.height,
        startingEdges: puzzle.startingEdges,
      });
  if (!extra.restoreProgress) startStatistics(repository, puzzle.difficulty);
  return Object.freeze({
    puzzle,
    source,
    mode,
    gameState,
    startedAt,
    elapsedSeconds: extra.elapsedSeconds ?? 0,
    hintsUsed: extra.hintsUsed ?? 0,
    checksUsed: extra.checksUsed ?? 0,
    completed: Boolean(extra.restoreProgress?.completed),
    ...(extra.dailyDate ? { dailyDate: extra.dailyDate } : {}),
  });
}

export function startQuickPlay(options: PuzzleSelectionOptions = {}): GameFlowSession {
  const puzzle = selectQuickPlayPuzzle(options);
  return createSession(puzzle, 'quick-play', options.mode ?? 'relaxed', options);
}

export function startDailyLoop(options: DailyLoopOptions = {}): GameFlowSession {
  const now = resolveNow(options);
  const date = options.date ?? dateKey(now);
  const puzzle = selectDailyPuzzle(date);
  const repository = resolveRepository(options);
  const current = repository.loadDailyState(date) ?? createDefaultDailyState(date, `daily:${date}`, puzzle.id);
  repository.saveDailyState({
    ...current,
    puzzleId: puzzle.id,
    seed: `daily:${date}`,
    status: current.status === 'completed' ? 'completed' : 'in-progress',
  });
  return createSession(puzzle, 'daily-loop', options.mode ?? 'relaxed', options, { dailyDate: date });
}

export function getContinueProgress(options: ContinueOptions = {}): FlowProgressSummary | undefined {
  const repository = resolveRepository(options);
  const progress = repository.loadContinue(options.expectedPuzzleId);
  if (!progress) return undefined;
  const puzzle = getLocalPuzzleById(progress.puzzleId);
  return puzzle ? { progress, puzzle } : undefined;
}

export function resumeContinue(options: ContinueOptions = {}): GameFlowSession | undefined {
  const summary = getContinueProgress(options);
  if (!summary) return undefined;
  return createSession(
    summary.puzzle,
    'continue',
    summary.progress.mode,
    options,
    {
      startedAt: summary.progress.startedAt ?? summary.progress.updatedAt,
      elapsedSeconds: summary.progress.elapsedSeconds,
      hintsUsed: summary.progress.hintsUsed,
      checksUsed: summary.progress.checksUsed ?? 0,
      restoreProgress: summary.progress,
    },
  );
}

function persistSession(session: GameFlowSession, repository: PersistenceRepository, updatedAt: string): void {
  repository.saveContinue(toPlayerProgress({
    puzzleId: session.puzzle.id,
    mode: session.mode,
    edgeStates: session.gameState.edgeStates,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    checksUsed: session.checksUsed,
    completed: session.completed,
    startedAt: session.startedAt,
    completedAt: session.completion?.completedAt,
    updatedAt,
  }));
}

export function updateElapsedTime(session: GameFlowSession, elapsedSeconds: number, dependencies: FlowDependencies = {}): GameFlowSession {
  const next = Object.freeze({ ...session, elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)) });
  if (!next.completed) persistSession(next, resolveRepository(dependencies), isoNow(dependencies));
  return next;
}

export function cycleSessionEdge(session: GameFlowSession, edge: EdgeId, dependencies: FlowDependencies = {}): GameFlowSession {
  const candidate = cycleEdge(session.gameState, edge);
  if (candidate === session.gameState) return session;
  const deductions = findDeductions(session.puzzle, {
    edgeStates: candidate.edgeStates,
    fixedEdges: candidate.fixedEdges,
  });
  if (session.mode === 'assisted' && !deductions.stateIsConsistent) {
    return Object.freeze({
      ...session,
      lastMove: Object.freeze({
        accepted: false,
        edge,
        reason: 'That move conflicts with a clue, vertex, or single-loop constraint.',
      }),
    });
  }
  const next = Object.freeze({ ...session, gameState: candidate, lastMove: Object.freeze({ accepted: true, edge }) });
  persistSession(next, resolveRepository(dependencies), isoNow(dependencies));
  return next;
}

export function requestSessionHint(session: GameFlowSession, level: 1 | 2 | 3 = 1, dependencies: FlowDependencies = {}): GameFlowSession {
  const hint = computeHint(session.puzzle, {
    edgeStates: session.gameState.edgeStates,
    fixedEdges: session.gameState.fixedEdges,
  }, level);
  if (!hint) return session;
  const next = Object.freeze({ ...session, hintsUsed: session.hintsUsed + 1, lastHint: hint });
  persistSession(next, resolveRepository(dependencies), isoNow(dependencies));
  return next;
}

export function applyHintReveal(session: GameFlowSession, dependencies: FlowDependencies = {}): GameFlowSession {
  if (!session.lastHint?.reveal) return session;
  const nextState = setEdgeState(session.gameState, session.lastHint.reveal.edge, session.lastHint.reveal.state as EdgeState);
  const next = Object.freeze({ ...session, gameState: nextState });
  persistSession(next, resolveRepository(dependencies), isoNow(dependencies));
  return next;
}

export function checkSessionProgress(session: GameFlowSession, dependencies: FlowDependencies = {}): GameFlowSession {
  const validation = validateCompletion(session.puzzle, session.gameState);
  const next = Object.freeze({ ...session, checksUsed: session.checksUsed + 1, lastValidation: validation });
  persistSession(next, resolveRepository(dependencies), isoNow(dependencies));
  return next;
}

function recordCompletion(repository: PersistenceRepository, session: GameFlowSession, completion: CompletionStats): void {
  const current = repository.loadStatistics() ?? createDefaultStatistics();
  const previousDifficulty = current.byDifficulty[session.puzzle.difficulty];
  const completedCount = previousDifficulty.completed + 1;
  const averageTime = previousDifficulty.averageTimeSeconds === undefined
    ? completion.elapsedSeconds
    : ((previousDifficulty.averageTimeSeconds * previousDifficulty.completed) + completion.elapsedSeconds) / completedCount;
  const bestTime = previousDifficulty.bestTimeSeconds === undefined
    ? completion.elapsedSeconds
    : Math.min(previousDifficulty.bestTimeSeconds, completion.elapsedSeconds);
  repository.saveStatistics({
    ...current,
    totalCompleted: current.totalCompleted + 1,
    totalHintsUsed: current.totalHintsUsed + completion.hintsUsed,
    bestOverallTimeSeconds: current.bestOverallTimeSeconds === undefined
      ? completion.elapsedSeconds
      : Math.min(current.bestOverallTimeSeconds, completion.elapsedSeconds),
    byDifficulty: {
      ...current.byDifficulty,
      [session.puzzle.difficulty]: {
        ...previousDifficulty,
        completed: completedCount,
        hintsUsed: previousDifficulty.hintsUsed + completion.hintsUsed,
        bestTimeSeconds: bestTime,
        averageTimeSeconds: averageTime,
      },
    },
  });
}

export function completeSession(session: GameFlowSession, dependencies: FlowDependencies = {}): GameFlowSession {
  if (session.completed) return session;
  const validation = validateCompletion(session.puzzle, session.gameState);
  if (!validation.complete) {
    return Object.freeze({ ...session, lastValidation: validation });
  }
  const completedAt = isoNow(dependencies);
  const completion: CompletionStats = {
    puzzleId: session.puzzle.id,
    difficulty: session.puzzle.difficulty,
    mode: session.mode,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    completedAt,
  };
  const next = Object.freeze({ ...session, completed: true, completion, lastValidation: validation });
  const repository = resolveRepository(dependencies);
  recordCompletion(repository, session, completion);
  repository.saveProgress(toPlayerProgress({
    puzzleId: session.puzzle.id,
    mode: session.mode,
    edgeStates: session.gameState.edgeStates,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    checksUsed: session.checksUsed,
    completed: true,
    startedAt: session.startedAt,
    completedAt,
    updatedAt: completedAt,
  }));
  repository.clearContinue();
  if (session.dailyDate) {
    const previous = repository.loadDailyState(session.dailyDate) ?? createDefaultDailyState(session.dailyDate, `daily:${session.dailyDate}`, session.puzzle.id);
    repository.saveDailyState({
      ...previous,
      puzzleId: session.puzzle.id,
      status: 'completed',
      completedAt,
      hintsUsed: session.hintsUsed,
      completionTimeSeconds: session.elapsedSeconds,
      streakCount: previous.streakCount + 1,
    });
  }
  return next;
}

export function getPlayerStatistics(repository?: PersistenceRepository): PlayerStatistics {
  return (repository ?? getPersistenceRepository()).getStatistics();
}

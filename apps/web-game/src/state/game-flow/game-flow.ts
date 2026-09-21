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
  getDailyPuzzle,
  getLocalPuzzleById,
  getLocalPuzzles,
  getLocalPuzzleSequence,
} from './puzzle-catalog';
import type {
  CompletionStats,
  ContinueOptions,
  DailyLoopPuzzleOption,
  DailyLoopOptions,
  FlowDependencies,
  FlowProgressSummary,
  GameFlowSession,
  GameFlowSource,
  PuzzleProgressionItem,
  PuzzleSelectionOptions,
  SelectedPuzzleOptions,
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

export function getDailyDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Stable, small string hash retained for compatibility-only puzzle selection. */
export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectDailyPuzzle(date: string, difficulty: Difficulty): PuzzleDefinition | undefined {
  return getDailyPuzzle(date, difficulty);
}

function getPuzzleProgressionItem(
  difficulty: Difficulty,
  puzzleNumber: number,
  dependencies: FlowDependencies = {},
): PuzzleProgressionItem | undefined {
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return undefined;
  const sequence = getLocalPuzzleSequence(difficulty);
  const item = sequence[puzzleNumber - 1];
  if (!item || item.number !== puzzleNumber) return undefined;

  const repository = resolveRepository(dependencies);
  const progress = repository.loadProgress(item.puzzle.id);
  const previous = sequence[puzzleNumber - 2];
  const previousProgress = previous ? repository.loadProgress(previous.puzzle.id) : undefined;
  const status = puzzleNumber > 1 && !previousProgress?.completed
    ? 'locked'
    : progress?.completed
      ? 'completed'
      : progress
        ? 'in-progress'
        : 'available';

  return Object.freeze({ ...item, status, ...(progress ? { progress } : {}) });
}

/** Return the numbered puzzles and persisted status for a difficulty. */
export function getPuzzleSequence(
  difficulty: Difficulty,
  dependencies: FlowDependencies = {},
): readonly PuzzleProgressionItem[] {
  return Object.freeze(getLocalPuzzleSequence(difficulty)
    .map((item) => getPuzzleProgressionItem(difficulty, item.number, dependencies)!)
    .filter((item): item is PuzzleProgressionItem => Boolean(item)));
}

export function getPuzzleCount(difficulty: Difficulty): number {
  return getLocalPuzzleSequence(difficulty).length;
}

export function getPuzzleStatus(
  difficulty: Difficulty,
  puzzleNumber: number,
  dependencies: FlowDependencies = {},
): PuzzleProgressionItem['status'] | undefined {
  return getPuzzleProgressionItem(difficulty, puzzleNumber, dependencies)?.status;
}

/**
 * @deprecated Compatibility-only helper for the non-user-facing puzzle-loader
 * tests. User-facing flow uses getPuzzleSequence/startSelectedPuzzle.
 */
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
  extra: { readonly startedAt?: string; readonly elapsedSeconds?: number; readonly hintsUsed?: number; readonly checksUsed?: number; readonly dailyDate?: string; readonly dailyDifficulty?: Difficulty; readonly restoreProgress?: Parameters<typeof restoreGameStateFromProgress>[0] } = {},
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
    ...(extra.dailyDifficulty ? { dailyDifficulty: extra.dailyDifficulty } : {}),
  });
}

/** Start a numbered puzzle, restoring any persisted attempt or completed solution. */
export function startSelectedPuzzle(options: SelectedPuzzleOptions): GameFlowSession | undefined {
  const progression = getPuzzleProgressionItem(options.difficulty, options.puzzleNumber, options);
  if (!progression || progression.status === 'locked') return undefined;

  if ((progression.status === 'in-progress' || progression.status === 'completed') && progression.progress) {
    return createSession(
      progression.puzzle,
      'selected-puzzle',
      progression.progress.mode,
      options,
      {
        startedAt: progression.progress.startedAt ?? progression.progress.updatedAt,
        elapsedSeconds: progression.progress.elapsedSeconds,
        hintsUsed: progression.progress.hintsUsed,
        checksUsed: progression.progress.checksUsed ?? 0,
        restoreProgress: progression.progress,
      },
    );
  }

  const session = createSession(progression.puzzle, 'selected-puzzle', options.mode, options);
  persistSession(session, resolveRepository(options), isoNow(options));
  return session;
}

export function startDailyLoop(options: DailyLoopOptions = {}): GameFlowSession {
  const now = resolveNow(options);
  const date = options.date ?? getDailyDateKey(now);
  const difficulty = options.difficulty ?? 'beginner';
  const puzzle = selectDailyPuzzle(date, difficulty);
  if (!puzzle) throw new Error(`No Daily Loop puzzle is scheduled for ${date}/${difficulty}.`);
  const repository = resolveRepository(options);
  const seed = `daily:${date}:${difficulty}`;
  const current = repository.loadDailyState(date, difficulty);
  const previous = current?.puzzleId === puzzle.id
    ? current
    : createDefaultDailyState(date, difficulty, seed, puzzle.id);
  repository.saveDailyState({
    ...previous,
    difficulty,
    puzzleId: puzzle.id,
    seed,
    status: previous.status === 'completed' ? 'completed' : 'in-progress',
  });
  const dailyProgress = repository.loadDailyProgress(date, difficulty);
  const session = createSession(puzzle, 'daily-loop', dailyProgress?.mode ?? options.mode ?? 'relaxed', options, {
    dailyDate: date,
    dailyDifficulty: difficulty,
    startedAt: dailyProgress?.startedAt ?? dailyProgress?.updatedAt,
    elapsedSeconds: dailyProgress?.elapsedSeconds,
    hintsUsed: dailyProgress?.hintsUsed,
    checksUsed: dailyProgress?.checksUsed,
    restoreProgress: dailyProgress?.puzzleId === puzzle.id ? dailyProgress : undefined,
  });
  if (!dailyProgress || dailyProgress.puzzleId !== puzzle.id) {
    persistSession(session, repository, isoNow(options));
  }
  return session;
}

export function getDailyLoopPuzzles(
  date: string,
  dependencies: FlowDependencies = {},
): readonly DailyLoopPuzzleOption[] {
  const repository = resolveRepository(dependencies);
  return Object.freeze((['beginner', 'easy', 'medium', 'hard', 'expert'] as const).map((difficulty) => {
    const puzzle = selectDailyPuzzle(date, difficulty);
    const state = repository.loadDailyState(date, difficulty);
    return Object.freeze({
      difficulty,
      puzzle,
      status: state && puzzle && state.puzzleId === puzzle.id ? state.status : 'not-started',
    });
  }));
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
      dailyDate: summary.progress.dailyDate,
      dailyDifficulty: summary.progress.dailyDifficulty,
      restoreProgress: summary.progress,
    },
  );
}

function persistSession(session: GameFlowSession, repository: PersistenceRepository, updatedAt: string): void {
  const progress = toPlayerProgress({
    puzzleId: session.puzzle.id,
    mode: session.mode,
    edgeStates: session.gameState.edgeStates,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    checksUsed: session.checksUsed,
    completed: session.completed,
    startedAt: session.startedAt,
    completedAt: session.completion?.completedAt,
    dailyDate: session.dailyDate,
    dailyDifficulty: session.dailyDifficulty,
    updatedAt,
  });
  if (session.dailyDate && session.dailyDifficulty) {
    repository.saveDailyProgress(session.dailyDate, session.dailyDifficulty, progress);
  } else {
    repository.saveContinue(progress);
  }
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
    recentEdges: session.gameState.history.past
      .slice()
      .reverse()
      .map(({ edge }) => edge),
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
  const progress = toPlayerProgress({
    puzzleId: session.puzzle.id,
    mode: session.mode,
    edgeStates: session.gameState.edgeStates,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    checksUsed: session.checksUsed,
    completed: true,
    startedAt: session.startedAt,
    completedAt,
    dailyDate: session.dailyDate,
    dailyDifficulty: session.dailyDifficulty,
    updatedAt: completedAt,
  });
  if (session.dailyDate && session.dailyDifficulty) {
    repository.saveDailyProgress(session.dailyDate, session.dailyDifficulty, progress);
  } else {
    repository.saveProgress(progress);
    repository.clearContinue();
  }
  if (session.dailyDate) {
    const difficulty = session.dailyDifficulty ?? session.puzzle.difficulty;
    const previous = repository.loadDailyState(session.dailyDate, difficulty) ?? createDefaultDailyState(session.dailyDate, difficulty, `daily:${session.dailyDate}:${difficulty}`, session.puzzle.id);
    repository.saveDailyState({
      ...previous,
      difficulty,
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

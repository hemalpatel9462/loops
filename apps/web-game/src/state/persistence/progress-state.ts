import type { EdgeId } from '@loops/puzzle-format';
import type { PlayerProgress } from '@loops/puzzle-format';
import {
  createInitialGameState,
  setEdgeState,
} from '@loops/game-engine/state';
import type { EdgeState } from '@loops/game-engine/model';
import type { GameState } from '@loops/game-engine/state';

export interface ProgressSnapshotInput {
  readonly puzzleId: string;
  readonly mode: PlayerProgress['mode'];
  readonly edgeStates: Readonly<Record<string, EdgeState>>;
  readonly elapsedSeconds: number;
  readonly hintsUsed: number;
  readonly checksUsed?: number;
  readonly completed: boolean;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly updatedAt?: string;
  readonly dailyDate?: string;
  readonly dailyDifficulty?: PlayerProgress['dailyDifficulty'];
}

export interface RestoreProgressOptions {
  readonly puzzleId?: string;
  readonly width: number;
  readonly height: number;
  readonly startingEdges: readonly EdgeId[];
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Convert a runtime game snapshot to the approved storage schema. */
export function toPlayerProgress(input: ProgressSnapshotInput): PlayerProgress {
  const edgeStates: Record<string, 'line' | 'x'> = {};
  for (const [edge, state] of Object.entries(input.edgeStates)) {
    if (state === 'line' || state === 'x') edgeStates[edge] = state;
  }
  return {
    schemaVersion: '1.0',
    puzzleId: input.puzzleId,
    mode: input.mode,
    edgeStates,
    elapsedSeconds: input.elapsedSeconds,
    hintsUsed: input.hintsUsed,
    checksUsed: input.checksUsed ?? 0,
    completed: input.completed,
    ...(input.startedAt ? { startedAt: input.startedAt } : {}),
    ...(input.completedAt ? { completedAt: input.completedAt } : {}),
    ...(input.dailyDate ? { dailyDate: input.dailyDate } : {}),
    ...(input.dailyDifficulty ? { dailyDifficulty: input.dailyDifficulty } : {}),
    updatedAt: input.updatedAt ?? nowIso(),
  };
}

/** Restore persisted edge choices on top of a fresh engine state. */
export function restoreGameStateFromProgress(
  progress: PlayerProgress,
  options: RestoreProgressOptions,
): GameState {
  if (options.puzzleId && progress.puzzleId !== options.puzzleId) {
    throw new Error(`Cannot restore ${progress.puzzleId} as ${options.puzzleId}.`);
  }
  let state = createInitialGameState({
    width: options.width,
    height: options.height,
    startingEdges: options.startingEdges,
  });
  for (const [edge, nextState] of Object.entries(progress.edgeStates)) {
    state = setEdgeState(state, edge as EdgeId, nextState);
  }
  return state;
}

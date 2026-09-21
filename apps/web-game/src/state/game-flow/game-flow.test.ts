import { describe, expect, it } from 'vitest';
import { allBoardEdges } from '@loops/game-engine/model';
import { MemoryStorage, createPersistenceRepository } from '../../persistence';
import {
  completeSession,
  cycleSessionEdge,
  getPuzzleCount,
  getPuzzleSequence,
  getPuzzleStatus,
  getContinueProgress,
  getDailyLoopPuzzles,
  resumeContinue,
  selectDailyPuzzle,
  startDailyLoop,
  startSelectedPuzzle,
  updateElapsedTime,
} from './game-flow';

function dependencies() {
  return {
    repository: createPersistenceRepository(new MemoryStorage()),
    now: () => new Date('2026-09-18T12:00:00.000Z'),
  };
}

describe('game flow', () => {
  it('exposes deterministic one-based sequences in validated catalog order', () => {
    const flow = dependencies();
    const first = getPuzzleSequence('beginner', flow);
    const second = getPuzzleSequence('beginner', flow);
    expect(first.map((item) => item.number)).toEqual(
      Array.from({ length: getPuzzleCount('beginner') }, (_, index) => index + 1),
    );
    expect(first.map((item) => item.puzzle.id)).toEqual(second.map((item) => item.puzzle.id));
    expect(first.length).toBe(getPuzzleCount('beginner'));
  });

  it('derives available, locked, in-progress, and completed status from per-puzzle progress', () => {
    const storage = new MemoryStorage();
    const flow = {
      repository: createPersistenceRepository(storage),
      now: () => new Date('2026-09-18T12:00:00.000Z'),
    };
    const sequence = getPuzzleSequence('beginner', flow);
    expect(sequence.slice(0, 3).map((item) => item.status)).toEqual(['available', 'locked', 'locked']);
    expect(sequence.slice(3).every((item) => item.status === 'locked')).toBe(true);

    const first = sequence[0].puzzle;
    flow.repository.saveProgress({
      schemaVersion: '1.0',
      puzzleId: first.id,
      mode: 'relaxed',
      edgeStates: {},
      elapsedSeconds: 8,
      hintsUsed: 1,
      checksUsed: 2,
      completed: false,
      updatedAt: '2026-09-18T12:00:00.000Z',
    });
    expect(getPuzzleStatus('beginner', 1, flow)).toBe('in-progress');
    expect(getPuzzleSequence('beginner', flow).slice(0, 3).map((item) => item.status)).toEqual(['in-progress', 'locked', 'locked']);

    flow.repository.saveProgress({
      schemaVersion: '1.0',
      puzzleId: first.id,
      mode: 'relaxed',
      edgeStates: {},
      elapsedSeconds: 8,
      hintsUsed: 1,
      checksUsed: 2,
      completed: true,
      completedAt: '2026-09-18T12:00:00.000Z',
      updatedAt: '2026-09-18T12:00:00.000Z',
    });
    const reloadedFlow = {
      repository: createPersistenceRepository(storage),
      now: flow.now,
    };
    expect(getPuzzleSequence('beginner', reloadedFlow).slice(0, 3).map((item) => item.status)).toEqual(['completed', 'available', 'locked']);
    flow.repository.saveProgress({
      schemaVersion: '1.0',
      puzzleId: sequence[1].puzzle.id,
      mode: 'assisted',
      edgeStates: {},
      elapsedSeconds: 4,
      hintsUsed: 0,
      completed: true,
      completedAt: '2026-09-18T12:00:00.000Z',
      updatedAt: '2026-09-18T12:00:00.000Z',
    });
    expect(getPuzzleSequence('beginner', flow).slice(0, 3).map((item) => item.status)).toEqual(['completed', 'completed', 'available']);
  });

  it('starts an available selected puzzle and persists unfinished progress', () => {
    const flow = dependencies();
    const selected = startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 1, mode: 'relaxed', ...flow });
    expect(selected?.source).toBe('selected-puzzle');
    expect(selected?.puzzle.difficulty).toBe('beginner');
    expect(selected?.puzzle.solutionEdges.length).toBeGreaterThan(0);
    expect(getPuzzleStatus('beginner', 1, flow)).toBe('in-progress');
    expect(getContinueProgress(flow)?.progress.puzzleId).toBe(selected?.puzzle.id);

    const unknownEdge = allBoardEdges(selected!.puzzle.width, selected!.puzzle.height)
      .find((edge) => !selected!.gameState.fixedEdges.includes(edge));
    expect(unknownEdge).toBeDefined();
    const updated = updateElapsedTime(cycleSessionEdge(selected!, unknownEdge!, flow), 12, flow);
    expect(getContinueProgress(flow)?.progress.puzzleId).toBe(selected!.puzzle.id);
    expect(updated.elapsedSeconds).toBe(12);
  });

  it('resumes unfinished selected progress and preserves its saved session fields', () => {
    const flow = dependencies();
    const started = startSelectedPuzzle({ difficulty: 'easy', puzzleNumber: 1, mode: 'assisted', ...flow });
    const edge = allBoardEdges(started!.puzzle.width, started!.puzzle.height)
      .find((candidate) => !started!.gameState.fixedEdges.includes(candidate));
    expect(edge).toBeDefined();
    const moved = updateElapsedTime({
      ...cycleSessionEdge(started!, edge!, flow),
      hintsUsed: 3,
      checksUsed: 4,
    }, 42, flow);
    const resumed = startSelectedPuzzle({ difficulty: 'easy', puzzleNumber: 1, mode: 'relaxed', ...flow });
    expect(resumed?.mode).toBe('assisted');
    expect(resumed?.elapsedSeconds).toBe(42);
    expect(resumed?.hintsUsed).toBe(moved.hintsUsed);
    expect(resumed?.checksUsed).toBe(moved.checksUsed);
    expect(resumed?.gameState.edgeStates[edge!]).toBe(moved.gameState.edgeStates[edge!]);
  });

  it('rejects invalid and locked selections without creating progress, then allows completed replay', () => {
    const flow = dependencies();
    expect(startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 2, mode: 'relaxed', ...flow })).toBeUndefined();
    expect(startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 0, mode: 'relaxed', ...flow })).toBeUndefined();
    expect(startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 99, mode: 'relaxed', ...flow })).toBeUndefined();
    expect(flow.repository.loadProgress(getPuzzleSequence('beginner', flow)[1].puzzle.id)).toBeUndefined();

    const first = startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 1, mode: 'relaxed', ...flow });
    let completed = first!;
    for (const edge of completed.puzzle.solutionEdges) completed = cycleSessionEdge(completed, edge, flow);
    completeSession(completed, flow);
    const replay = startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 1, mode: 'assisted', ...flow });
    expect(replay?.source).toBe('selected-puzzle');
    expect(replay?.completed).toBe(true);
    expect(replay?.gameState.edgeStates[completed.puzzle.solutionEdges[0]]).toBe('line');
    expect(flow.repository.loadProgress(first!.puzzle.id)?.completed).toBe(true);
  });

  it('selects the manually assigned Daily Loop puzzle by date and difficulty', () => {
    const first = selectDailyPuzzle('2026-09-18', 'beginner');
    const second = selectDailyPuzzle('2026-09-18', 'beginner');
    expect(first?.id).toBe(second?.id);

    const flow = dependencies();
    const session = startDailyLoop({ date: '2026-09-18', difficulty: 'beginner', ...flow });
    expect(session.source).toBe('daily-loop');
    expect(session.dailyDate).toBe('2026-09-18');
    expect(session.dailyDifficulty).toBe('beginner');
    expect(flow.repository.loadDailyState('2026-09-18', 'beginner')?.puzzleId).toBe(session.puzzle.id);
    expect(selectDailyPuzzle('2026-09-18', 'expert')?.difficulty).toBe('expert');
    expect(selectDailyPuzzle('2026-09-22', 'hard')?.id).toBe('loop-hard-daily-2026-09-22-hard');
    expect(selectDailyPuzzle('2026-09-19', 'beginner')).toBeUndefined();
  });

  it('tracks and restores Daily Loop progress independently for each difficulty', () => {
    const flow = dependencies();
    const started = startDailyLoop({ date: '2026-09-18', difficulty: 'beginner', ...flow });
    const edge = allBoardEdges(started.puzzle.width, started.puzzle.height)
      .find((candidate) => !started.gameState.fixedEdges.includes(candidate));
    expect(edge).toBeDefined();
    const moved = cycleSessionEdge(started, edge!, flow);

    startDailyLoop({ date: '2026-09-18', difficulty: 'expert', ...flow });
    expect(getDailyLoopPuzzles('2026-09-18', flow).map((item) => item.status)).toEqual([
      'in-progress', 'not-started', 'not-started', 'not-started', 'in-progress',
    ]);

    const resumed = startDailyLoop({ date: '2026-09-18', difficulty: 'beginner', ...flow });
    expect(resumed.gameState.edgeStates[edge!]).toBe(moved.gameState.edgeStates[edge!]);
    expect(resumed.elapsedSeconds).toBe(moved.elapsedSeconds);
  });

  it('resumes Continue with the saved mode, elapsed time, hints, and edge choices', () => {
    const flow = dependencies();
    const started = startSelectedPuzzle({ difficulty: 'easy', puzzleNumber: 1, mode: 'assisted', ...flow })!;
    const edge = allBoardEdges(started.puzzle.width, started.puzzle.height)
      .find((candidate) => !started.gameState.fixedEdges.includes(candidate));
    expect(edge).toBeDefined();
    const moved = updateElapsedTime({
      ...cycleSessionEdge(started, edge!, flow),
      hintsUsed: 5,
      checksUsed: 6,
    }, 42, flow);
    const resumed = resumeContinue(flow);
    expect(resumed?.source).toBe('continue');
    expect(resumed?.mode).toBe('assisted');
    expect(resumed?.elapsedSeconds).toBe(42);
    expect(resumed?.hintsUsed).toBe(5);
    expect(resumed?.checksUsed).toBe(6);
    expect(resumed?.gameState.edgeStates[edge!]).toBe(moved.gameState.edgeStates[edge!]);
  });

  it('flags an immediately contradictory move in Assisted mode but allows it in Relaxed mode', () => {
    const flow = dependencies();
    const assisted = startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 1, mode: 'assisted', ...flow })!;
    const relaxedFlow = dependencies();
    const relaxed = startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 1, mode: 'relaxed', ...relaxedFlow })!;
    const candidates = allBoardEdges(assisted.puzzle.width, assisted.puzzle.height)
      .filter((edge) => !assisted.gameState.fixedEdges.includes(edge));
    const rejected = candidates
      .map((edge) => ({ edge, result: cycleSessionEdge(assisted, edge, flow) }))
      .find(({ result }) => result.lastMove?.accepted === false);
    expect(rejected).toBeDefined();
    const relaxedResult = cycleSessionEdge(relaxed, rejected!.edge, relaxedFlow);
    expect(relaxedResult.lastMove?.accepted).toBe(true);
    expect(relaxedResult.gameState).not.toBe(relaxed.gameState);
  });

  it('records completion time and hint count in completion statistics', () => {
    const flow = dependencies();
    let session = startSelectedPuzzle({ difficulty: 'beginner', puzzleNumber: 1, mode: 'relaxed', ...flow })!;
    for (const edge of session.puzzle.solutionEdges) {
      const next = cycleSessionEdge(session, edge, flow);
      session = next;
    }
    session = updateElapsedTime(session, 87, flow);
    session = { ...session, hintsUsed: 2 };
    const completed = completeSession(session, flow);
    expect(completed.completed).toBe(true);
    expect(completed.completion?.elapsedSeconds).toBe(87);
    expect(completed.completion?.hintsUsed).toBe(2);
    expect(flow.repository.getStatistics().totalCompleted).toBe(1);
    expect(flow.repository.loadContinue()).toBeUndefined();
  });
});

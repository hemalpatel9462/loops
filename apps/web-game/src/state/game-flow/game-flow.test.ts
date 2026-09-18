import { describe, expect, it } from 'vitest';
import { allBoardEdges } from '@loops/game-engine/model';
import { MemoryStorage, createPersistenceRepository } from '../../persistence';
import {
  completeSession,
  cycleSessionEdge,
  getContinueProgress,
  resumeContinue,
  selectDailyPuzzle,
  startDailyLoop,
  startQuickPlay,
  updateElapsedTime,
} from './game-flow';

function dependencies() {
  return {
    repository: createPersistenceRepository(new MemoryStorage()),
    now: () => new Date('2026-09-18T12:00:00.000Z'),
  };
}

describe('game flow', () => {
  it('selects a validated local puzzle for Quick Play and persists unfinished progress', () => {
    const flow = dependencies();
    const session = startQuickPlay({ difficulty: 'beginner', mode: 'relaxed', ...flow });
    expect(session.source).toBe('quick-play');
    expect(session.puzzle.difficulty).toBe('beginner');
    expect(session.puzzle.solutionEdges.length).toBeGreaterThan(0);

    const unknownEdge = allBoardEdges(session.puzzle.width, session.puzzle.height)
      .find((edge) => !session.gameState.fixedEdges.includes(edge));
    expect(unknownEdge).toBeDefined();
    const updated = updateElapsedTime(cycleSessionEdge(session, unknownEdge!, flow), 12, flow);
    expect(getContinueProgress(flow)?.progress.puzzleId).toBe(session.puzzle.id);
    expect(updated.elapsedSeconds).toBe(12);
  });

  it('selects Daily Loop deterministically by date and stores the date mapping', () => {
    const first = selectDailyPuzzle('2026-09-18');
    const second = selectDailyPuzzle('2026-09-18');
    expect(first.id).toBe(second.id);

    const flow = dependencies();
    const session = startDailyLoop({ date: '2026-09-18', ...flow });
    expect(session.source).toBe('daily-loop');
    expect(session.dailyDate).toBe('2026-09-18');
    expect(flow.repository.loadDailyState('2026-09-18')?.puzzleId).toBe(session.puzzle.id);
  });

  it('resumes Continue with the saved mode, elapsed time, hints, and edge choices', () => {
    const flow = dependencies();
    const started = startQuickPlay({ difficulty: 'easy', mode: 'assisted', ...flow });
    const edge = allBoardEdges(started.puzzle.width, started.puzzle.height)
      .find((candidate) => !started.gameState.fixedEdges.includes(candidate));
    expect(edge).toBeDefined();
    const moved = updateElapsedTime(cycleSessionEdge(started, edge!, flow), 42, flow);
    const resumed = resumeContinue(flow);
    expect(resumed?.source).toBe('continue');
    expect(resumed?.mode).toBe('assisted');
    expect(resumed?.elapsedSeconds).toBe(42);
    expect(resumed?.gameState.edgeStates[edge!]).toBe(moved.gameState.edgeStates[edge!]);
  });

  it('flags an immediately contradictory move in Assisted mode but allows it in Relaxed mode', () => {
    const flow = dependencies();
    const assisted = startQuickPlay({ difficulty: 'beginner', mode: 'assisted', ...flow });
    const relaxed = startQuickPlay({ difficulty: 'beginner', mode: 'relaxed', ...flow });
    const candidates = allBoardEdges(assisted.puzzle.width, assisted.puzzle.height)
      .filter((edge) => !assisted.gameState.fixedEdges.includes(edge));
    const rejected = candidates
      .map((edge) => ({ edge, result: cycleSessionEdge(assisted, edge, flow) }))
      .find(({ result }) => result.lastMove?.accepted === false);
    expect(rejected).toBeDefined();
    const relaxedResult = cycleSessionEdge(relaxed, rejected!.edge, flow);
    expect(relaxedResult.lastMove?.accepted).toBe(true);
    expect(relaxedResult.gameState).not.toBe(relaxed.gameState);
  });

  it('records completion time and hint count in completion statistics', () => {
    const flow = dependencies();
    let session = startQuickPlay({ difficulty: 'beginner', mode: 'relaxed', ...flow });
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

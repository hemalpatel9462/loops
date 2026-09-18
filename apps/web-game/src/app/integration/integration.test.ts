import { describe, expect, it } from 'vitest';
import { allBoardEdges } from '@loops/game-engine/model';
import { createGameReducerState, gameReducer } from '../../state/game-reducer';
import { loadQuickPlayPuzzle } from './puzzle-loader';

describe('web game integration', () => {
  it('loads a parsed PuzzleDefinition from the bundled catalog', () => {
    const puzzle = loadQuickPlayPuzzle('beginner');
    expect(puzzle.schemaVersion).toBe('1.0');
    expect(puzzle.clues).toHaveLength(puzzle.height);
    expect(puzzle.solutionEdges.length).toBeGreaterThan(0);
  });

  it('routes edge actions through engine state transitions', () => {
    const puzzle = loadQuickPlayPuzzle('beginner');
    const state = createGameReducerState(puzzle);
    const edge = allBoardEdges(puzzle.width, puzzle.height)
      .find((candidate) => !state.gameState.fixedEdges.includes(candidate));
    expect(edge).toBeDefined();

    const next = gameReducer(state, { type: 'cycle-edge', edge: edge! });
    expect(next.gameState.edgeStates[edge!]).toBe('line');
    expect(next.gameState.history.past).toHaveLength(1);
  });

  it('uses engine deductions for hints and engine validation for completion', () => {
    const puzzle = loadQuickPlayPuzzle('beginner');
    let state = createGameReducerState(puzzle);
    state = gameReducer(state, { type: 'request-hint', level: 2 });
    expect(state.hint).toBeDefined();
    expect(state.hintsUsed).toBe(1);

    for (const edge of puzzle.solutionEdges) {
      state = gameReducer(state, { type: 'set-edge', edge, state: 'line' });
    }
    state = gameReducer(state, { type: 'complete' });
    expect(state.validation?.complete).toBe(true);
    expect(state.completed).toBe(true);
  });
});

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
    expect(state.validation?.complete).toBe(true);
    expect(state.completed).toBe(true);
  });

  it('confirms an already-applied hint without cycling it to the next edge state', () => {
    const puzzle = loadQuickPlayPuzzle('beginner');
    let state = createGameReducerState(puzzle);
    state = gameReducer(state, { type: 'request-hint', level: 3 });

    const hint = state.hint?.reveal;
    expect(hint).toBeDefined();
    expect(state.gameState.edgeStates[hint!.edge]).toBe(hint!.state);

    const confirmed = gameReducer(state, { type: 'apply-hint' });

    expect(confirmed.gameState.edgeStates[hint!.edge]).toBe(hint!.state);
    expect(confirmed.hint).toBeUndefined();
  });
});

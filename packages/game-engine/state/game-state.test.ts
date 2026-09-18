import { describe, expect, it } from 'vitest';
import { createEdgeId } from '@loops/puzzle-format';
import {
  canRedo,
  canUndo,
  createInitialGameState,
  cycleEdge,
  redo,
  setEdgeState,
  undo,
} from './game-state';

const topLeft = createEdgeId('h', 0, 0);
const topRight = createEdgeId('h', 0, 1);

function createState() {
  return createInitialGameState({
    width: 2,
    height: 2,
    startingEdges: [topLeft],
  });
}

describe('game state transitions', () => {
  it('represents fixed lines and unknown editable edges', () => {
    const state = createState();
    expect(state.edgeStates[topLeft]).toBe('line');
    expect(state.edgeStates[topRight]).toBe('unknown');
    expect(state.fixedEdges).toEqual([topLeft]);
  });

  it('does not change fixed starting edges', () => {
    const state = createState();
    expect(cycleEdge(state, topLeft)).toBe(state);
    expect(setEdgeState(state, topLeft, 'x')).toBe(state);
    expect(state.edgeStates[topLeft]).toBe('line');
  });

  it('cycles editable states and records deterministic history', () => {
    const initial = createState();
    const line = cycleEdge(initial, topRight);
    const excluded = cycleEdge(line, topRight);
    const cleared = cycleEdge(excluded, topRight);

    expect(line.edgeStates[topRight]).toBe('line');
    expect(excluded.edgeStates[topRight]).toBe('x');
    expect(cleared.edgeStates[topRight]).toBe('unknown');
    expect(initial.edgeStates[topRight]).toBe('unknown');
    expect(cleared.history.past).toHaveLength(3);
    expect(cleared.history.past.map(({ before, after }) => [before, after])).toEqual([
      ['unknown', 'line'],
      ['line', 'x'],
      ['x', 'unknown'],
    ]);
  });

  it('supports undo, redo, and redo invalidation after a new edit', () => {
    const initial = createState();
    const edited = cycleEdge(initial, topRight);
    const undone = undo(edited);
    expect(undone.edgeStates[topRight]).toBe('unknown');
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);

    const redone = redo(undone);
    expect(redone.edgeStates[topRight]).toBe('line');
    expect(canUndo(redone)).toBe(true);
    expect(canRedo(redone)).toBe(false);

    const branched = cycleEdge(undone, topRight);
    expect(branched.edgeStates[topRight]).toBe('line');
    expect(canRedo(branched)).toBe(false);
  });

  it('throws for an edge outside the board without mutating the input', () => {
    const state = createState();
    const outside = createEdgeId('h', 3, 0);
    expect(() => cycleEdge(state, outside)).toThrow(RangeError);
    expect(state.history.past).toHaveLength(0);
  });
});

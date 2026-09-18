import { describe, expect, it } from 'vitest';
import { createEdgeId } from '@loops/puzzle-format';
import {
  applyHintToEdgeStates,
  computeHint,
  findDeductions,
} from './hint-engine';

const puzzle = {
  id: 'loop-hint-fixture',
  width: 2,
  height: 2,
  clues: [
    [1, 0],
    [0, 0],
  ],
} as const;

const topLeft = createEdgeId('h', 0, 0);
const topRight = createEdgeId('h', 0, 1);
const left = createEdgeId('v', 0, 0);
const state = Object.freeze({
  edgeStates: Object.freeze({
    [topLeft]: 'line' as const,
    [topRight]: 'unknown' as const,
    [left]: 'unknown' as const,
    [createEdgeId('h', 1, 0)]: 'x' as const,
    [createEdgeId('v', 0, 1)]: 'x' as const,
  }),
  fixedEdges: Object.freeze([topLeft]),
});

describe('runtime hint deductions', () => {
  it('exposes highlight, explanation, and reveal levels', () => {
    const highlight = computeHint(puzzle, state, 1);
    const explanation = computeHint(puzzle, state, 2);
    const reveal = computeHint(puzzle, state, 3);

    expect(highlight?.hintLevel).toBe(1);
    expect(highlight?.highlight?.edge).toBeDefined();
    expect(highlight?.explanation).toBeUndefined();
    expect(explanation?.explanation).toContain('Cell');
    expect(reveal?.reveal?.edge).toBeDefined();
    expect(reveal?.reveal?.state).toBe('x');
  });

  it('reports evidence-backed direct-clue deductions as forced', () => {
    const result = findDeductions(puzzle, state);
    const deduction = result.deductions.find((candidate) => candidate.targetEdge === left);

    expect(deduction?.deductionType).toBe('direct-clue');
    expect(deduction?.evidence.forced).toBe(true);
    expect(deduction?.evidence.alternatives).toEqual([
      { state: 'x', allowed: true },
      { state: 'line', allowed: false },
    ]);
  });

  it('does not mutate state until a caller applies a reveal', () => {
    const before = JSON.stringify(state.edgeStates);
    const hint = computeHint(puzzle, state, 3);
    expect(JSON.stringify(state.edgeStates)).toBe(before);
    expect(hint?.reveal).toBeDefined();

    const updated = applyHintToEdgeStates(state.edgeStates, hint!);
    expect(updated).not.toBe(state.edgeStates);
    expect(updated[hint!.reveal!.edge]).toBe('x');
    expect(state.edgeStates[hint!.reveal!.edge]).toBe('unknown');
  });

  it('supports vertex, connectivity, and contradiction deduction categories', () => {
    const vertexPuzzle = { ...puzzle, clues: [[3, 0], [0, 0]] };
    const vertexState = { edgeStates: { [topLeft]: 'line' as const, [left]: 'line' as const } };
    const vertexResult = findDeductions(vertexPuzzle, vertexState);
    expect(vertexResult.deductions.some(({ deductionType }) => deductionType === 'vertex')).toBe(true);

    const connectivityPuzzle = { ...puzzle, clues: [[1, 1], [1, 1]] };
    const connectivityState = {
      edgeStates: {
        [createEdgeId('h', 0, 0)]: 'line' as const,
        [createEdgeId('h', 0, 1)]: 'line' as const,
        [createEdgeId('v', 0, 0)]: 'line' as const,
        [createEdgeId('v', 1, 0)]: 'line' as const,
      },
    };
    const connectivityResult = findDeductions(connectivityPuzzle, connectivityState);
    expect(connectivityResult.deductions.every(({ deductionType }) =>
      ['direct-clue', 'vertex', 'connectivity', 'contradiction'].includes(deductionType))).toBe(true);

    const prematureLoopPuzzle = {
      width: 3,
      height: 3,
      clues: [
        [2, 2, 1],
        [2, 2, 1],
        [1, 1, 1],
      ],
    } as const;
    const prematureLoopState = {
      edgeStates: {
        [createEdgeId('h', 0, 0)]: 'line' as const,
        [createEdgeId('h', 0, 1)]: 'line' as const,
        [createEdgeId('h', 2, 0)]: 'line' as const,
        [createEdgeId('h', 2, 1)]: 'line' as const,
        [createEdgeId('v', 0, 0)]: 'line' as const,
        [createEdgeId('v', 1, 0)]: 'line' as const,
        [createEdgeId('v', 0, 2)]: 'line' as const,
        [createEdgeId('v', 1, 2)]: 'unknown' as const,
        [createEdgeId('h', 3, 2)]: 'line' as const,
      },
    };
    const prematureLoopResult = findDeductions(prematureLoopPuzzle, prematureLoopState);
    expect(prematureLoopResult.deductions.some(({ deductionType }) => deductionType === 'connectivity')).toBe(true);
    expect(prematureLoopResult.deductions.some(({ deductionType }) => deductionType === 'contradiction')).toBe(true);
  });
});

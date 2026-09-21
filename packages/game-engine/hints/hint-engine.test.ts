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

const linePuzzle = {
  id: 'loop-hint-line-fixture',
  width: 2,
  height: 2,
  clues: [
    [3, 0],
    [0, 0],
  ],
} as const;

const lineState = Object.freeze({
  edgeStates: Object.freeze({
    [topLeft]: 'line' as const,
  }),
  fixedEdges: Object.freeze([topLeft]),
});

const completedLinesPuzzle = {
  id: 'loop-hint-optional-x-fixture',
  width: 2,
  height: 2,
  clues: [
    [2, 2],
    [2, 2],
  ],
  solutionEdges: [
    createEdgeId('h', 0, 0),
    createEdgeId('h', 0, 1),
    createEdgeId('h', 2, 0),
    createEdgeId('h', 2, 1),
    createEdgeId('v', 0, 0),
    createEdgeId('v', 0, 2),
    createEdgeId('v', 1, 0),
    createEdgeId('v', 1, 2),
  ],
} as const;

const completedLinesState = {
  edgeStates: Object.fromEntries(
    completedLinesPuzzle.solutionEdges.map((edge) => [edge, 'line' as const]),
  ),
};

describe('runtime hint deductions', () => {
  it('exposes highlight, explanation, and reveal levels', () => {
    const highlight = computeHint(linePuzzle, lineState, 1);
    const explanation = computeHint(linePuzzle, lineState, 2);
    const reveal = computeHint(linePuzzle, lineState, 3);

    expect(highlight?.hintLevel).toBe(1);
    expect(highlight?.highlight?.edge).toBeDefined();
    expect(highlight?.explanation).toBeUndefined();
    expect(explanation?.explanation).toMatch(/Cell|Vertex/);
    expect(reveal?.reveal?.edge).toBeDefined();
    expect(reveal?.reveal?.state).toBe('line');
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
    const before = JSON.stringify(lineState.edgeStates);
    const hint = computeHint(linePuzzle, lineState, 3);
    expect(JSON.stringify(lineState.edgeStates)).toBe(before);
    expect(hint?.reveal).toBeDefined();

    const updated = applyHintToEdgeStates(lineState.edgeStates, hint!);
    expect(updated).not.toBe(lineState.edgeStates);
    expect(updated[hint!.reveal!.edge]).toBe('line');
    expect(lineState.edgeStates[hint!.reveal!.edge]).toBeUndefined();
  });

  it('does not select optional X deductions as user-facing hints', () => {
    expect(computeHint(completedLinesPuzzle, completedLinesState, 3)).toBeUndefined();
  });

  it('prioritizes the most recent incorrect mark over earlier logical X deductions', () => {
    const solutionEdges = [
      createEdgeId('h', 0, 0),
      createEdgeId('h', 0, 1),
      createEdgeId('h', 2, 0),
      createEdgeId('h', 2, 1),
      createEdgeId('v', 0, 0),
      createEdgeId('v', 0, 2),
      createEdgeId('v', 1, 0),
      createEdgeId('v', 1, 2),
    ];
    const wrongEdge = createEdgeId('h', 1, 0);
    const mistakePuzzle = {
      width: 2,
      height: 2,
      clues: [[2, 2], [2, 2]],
      solutionEdges,
    } as const;
    const mistakeState = {
      edgeStates: {
        [wrongEdge]: 'line' as const,
        [createEdgeId('h', 0, 0)]: 'x' as const,
      },
      recentEdges: [wrongEdge, createEdgeId('h', 0, 0)],
    };

    const hint = computeHint(mistakePuzzle, mistakeState, 3);

    expect(hint?.deductionType).toBe('player-mistake');
    expect(hint?.targetEdge).toBe(wrongEdge);
    expect(hint?.reveal).toEqual({ edge: wrongEdge, state: 'unknown' });

    const corrected = applyHintToEdgeStates(mistakeState.edgeStates, hint!);
    expect(corrected[wrongEdge]).toBe('unknown');

    const wrongX = findDeductions(mistakePuzzle, mistakeState).deductions
      .find((deduction) => deduction.targetEdge === createEdgeId('h', 0, 0));
    expect(wrongX?.recommendedState).toBe('line');
  });

  it('keeps a hint near the latest move when multiple deductions are available', () => {
    const hint = computeHint(linePuzzle, {
      ...lineState,
      recentEdges: [createEdgeId('h', 0, 1)],
    }, 3);

    expect(hint?.targetEdge).toBe(createEdgeId('h', 0, 1));
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

import {
  createEdgeId,
  type EdgeId,
  type PuzzleDefinition,
} from '@loops/puzzle-format';

export type PuzzleFixtureName =
  | 'validLoop'
  | 'branch'
  | 'openPath'
  | 'multipleLoops'
  | 'clueError';

export interface PuzzleFixture {
  readonly name: PuzzleFixtureName;
  readonly puzzle: PuzzleDefinition;
  readonly selectedEdges: readonly EdgeId[];
}

export interface InvalidPuzzleFixture {
  readonly name: 'clueError';
  readonly puzzle: unknown;
}

const e = createEdgeId;

const perimeter2x2 = [
  e('h', 0, 0),
  e('h', 0, 1),
  e('h', 2, 0),
  e('h', 2, 1),
  e('v', 0, 0),
  e('v', 1, 0),
  e('v', 0, 2),
  e('v', 1, 2),
] as const;

const branchEdges = [
  e('h', 0, 0),
  e('h', 0, 1),
  e('v', 0, 0),
  e('v', 0, 1),
] as const;

const openPathEdges = [
  e('h', 0, 0),
  e('h', 0, 1),
  e('h', 0, 2),
  e('v', 0, 3),
] as const;

const firstSmallLoop = [
  e('h', 0, 0),
  e('h', 0, 1),
  e('h', 2, 0),
  e('h', 2, 1),
  e('v', 0, 0),
  e('v', 1, 0),
  e('v', 0, 2),
  e('v', 1, 2),
] as const;

const secondSmallLoop = [
  e('h', 2, 2),
  e('h', 2, 3),
  e('h', 4, 2),
  e('h', 4, 3),
  e('v', 2, 2),
  e('v', 3, 2),
  e('v', 2, 4),
  e('v', 3, 4),
] as const;

function makePuzzle(
  id: string,
  width: number,
  height: number,
  clues: readonly (readonly number[])[],
  solutionEdges: readonly EdgeId[],
  startingEdges: readonly EdgeId[] = [],
): PuzzleDefinition {
  return {
    schemaVersion: '1.0',
    id: `loop-${id}`,
    seed: `fixture-${id}`,
    generatorVersion: 'fixture-1.0.0',
    width,
    height,
    difficulty: 'beginner',
    clues,
    solutionEdges,
    startingEdges,
    metadata: {
      loopLength: solutionEdges.length,
      complexityScore: 0.25,
      difficultyScore: 0.1,
      turnCount: 4,
      regionalCoverage: 1,
      startingEdgeRatio:
        solutionEdges.length === 0 ? 0 : startingEdges.length / solutionEdges.length,
    },
  };
}

/** A complete 2×2 perimeter loop with every clue satisfied by the loop. */
export const validLoopPuzzle = makePuzzle(
  'valid-loop',
  2,
  2,
  [
    [2, 2],
    [2, 2],
  ],
  perimeter2x2,
  [e('h', 0, 0), e('h', 0, 1)],
);

/** A structurally valid puzzle whose selected edges contain a degree-three branch. */
export const branchPuzzle = makePuzzle(
  'branch',
  3,
  3,
  [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  branchEdges,
  [e('h', 0, 0)],
);

/** A structurally valid puzzle whose selected edges form an open path. */
export const openPathPuzzle = makePuzzle(
  'open-path',
  3,
  3,
  [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  openPathEdges,
);

/** A 4×4 puzzle containing two disconnected one-cell loops. */
export const multipleLoopsPuzzle = makePuzzle(
  'multiple-loops',
  4,
  4,
  [
    [2, 2, 0, 0],
    [2, 2, 0, 0],
    [0, 0, 2, 2],
    [0, 0, 2, 2],
  ],
  [...firstSmallLoop, ...secondSmallLoop],
);

/** Invalid at the schema/contract layer: clue values must be in the range 0–3. */
export const clueErrorPuzzle: unknown = {
  ...validLoopPuzzle,
  id: 'loop-clue-error',
  seed: 'fixture-clue-error',
  clues: [
    [4, 2],
    [2, 2],
  ],
};

export const validPuzzleFixtures = Object.freeze({
  validLoop: validLoopPuzzle,
  branch: branchPuzzle,
  openPath: openPathPuzzle,
  multipleLoops: multipleLoopsPuzzle,
});

export const invalidPuzzleFixtures = Object.freeze({
  clueError: clueErrorPuzzle,
});

export const puzzleFixtures: readonly PuzzleFixture[] = Object.freeze([
  {
    name: 'validLoop',
    puzzle: validLoopPuzzle,
    selectedEdges: perimeter2x2,
  },
  {
    name: 'branch',
    puzzle: branchPuzzle,
    selectedEdges: branchEdges,
  },
  {
    name: 'openPath',
    puzzle: openPathPuzzle,
    selectedEdges: openPathEdges,
  },
  {
    name: 'multipleLoops',
    puzzle: multipleLoopsPuzzle,
    selectedEdges: [...firstSmallLoop, ...secondSmallLoop],
  },
]);

export const invalidFixtures: readonly InvalidPuzzleFixture[] = Object.freeze([
  { name: 'clueError', puzzle: clueErrorPuzzle },
]);

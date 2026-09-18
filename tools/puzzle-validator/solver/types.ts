import type { EdgeId, PuzzleDefinition, SolutionCount, SolverReport } from '@loops/puzzle-format';

export type SolverEdgeState = 'line' | 'excluded';

export interface SolverOptions {
  /** Additional guaranteed line edges; puzzle.startingEdges are always included. */
  readonly fixedEdges?: readonly EdgeId[];
  /** Edges that are guaranteed not to be part of a solution. */
  readonly excludedEdges?: readonly EdgeId[];
}

export interface SolverResult {
  readonly report: SolverReport;
  readonly solutionCount: SolutionCount;
  readonly solutions: readonly (readonly EdgeId[])[];
  readonly exploredNodes: number;
}

export interface SolverInput {
  readonly puzzle: PuzzleDefinition;
  readonly options?: SolverOptions;
}

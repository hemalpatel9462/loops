import type { EdgeId, Difficulty, PuzzleDefinition, SolverReport } from '@loops/puzzle-format';
import type { CandidateLoop } from '../src/types.ts';

export interface DifficultyPipelineProfile {
  readonly width: number;
  readonly height: number;
  readonly startingEdgeRatio: { readonly min: number; readonly max: number };
  readonly minRowsUsed: number;
  readonly minColumnsUsed: number;
}

export const DIFFICULTY_PROFILES: Readonly<Record<Difficulty, DifficultyPipelineProfile>> = {
  beginner: {
    width: 4,
    height: 4,
    startingEdgeRatio: { min: 0.4, max: 0.5 },
    minRowsUsed: 3,
    minColumnsUsed: 3,
  },
  easy: {
    width: 5,
    height: 5,
    startingEdgeRatio: { min: 0.25, max: 0.3 },
    minRowsUsed: 4,
    minColumnsUsed: 4,
  },
  medium: {
    width: 7,
    height: 7,
    startingEdgeRatio: { min: 0.15, max: 0.2 },
    minRowsUsed: 5,
    minColumnsUsed: 5,
  },
  hard: {
    width: 8,
    height: 8,
    startingEdgeRatio: { min: 0.1, max: 0.15 },
    minRowsUsed: 6,
    minColumnsUsed: 6,
  },
  expert: {
    width: 10,
    height: 10,
    startingEdgeRatio: { min: 0.05, max: 0.1 },
    minRowsUsed: 8,
    minColumnsUsed: 8,
  },
};

export interface PipelineConfig {
  readonly difficulty: Difficulty;
  readonly seed: string;
  readonly generatorVersion?: string;
  readonly width?: number;
  readonly height?: number;
  readonly maxAttempts?: number;
  readonly searchBudget?: number;
}

export interface StartingEdgeScore {
  readonly edge: EdgeId;
  readonly score: number;
  readonly adjacentClues: readonly number[];
  readonly deductionValue: string;
}

export interface StartingEdgeSelection {
  readonly edges: readonly EdgeId[];
  readonly targetRatio: number;
  readonly scores: readonly StartingEdgeScore[];
}

export interface PipelineAttempt {
  readonly candidate: CandidateLoop;
  readonly clues: readonly (readonly number[])[];
  readonly startingEdges: StartingEdgeSelection;
  readonly puzzle: PuzzleDefinition;
  readonly solverReport: SolverReport;
}

export interface PipelineResult {
  readonly accepted: boolean;
  readonly puzzle?: PuzzleDefinition;
  readonly solverReport?: SolverReport;
  readonly attempts: number;
  readonly rejectionReasons: readonly string[];
}

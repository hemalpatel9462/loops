import type { EdgeId } from '@loops/puzzle-format';

/** Options for producing a development-only candidate loop. */
export interface CandidateLoopConfig {
  readonly width: number;
  readonly height: number;
  readonly seed: string;
  readonly minLoopLength?: number;
  readonly maxLoopLength?: number;
  readonly minRowsUsed?: number;
  readonly minColumnsUsed?: number;
  readonly maxAttempts?: number;
  /** Maximum DFS nodes explored per attempt. */
  readonly searchBudget?: number;
}

/**
 * A candidate is deliberately not a PuzzleDefinition. It has no clues,
 * starting edges, or validation metadata and must pass a later puzzle
 * pipeline before it can become player-facing puzzle data.
 */
export interface CandidateLoop {
  readonly artifactType: 'candidate-loop';
  readonly version: '1.0';
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  readonly edges: readonly EdgeId[];
  readonly vertices: readonly CandidateVertex[];
}

export interface CandidateVertex {
  readonly row: number;
  readonly column: number;
}

export interface CandidateLoopMetrics {
  readonly edgeCount: number;
  readonly rowsUsed: number;
  readonly columnsUsed: number;
  readonly turnCount: number;
}

export interface CandidateValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly metrics?: CandidateLoopMetrics;
}

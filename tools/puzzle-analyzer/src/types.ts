import type {
  Difficulty,
  EdgeId,
  PuzzleDefinition,
  SolverDeductions,
  SolverReport,
} from '@loops/puzzle-format';

export interface AnalyzerDifficultyProfile {
  readonly boardSizes: readonly { readonly width: number; readonly height: number }[];
  readonly startingEdgeRatio: { readonly min: number; readonly max: number };
  readonly minCoverageRatio: number;
  readonly minRegionalCoverage: number;
  readonly minLoopLength: number;
  readonly maxDensity: number;
  readonly maxRepetition: number;
  readonly minTurns?: number;
  readonly rejectSymmetry: boolean;
}

export interface LoopMetrics {
  readonly loopLength: number;
  readonly boundingBoxWidthRatio: number;
  readonly boundingBoxHeightRatio: number;
  readonly rowsUsed: number;
  readonly columnsUsed: number;
  readonly regionalCoverage: number;
  readonly turnCount: number;
  readonly density: number;
  readonly repetitionScore: number;
  readonly symmetryScore: number;
  readonly longestStraightRun: number;
  readonly averageStraightRun: number;
}

export interface QualityEvaluation {
  readonly accepted: boolean;
  readonly qualityScore: number;
  readonly rejectionReasons: readonly string[];
  readonly checks: Readonly<{
    tiny: boolean;
    trivial: boolean;
    overlyDense: boolean;
    concentrated: boolean;
    repetitive: boolean;
    symmetrical: boolean;
    startingEdgeRatio: boolean;
  }>;
}

export interface PuzzleAnalysis {
  readonly schemaVersion: '1.0';
  readonly artifactType: 'puzzle-analysis';
  readonly puzzleId: string;
  readonly difficulty: Difficulty;
  readonly metrics: LoopMetrics;
  readonly fixedEdgeRatio: number;
  readonly difficultyProfile: AnalyzerDifficultyProfile;
  readonly solverDeductions: SolverDeductions;
  readonly solverReport?: SolverReport;
  readonly quality: QualityEvaluation;
}

export interface AnalyzeOptions {
  readonly solverReport?: SolverReport;
  readonly profile?: AnalyzerDifficultyProfile;
}

export interface OrderedLoop {
  readonly edges: readonly EdgeId[];
  readonly validOrder: boolean;
}

export type AnalyzerPuzzle = Pick<
  PuzzleDefinition,
  'id' | 'width' | 'height' | 'difficulty' | 'solutionEdges' | 'startingEdges'
>;

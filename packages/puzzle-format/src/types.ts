import type { EdgeId } from './edge-id';

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export type PlayerEdgeState = 'line' | 'x';

export type EdgeStateMap = Readonly<Record<EdgeId, PlayerEdgeState>>;

export interface GridCoordinate {
  readonly row: number;
  readonly column: number;
}

export interface PuzzleMetadata {
  readonly loopLength: number;
  readonly complexityScore: number;
  readonly difficultyScore: number;
  readonly turnCount: number;
  readonly regionalCoverage: number;
  readonly startingEdgeRatio: number;
  readonly boundingBoxWidthRatio?: number;
  readonly boundingBoxHeightRatio?: number;
  readonly rowsUsed?: number;
  readonly columnsUsed?: number;
  readonly estimatedSolveTimeSeconds?: number;
}

export interface PuzzleDefinition {
  readonly schemaVersion: '1.0';
  readonly id: string;
  readonly seed: string;
  readonly generatorVersion: string;
  readonly width: number;
  readonly height: number;
  readonly difficulty: Difficulty;
  readonly clues: readonly (readonly number[])[];
  readonly solutionEdges: readonly EdgeId[];
  readonly startingEdges: readonly EdgeId[];
  readonly metadata: PuzzleMetadata;
}

export interface PuzzleCatalogEntry {
  readonly id: string;
  readonly difficulty: Difficulty;
  readonly width: number;
  readonly height: number;
  readonly path: string;
  readonly tags?: readonly string[];
}

export interface PuzzleCatalog {
  readonly schemaVersion: '1.0';
  readonly catalogVersion: string;
  readonly generatedAt: string;
  readonly puzzles: readonly PuzzleCatalogEntry[];
}

export interface DailyPuzzleCatalogDay {
  readonly date: string;
  readonly puzzles: Readonly<Record<Difficulty, string>>;
}

export interface DailyPuzzleCatalog {
  readonly schemaVersion: '1.0';
  readonly catalogVersion: string;
  readonly days: readonly DailyPuzzleCatalogDay[];
}

export type GameplayMode = 'relaxed' | 'assisted';

export interface PlayerProgress {
  readonly schemaVersion: '1.0';
  readonly puzzleId: string;
  readonly mode: GameplayMode;
  readonly edgeStates: Readonly<Record<string, PlayerEdgeState>>;
  readonly elapsedSeconds: number;
  readonly hintsUsed: number;
  readonly checksUsed?: number;
  readonly completed: boolean;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly updatedAt: string;
  readonly dailyDate?: string;
  readonly dailyDifficulty?: Difficulty;
}

export type LineThickness = 'thin' | 'standard' | 'thick';

export interface AppSettings {
  readonly schemaVersion: '1.0';
  readonly defaultMode: GameplayMode;
  readonly reducedMotion: boolean;
  readonly lineThickness: LineThickness;
  readonly haptics: boolean;
  readonly sound?: boolean;
  readonly tutorialCompleted: boolean;
  readonly locale?: string;
}

export type DailyLoopStatus = 'not-started' | 'in-progress' | 'completed';

export interface DailyLoopState {
  readonly schemaVersion: '1.0';
  readonly date: string;
  readonly difficulty: Difficulty;
  readonly seed: string;
  readonly puzzleId: string;
  readonly status: DailyLoopStatus;
  readonly streakCount: number;
  readonly completedAt?: string;
  readonly hintsUsed?: number;
  readonly completionTimeSeconds?: number;
}

export type DeductionType = 'player-mistake' | 'direct-clue' | 'vertex' | 'connectivity' | 'contradiction';

export interface HintRecord {
  readonly schemaVersion: '1.0';
  readonly puzzleId: string;
  readonly hintLevel: 1 | 2 | 3;
  readonly deductionType: DeductionType;
  readonly targetEdge?: string;
  readonly targetCell?: GridCoordinate;
  readonly recommendedState?: PlayerEdgeState | 'unknown';
  readonly explanation: string;
  readonly createdAt?: string;
}

export interface DifficultyStatistics {
  readonly started: number;
  readonly completed: number;
  readonly hintsUsed: number;
  readonly bestTimeSeconds?: number;
  readonly averageTimeSeconds?: number;
}

export interface PlayerStatistics {
  readonly schemaVersion: '1.0';
  readonly totalCompleted: number;
  readonly totalStarted: number;
  readonly totalHintsUsed: number;
  readonly bestOverallTimeSeconds?: number;
  readonly currentDailyStreak?: number;
  readonly longestDailyStreak?: number;
  readonly byDifficulty: Readonly<Record<Difficulty, DifficultyStatistics>>;
}

export type DeviceClass = 'phone' | 'tablet' | 'desktop' | 'unknown';

export interface PuzzleAttempt {
  readonly schemaVersion: '1.0';
  readonly puzzleId: string;
  readonly difficulty: Difficulty;
  readonly mode: GameplayMode;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly completed: boolean;
  readonly elapsedSeconds: number;
  readonly hintsUsed: number;
  readonly undoCount: number;
  readonly resetCount: number;
  readonly checkProgressCount?: number;
  readonly mistakeCount?: number;
  readonly deviceClass?: DeviceClass;
}

export interface DifficultyProfile {
  readonly boardSizes: readonly { readonly width: number; readonly height: number }[];
  readonly startingEdgeRatio: { readonly min: number; readonly max: number };
  readonly minCoverageRatio: number;
  readonly minRegionalCoverage: number;
  readonly maxTurns?: number;
  readonly minTurns?: number;
  readonly maxDensity?: number;
  readonly rejectSymmetry?: boolean;
}

export interface GeneratorConfig {
  readonly schemaVersion: '1.0';
  readonly generatorVersion: string;
  readonly seed: string;
  readonly difficultyProfiles: Readonly<Record<Difficulty, DifficultyProfile>>;
}

export type SolutionCount = 0 | 1 | 2 | '2+';

export interface SolverDeductions {
  readonly direct: number;
  readonly vertex: number;
  readonly connectivity: number;
  readonly contradiction: number;
  readonly searchOnly: number;
  readonly maximumDepth: number;
}

export interface SolverReport {
  readonly schemaVersion: '1.0';
  readonly puzzleId: string;
  readonly solutionCount: SolutionCount;
  readonly unique: boolean;
  readonly valid: boolean;
  readonly elapsedMilliseconds?: number;
  readonly deductions: SolverDeductions;
  readonly difficultyScore?: number;
  readonly qualityScore?: number;
  readonly rejectionReasons?: readonly string[];
}

import type {
  DailyLoopStatus,
  Difficulty,
  EdgeId,
  GameplayMode,
  PlayerProgress,
  PuzzleDefinition,
  PuzzleCatalog,
} from '@loops/puzzle-format';
import type { GameState } from '@loops/game-engine/state';
import type { RuleValidationResult } from '@loops/game-engine/validation';
import type { RuntimeHint } from '@loops/game-engine/hints';

export type GameFlowSource = 'selected-puzzle' | 'daily-loop' | 'continue';

export type PuzzleStatus = 'available' | 'in-progress' | 'completed' | 'locked';

export interface PuzzleSequenceItem {
  readonly number: number;
  readonly puzzle: PuzzleDefinition;
}

export interface PuzzleProgressionItem extends PuzzleSequenceItem {
  readonly status: PuzzleStatus;
  readonly progress?: PlayerProgress;
}

export interface CompletionStats {
  readonly puzzleId: string;
  readonly difficulty: Difficulty;
  readonly mode: GameplayMode;
  readonly elapsedSeconds: number;
  readonly hintsUsed: number;
  readonly completedAt: string;
}

export interface AssistedMoveFeedback {
  readonly accepted: boolean;
  readonly edge: EdgeId;
  readonly reason?: string;
}

export interface GameFlowSession {
  readonly puzzle: PuzzleDefinition;
  readonly source: GameFlowSource;
  readonly mode: GameplayMode;
  readonly gameState: GameState;
  readonly startedAt: string;
  readonly elapsedSeconds: number;
  readonly hintsUsed: number;
  readonly checksUsed: number;
  readonly completed: boolean;
  readonly completion?: CompletionStats;
  readonly dailyDate?: string;
  readonly dailyDifficulty?: Difficulty;
  readonly lastValidation?: RuleValidationResult;
  readonly lastHint?: RuntimeHint;
  readonly lastMove?: AssistedMoveFeedback;
}

export interface FlowDependencies {
  readonly repository?: import('../../persistence/types').PersistenceRepository;
  readonly now?: () => Date;
}

export interface PuzzleSelectionOptions extends FlowDependencies {
  /** @deprecated Compatibility-only options for the non-user-facing puzzle-loader helper. */
  readonly difficulty?: Difficulty;
  /** @deprecated Compatibility-only seed for the non-user-facing puzzle-loader helper. */
  readonly seed?: string;
  readonly mode?: GameplayMode;
}

export interface SelectedPuzzleOptions extends FlowDependencies {
  readonly difficulty: Difficulty;
  readonly puzzleNumber: number;
  readonly mode: GameplayMode;
}

export interface DailyLoopOptions extends FlowDependencies {
  readonly date?: string;
  readonly difficulty?: Difficulty;
  readonly mode?: GameplayMode;
}

export interface DailyLoopPuzzleOption {
  readonly difficulty: Difficulty;
  readonly puzzle?: PuzzleDefinition;
  readonly status: DailyLoopStatus;
}

export interface ContinueOptions extends FlowDependencies {
  readonly expectedPuzzleId?: string;
}

export interface LocalPuzzleSource {
  readonly catalog: PuzzleCatalog;
  readonly puzzles: readonly PuzzleDefinition[];
}

export interface FlowProgressSummary {
  readonly progress: PlayerProgress;
  readonly puzzle: PuzzleDefinition;
}

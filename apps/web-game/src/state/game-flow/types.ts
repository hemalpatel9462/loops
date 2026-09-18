import type {
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

export type GameFlowSource = 'quick-play' | 'daily-loop' | 'continue';

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
  readonly lastValidation?: RuleValidationResult;
  readonly lastHint?: RuntimeHint;
  readonly lastMove?: AssistedMoveFeedback;
}

export interface FlowDependencies {
  readonly repository?: import('../../persistence/types').PersistenceRepository;
  readonly now?: () => Date;
}

export interface PuzzleSelectionOptions extends FlowDependencies {
  readonly difficulty?: Difficulty;
  readonly seed?: string;
  readonly mode?: GameplayMode;
}

export interface DailyLoopOptions extends FlowDependencies {
  readonly date?: string;
  readonly mode?: GameplayMode;
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

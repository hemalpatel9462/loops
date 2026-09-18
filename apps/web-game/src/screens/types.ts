import type { Difficulty, GameplayMode, PuzzleDefinition } from '@loops/puzzle-format';
import type { CompletionStats, FlowProgressSummary } from '../state/game-flow';

export interface ModeSelectionProps {
  readonly selectedDifficulty?: Difficulty;
  readonly selectedMode: GameplayMode;
  readonly onDifficultyChange: (difficulty: Difficulty) => void;
  readonly onModeChange: (mode: GameplayMode) => void;
  readonly onQuickPlay: () => void;
  readonly onDailyLoop: () => void;
  readonly onContinue: () => void;
  readonly continueAvailable: boolean;
}

export interface DailyLoopScreenProps {
  readonly date: string;
  readonly puzzle: PuzzleDefinition;
  readonly mode: GameplayMode;
  readonly onStart: () => void;
  readonly onBack: () => void;
}

export interface ContinueScreenProps {
  readonly summary: FlowProgressSummary;
  readonly onResume: () => void;
  readonly onBack: () => void;
}

export interface CompletionScreenProps {
  readonly completion: CompletionStats;
  readonly onPlayAgain: () => void;
  readonly onBackToModes: () => void;
}

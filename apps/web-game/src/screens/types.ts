import type { Difficulty, GameplayMode, PuzzleDefinition } from '@loops/puzzle-format';
import type {
  CompletionStats,
  FlowDependencies,
  FlowProgressSummary,
  PuzzleProgressionItem,
} from '../state/game-flow';

export interface StartScreenProps {
  readonly onStart: () => void;
  readonly onDailyLoop: () => void;
  readonly onHowToPlay: () => void;
  readonly onGameRules: () => void;
}

export interface PuzzleSelectionProps {
  readonly dependencies?: FlowDependencies;
  readonly selectedDifficulty: Difficulty;
  readonly puzzleSequence: readonly PuzzleProgressionItem[];
  readonly onDifficultyChange: (difficulty: Difficulty) => void;
  readonly onPuzzleSelect: (puzzleNumber: number) => void;
  readonly onBack: () => void;
}

/** @deprecated Use PuzzleSelectionProps; retained for screen import compatibility. */
export type ModeSelectionProps = PuzzleSelectionProps & {
  readonly selectedMode?: GameplayMode;
};

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

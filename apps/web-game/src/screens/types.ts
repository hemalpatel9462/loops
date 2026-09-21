import type { Difficulty, GameplayMode, PuzzleDefinition } from '@loops/puzzle-format';
import type {
  CompletionStats,
  DailyLoopPuzzleOption,
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
  readonly dailyPuzzles: readonly DailyLoopPuzzleOption[];
  readonly selectedDifficulty: Difficulty;
  readonly puzzle?: PuzzleDefinition;
  readonly status: DailyLoopPuzzleOption['status'];
  readonly mode: GameplayMode;
  readonly onDifficultyChange: (difficulty: Difficulty) => void;
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

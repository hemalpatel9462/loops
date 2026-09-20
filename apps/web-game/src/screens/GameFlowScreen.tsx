import { useMemo, useState } from 'react';
import type { Difficulty, GameplayMode } from '@loops/puzzle-format';
import {
  getContinueProgress,
  getPuzzleSequence,
  startDailyLoop,
  startSelectedPuzzle as startSelectedPuzzleSession,
  selectDailyPuzzle,
  resumeContinue,
} from '../state/game-flow';
import { getPersistenceRepository } from '../persistence';
import { ContinueScreen } from './ContinueScreen';
import { DailyLoopScreen } from './DailyLoopScreen';
import { PuzzleSelectionScreen } from './PuzzleSelectionScreen';
import { StartScreen } from './StartScreen';
import type { FlowDependencies, GameFlowSession } from '../state/game-flow';
import './screens.css';

type Screen = 'start' | 'selection' | 'daily' | 'continue';

const difficulties: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

/** Small flow coordinator that can be mounted by the app shell in the integration task. */
export interface GameFlowScreenProps {
  readonly dependencies?: FlowDependencies;
  readonly initialScreen?: Screen;
  readonly onSessionStart?: (session: GameFlowSession) => void;
  readonly onHowToPlay?: () => void;
}

export function GameFlowScreen({ dependencies, initialScreen = 'start', onSessionStart, onHowToPlay = () => undefined }: GameFlowScreenProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [mode, setMode] = useState<GameplayMode>('relaxed');
  const repository = dependencies?.repository ?? getPersistenceRepository();
  const currentDate = useMemo(() => {
    const now = dependencies?.now?.() ?? new Date();
    return now.toISOString().slice(0, 10);
  }, [dependencies]);
  const continueSummary = getContinueProgress({ ...dependencies, repository });
  const puzzleSequence = getPuzzleSequence(difficulty, { ...dependencies, repository });
  const handlePuzzleSelect = (puzzleNumber: number): void => {
    const session = startSelectedPuzzleSession({
      ...dependencies,
      repository,
      difficulty,
      puzzleNumber,
      mode,
    });
    if (session) onSessionStart?.(session);
  };

  if (screen === 'start') {
    return (
      <StartScreen
        continueAvailable={Boolean(continueSummary)}
        onContinue={() => setScreen('continue')}
        onDailyLoop={() => setScreen('daily')}
        onStart={() => setScreen('selection')}
      />
    );
  }

  if (screen === 'daily') {
    return <DailyLoopScreen date={currentDate} puzzle={selectDailyPuzzle(currentDate)} mode={mode} onBack={() => setScreen('start')} onStart={() => onSessionStart?.(startDailyLoop({ ...dependencies, repository, date: currentDate, mode }))} />;
  }
  if (screen === 'continue' && continueSummary) {
    return <ContinueScreen summary={continueSummary} onBack={() => setScreen('start')} onResume={() => {
      const session = resumeContinue({ ...dependencies, repository });
      if (session) onSessionStart?.(session);
    }} />;
  }
  return (
    <PuzzleSelectionScreen
      onDifficultyChange={setDifficulty}
      onPuzzleSelect={handlePuzzleSelect}
      onBack={() => setScreen('start')}
      onHowToPlay={onHowToPlay}
      puzzleSequence={puzzleSequence}
      selectedDifficulty={difficulty}
    />
  );
}

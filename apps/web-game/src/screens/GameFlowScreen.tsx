import { useMemo, useState } from 'react';
import type { Difficulty, GameplayMode } from '@loops/puzzle-format';
import {
  getContinueProgress,
  selectDailyPuzzle,
  startDailyLoop,
  startQuickPlay,
  resumeContinue,
} from '../state/game-flow';
import { getPersistenceRepository } from '../persistence';
import { ContinueScreen } from './ContinueScreen';
import { DailyLoopScreen } from './DailyLoopScreen';
import { ModeSelectionScreen } from './ModeSelectionScreen';
import type { FlowDependencies, GameFlowSession } from '../state/game-flow';
import './screens.css';

type Screen = 'modes' | 'daily' | 'continue';

/** Small flow coordinator that can be mounted by the app shell in the integration task. */
export interface GameFlowScreenProps {
  readonly dependencies?: FlowDependencies;
  readonly onSessionStart?: (session: GameFlowSession) => void;
}

export function GameFlowScreen({ dependencies, onSessionStart }: GameFlowScreenProps) {
  const [screen, setScreen] = useState<Screen>('modes');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [mode, setMode] = useState<GameplayMode>('relaxed');
  const repository = dependencies?.repository ?? getPersistenceRepository();
  const currentDate = useMemo(() => {
    const now = dependencies?.now?.() ?? new Date();
    return now.toISOString().slice(0, 10);
  }, [dependencies]);
  const continueSummary = getContinueProgress({ ...dependencies, repository });

  if (screen === 'daily') {
    return <DailyLoopScreen date={currentDate} puzzle={selectDailyPuzzle(currentDate)} mode={mode} onBack={() => setScreen('modes')} onStart={() => onSessionStart?.(startDailyLoop({ ...dependencies, repository, date: currentDate, mode }))} />;
  }
  if (screen === 'continue' && continueSummary) {
    return <ContinueScreen summary={continueSummary} onBack={() => setScreen('modes')} onResume={() => {
      const session = resumeContinue({ ...dependencies, repository });
      if (session) onSessionStart?.(session);
    }} />;
  }
  return (
    <ModeSelectionScreen
      continueAvailable={Boolean(continueSummary)}
      onContinue={() => setScreen('continue')}
      onDailyLoop={() => setScreen('daily')}
      onDifficultyChange={setDifficulty}
      onModeChange={setMode}
      onQuickPlay={() => onSessionStart?.(startQuickPlay({ ...dependencies, repository, difficulty, mode }))}
      selectedDifficulty={difficulty}
      selectedMode={mode}
    />
  );
}

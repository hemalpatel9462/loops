import { useEffect, useRef, useState } from 'react';
import type { GameplayMode } from '@loops/puzzle-format';
import type { GameFlowSession, FlowDependencies } from '../../state/game-flow';
import {
  completeSession,
  getContinueProgress,
  getLocalPuzzleSequence,
  resumeContinue,
  startSelectedPuzzle as startSelectedPuzzleSession,
  updateElapsedTime,
} from '../../state/game-flow';
import { getPersistenceRepository } from '../../persistence';
import { toPlayerProgress } from '../../state/persistence';
import {
  createGameReducerState,
  gameReducer,
} from '../../state/game-reducer';
import type { GameAction, GameReducerState } from '../../state/game-reducer';
import { GameFlowScreen } from '../../screens';
import { GamePlayScreen } from './GamePlayScreen';
import './integration.css';

export interface GameIntegrationProps {
  readonly dependencies?: FlowDependencies;
  readonly initialSession?: GameFlowSession;
  readonly defaultMode?: GameplayMode;
  readonly onHowToPlay?: () => void;
  readonly onGameRules?: () => void;
}

function createReducerState(session: GameFlowSession): GameReducerState {
  const initial = createGameReducerState(session.puzzle, session.mode, session.gameState);
  return {
    ...initial,
    hintsUsed: session.hintsUsed,
    completed: session.completed,
    hint: session.lastHint,
    validation: session.lastValidation,
  };
}

function applyGlobalDefaultMode(
  session: GameFlowSession,
  defaultMode: GameplayMode | undefined,
  repository: ReturnType<typeof getPersistenceRepository>,
): GameFlowSession {
  if (!defaultMode || session.source === 'continue') return session;

  // An unfinished selected puzzle is a resume path even though its source is
  // still selected-puzzle. Its persisted mode is authoritative, just like
  // Continue's persisted mode.
  if (session.source === 'selected-puzzle') {
    const progress = repository.loadProgress(session.puzzle.id);
    const fixedEdges = new Set<string>(session.gameState.fixedEdges);
    const hasEditableEdgeState = Boolean(
      progress && Object.keys(progress.edgeStates).some((edge) => !fixedEdges.has(edge)),
    );
    const hasActivity = Boolean(
      progress && (
        hasEditableEdgeState
        || progress.elapsedSeconds > 0
        || progress.hintsUsed > 0
        || (progress.checksUsed ?? 0) > 0
      ),
    );
    if (progress && !progress.completed && hasActivity) return session;
  }

  return session.mode === defaultMode ? session : Object.freeze({ ...session, mode: defaultMode });
}

/**
 * Browser-facing composition root for the real puzzle flow.
 * GameFlowScreen selects bundled PuzzleDefinition data; GamePlayScreen only
 * dispatches semantic actions to gameReducer.
 */
export function GameIntegration({ dependencies, initialSession, defaultMode, onHowToPlay, onGameRules }: GameIntegrationProps) {
  const repository = dependencies?.repository ?? getPersistenceRepository();
  const [session, setSession] = useState<GameFlowSession | undefined>(initialSession);
  const [state, setState] = useState<GameReducerState | undefined>(
    initialSession ? createReducerState(initialSession) : undefined,
  );
  const [returnToSelection, setReturnToSelection] = useState(false);
  const [timerCycle, setTimerCycle] = useState(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const activeSession = sessionRef.current;
    if (!activeSession || activeSession.completed) return undefined;

    const puzzleId = activeSession.puzzle.id;
    const startingElapsedSeconds = activeSession.elapsedSeconds;
    const timerStartedAt = Date.now();
    const timer = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current || current.completed || current.puzzle.id !== puzzleId) return;
      const elapsedSeconds = startingElapsedSeconds + Math.floor((Date.now() - timerStartedAt) / 1000);
      if (elapsedSeconds <= current.elapsedSeconds) return;
      const next = updateElapsedTime(current, elapsedSeconds, dependencies);
      sessionRef.current = next;
      setSession(next);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [dependencies, session?.completed, session?.puzzle.id, timerCycle]);

  const persist = (nextSession: GameFlowSession): void => {
    repository.saveContinue(toPlayerProgress({
      puzzleId: nextSession.puzzle.id,
      mode: nextSession.mode,
      edgeStates: nextSession.gameState.edgeStates,
      elapsedSeconds: nextSession.elapsedSeconds,
      hintsUsed: nextSession.hintsUsed,
      checksUsed: nextSession.checksUsed,
      completed: nextSession.completed,
      startedAt: nextSession.startedAt,
      completedAt: nextSession.completion?.completedAt,
    }));
  };

  const startSession = (nextSession: GameFlowSession) => {
    const sessionWithGlobalMode = applyGlobalDefaultMode(nextSession, defaultMode, repository);
    if (sessionWithGlobalMode !== nextSession && !sessionWithGlobalMode.completed) {
      persist(sessionWithGlobalMode);
    }
    setReturnToSelection(false);
    setSession(sessionWithGlobalMode);
    setState(createReducerState(sessionWithGlobalMode));
  };

  const dispatch = (action: GameAction): void => {
    if (!session || !state) return;
    if (state.completed && action.type !== 'reset') return;
    const nextState = gameReducer(state, action);
    if (nextState === state) return;
    setState(nextState);

    const resetTimer = action.type === 'reset';
    const resetStartedAt = resetTimer
      ? (dependencies?.now?.() ?? new Date()).toISOString()
      : session.startedAt;

    const candidate: GameFlowSession = {
      ...session,
      gameState: nextState.gameState,
      hintsUsed: nextState.hintsUsed,
      checksUsed: session.checksUsed,
      elapsedSeconds: resetTimer ? 0 : session.elapsedSeconds,
      startedAt: resetStartedAt,
      completed: false,
      lastHint: nextState.hint,
      lastValidation: nextState.validation,
    };
    if (resetTimer) setTimerCycle((cycle) => cycle + 1);
    if (nextState.completed) {
      setSession(completeSession(candidate, dependencies));
    } else {
      setSession(candidate);
      persist(candidate);
    }
  };

  const goToNextPuzzle = (): void => {
    if (!session) return;
    const sequence = getLocalPuzzleSequence(session.puzzle.difficulty);
    const currentIndex = sequence.findIndex(({ puzzle }) => puzzle.id === session.puzzle.id);
    const nextPuzzle = currentIndex >= 0 ? sequence[currentIndex + 1] : undefined;
    if (!nextPuzzle) {
      setReturnToSelection(true);
      setSession(undefined);
      setState(undefined);
      return;
    }

    const nextSession = startSelectedPuzzleSession({
      ...dependencies,
      repository,
      difficulty: session.puzzle.difficulty,
      puzzleNumber: nextPuzzle.number,
      mode: session.mode,
    });
    if (nextSession) {
      startSession(nextSession);
      return;
    }
    setReturnToSelection(true);
    setSession(undefined);
    setState(undefined);
  };

  if (session && state) {
    return <GamePlayScreen dispatch={dispatch} elapsedSeconds={session.elapsedSeconds} onExit={() => { setReturnToSelection(true); setSession(undefined); setState(undefined); }} onNextPuzzle={goToNextPuzzle} state={state} />;
  }

  return (
    <GameFlowScreen
      dependencies={{ ...dependencies, repository }}
      initialScreen={returnToSelection ? 'selection' : 'start'}
      onGameRules={onGameRules}
      onHowToPlay={onHowToPlay}
      onSessionStart={startSession}
    />
  );
}

/** Convenience factory for hosts that want to start with an existing Continue record. */
export function createContinueSession(dependencies?: FlowDependencies): GameFlowSession | undefined {
  const repository = dependencies?.repository ?? getPersistenceRepository();
  if (!getContinueProgress({ ...dependencies, repository })) return undefined;
  return resumeContinue({ ...dependencies, repository });
}

export default GameIntegration;

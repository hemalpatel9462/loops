import { useState } from 'react';
import type { GameFlowSession, FlowDependencies } from '../../state/game-flow';
import {
  completeSession,
  getContinueProgress,
  resumeContinue,
  startQuickPlay,
} from '../../state/game-flow';
import { getPersistenceRepository } from '../../persistence';
import { toPlayerProgress } from '../../state/persistence';
import {
  createGameReducerState,
  gameReducer,
} from '../../state/game-reducer';
import type { GameAction, GameReducerState } from '../../state/game-reducer';
import { GameFlowScreen } from '../../screens';
import { CompletionScreen } from '../../screens/CompletionScreen';
import { GamePlayScreen } from './GamePlayScreen';
import './integration.css';

export interface GameIntegrationProps {
  readonly dependencies?: FlowDependencies;
  readonly initialSession?: GameFlowSession;
}

function createReducerState(session: GameFlowSession): GameReducerState {
  const initial = createGameReducerState(session.puzzle, session.mode, session.gameState);
  return {
    ...initial,
    hintsUsed: session.hintsUsed,
    checksUsed: session.checksUsed,
    completed: session.completed,
    hint: session.lastHint,
    validation: session.lastValidation,
  };
}

/**
 * Browser-facing composition root for the real puzzle flow.
 * GameFlowScreen selects bundled PuzzleDefinition data; GamePlayScreen only
 * dispatches semantic actions to gameReducer.
 */
export function GameIntegration({ dependencies, initialSession }: GameIntegrationProps) {
  const repository = dependencies?.repository ?? getPersistenceRepository();
  const [session, setSession] = useState<GameFlowSession | undefined>(initialSession);
  const [state, setState] = useState<GameReducerState | undefined>(
    initialSession ? createReducerState(initialSession) : undefined,
  );

  const startSession = (nextSession: GameFlowSession) => {
    setSession(nextSession);
    setState(createReducerState(nextSession));
  };

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

  const dispatch = (action: GameAction): void => {
    if (!session || !state || state.completed) return;
    const nextState = gameReducer(state, action);
    if (nextState === state) return;
    setState(nextState);

    const candidate: GameFlowSession = {
      ...session,
      gameState: nextState.gameState,
      hintsUsed: nextState.hintsUsed,
      checksUsed: nextState.checksUsed,
      completed: false,
      lastHint: nextState.hint,
      lastValidation: nextState.validation,
    };
    if (nextState.completed) {
      setSession(completeSession(candidate, dependencies));
    } else {
      setSession(candidate);
      persist(candidate);
    }
  };

  if (session && state) {
    if (state.completed && session.completion) {
      return (
        <CompletionScreen
          completion={session.completion}
          onBackToModes={() => {
            setSession(undefined);
            setState(undefined);
          }}
          onPlayAgain={() => {
            const nextSession = startQuickPlay({
              difficulty: session.puzzle.difficulty,
              mode: session.mode,
              repository,
              ...dependencies,
            });
            startSession(nextSession);
          }}
        />
      );
    }
    return <GamePlayScreen dispatch={dispatch} onExit={() => { setSession(undefined); setState(undefined); }} state={state} />;
  }

  return (
    <GameFlowScreen
      dependencies={{ ...dependencies, repository }}
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

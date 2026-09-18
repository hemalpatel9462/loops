export type TutorialStepId =
  | 'welcome'
  | 'clues'
  | 'continuation'
  | 'vertices'
  | 'one-loop'
  | 'practice';

export interface TutorialStep {
  readonly id: TutorialStepId;
  readonly title: string;
  readonly body: string;
  readonly prompt: string;
}

export interface TutorialProps {
  readonly open: boolean;
  readonly onComplete: () => void;
  readonly onSkip?: () => void;
  readonly onClose?: () => void;
  readonly initialStep?: number;
}

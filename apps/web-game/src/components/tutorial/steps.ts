import type { TutorialStep } from './types.ts';

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Make one perfect loop',
    body: 'Draw a single continuous closed loop across the grid. You can take your time and undo any move.',
    prompt: 'We will learn the rules one small idea at a time.',
  },
  {
    id: 'clues',
    title: 'Read the clues',
    body: 'Each number tells you exactly how many of the four edges around that cell belong to the loop. A 0 has no lines; a 3 has three.',
    prompt: 'Start with clues that leave only one possible edge.',
  },
  {
    id: 'continuation',
    title: 'Continue a line',
    body: 'A line never stops in the middle of the board. When a clue or nearby edge forces a line to continue, follow it until another clue gives you a choice.',
    prompt: 'Look for an edge that must continue the path.',
  },
  {
    id: 'vertices',
    title: 'Check each vertex',
    body: 'Every grid dot, or vertex, must have either zero or two connected lines. One line makes an open end; three or more would make a branch.',
    prompt: 'Use the dots to rule out dead ends and branches.',
  },
  {
    id: 'one-loop',
    title: 'Keep one loop',
    body: 'The finished answer is exactly one connected closed loop. Do not close a small loop if another part of the puzzle is still unresolved.',
    prompt: 'Connectivity matters as much as every clue.',
  },
  {
    id: 'practice',
    title: 'Try a small puzzle',
    body: 'This tiny practice board uses the same rules. Find the forced edges, check its vertices, and finish one loop.',
    prompt: 'You are ready for your first puzzle.',
  },
];

export function clampTutorialStep(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), TUTORIAL_STEPS.length - 1);
}

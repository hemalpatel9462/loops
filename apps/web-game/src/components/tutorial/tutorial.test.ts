import { describe, expect, it } from 'vitest';
import { clampTutorialStep, TUTORIAL_STEPS } from './steps.ts';

describe('tutorial content', () => {
  it('covers the core rules and ends with a small practice puzzle', () => {
    const content = TUTORIAL_STEPS.map((step) => `${step.title} ${step.body}`).join(' ').toLowerCase();
    expect(content).toContain('clue');
    expect(content).toContain('continu');
    expect(content).toContain('vertex');
    expect(content).toContain('one connected closed loop');
    expect(TUTORIAL_STEPS.at(-1)?.id).toBe('practice');
  });

  it('keeps a requested starting step within the tutorial', () => {
    expect(clampTutorialStep(-3)).toBe(0);
    expect(clampTutorialStep(2.9)).toBe(2);
    expect(clampTutorialStep(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampTutorialStep(999)).toBe(TUTORIAL_STEPS.length - 1);
  });

  it('keeps the final action as a tutorial completion boundary', () => {
    expect(TUTORIAL_STEPS.at(-1)?.prompt).toContain('ready for your first puzzle');
    expect(TUTORIAL_STEPS.at(-1)?.id).toBe('practice');
  });
});

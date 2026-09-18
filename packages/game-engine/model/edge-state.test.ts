import { describe, expect, it } from 'vitest';
import { cycleEdgeState } from './edge-state';

describe('cycleEdgeState', () => {
  it('cycles unknown to line to x to unknown', () => {
    expect(cycleEdgeState('unknown')).toBe('line');
    expect(cycleEdgeState('line')).toBe('x');
    expect(cycleEdgeState('x')).toBe('unknown');
  });
});

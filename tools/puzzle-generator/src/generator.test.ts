import { describe, expect, it } from 'vitest';
import { createEdgeId } from '@loops/puzzle-format';
import { generateCandidateLoop, generateCandidates } from './generator.ts';
import { hasFullCellEnclosure, validateCandidateLoop } from './geometry.ts';
import type { CandidateLoop } from './types.ts';

describe('candidate loop generator', () => {
  it('creates a valid lattice loop with deterministic output', () => {
    const config = { width: 5, height: 5, seed: 'deterministic-seed' };
    const first = generateCandidateLoop(config);
    const second = generateCandidateLoop(config);
    expect(first).toEqual(second);
    expect(first.artifactType).toBe('candidate-loop');
    expect(first.edges.length).toBeGreaterThanOrEqual(4);
    expect(validateCandidateLoop(first).valid).toBe(true);
  });

  it('keeps generated candidates separate from puzzle output', () => {
    const candidate = generateCandidateLoop({ width: 4, height: 4, seed: 'separation' });
    expect(candidate).not.toHaveProperty('clues');
    expect(candidate).not.toHaveProperty('solutionEdges');
    expect(candidate).not.toHaveProperty('startingEdges');
  });

  it('rejects branches, disconnected segments, and full-cell enclosures', () => {
    const branch: CandidateLoop = {
      artifactType: 'candidate-loop', version: '1.0', seed: 'bad', width: 3, height: 3,
      edges: [
        createEdgeId('h', 0, 0), createEdgeId('h', 0, 1), createEdgeId('h', 1, 0),
        createEdgeId('v', 0, 0), createEdgeId('v', 0, 2), createEdgeId('v', 1, 0),
      ], vertices: [],
    };
    expect(validateCandidateLoop(branch).valid).toBe(false);
    const disconnected: CandidateLoop = {
      artifactType: 'candidate-loop', version: '1.0', seed: 'bad', width: 3, height: 3,
      edges: [
        createEdgeId('h', 0, 0), createEdgeId('h', 0, 1), createEdgeId('h', 1, 0), createEdgeId('h', 1, 1),
        createEdgeId('v', 0, 0), createEdgeId('v', 1, 0), createEdgeId('v', 0, 2), createEdgeId('v', 1, 2),
      ], vertices: [],
    };
    expect(validateCandidateLoop(disconnected).valid).toBe(false);
    const square = new Set([
      createEdgeId('h', 1, 1), createEdgeId('h', 2, 1), createEdgeId('v', 1, 1), createEdgeId('v', 1, 2),
    ]);
    expect(hasFullCellEnclosure(square, 3, 3)).toBe(true);
  });

  it('supports deterministic batches with distinct seed-derived candidates', () => {
    const batch = generateCandidates({ width: 4, height: 4, seed: 'batch' }, 3);
    expect(batch).toHaveLength(3);
    expect(batch.map((candidate) => candidate.seed)).toEqual(['batch:0', 'batch:1', 'batch:2']);
    expect(batch).toEqual(generateCandidates({ width: 4, height: 4, seed: 'batch' }, 3));
  });
});

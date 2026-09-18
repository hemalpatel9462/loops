import { describe, expect, it } from 'vitest';
import type { EdgeId, PuzzleDefinition } from '@loops/puzzle-format';
import { generateCandidateLoop } from '../../puzzle-generator/src/generator.ts';
import {
  cellEdges,
  edgesAtVertex,
  edgeVertices,
  vertexKey,
} from './edges.ts';
import { solvePuzzle } from './solver.ts';

describe('P1-07 solver geometry remediation', () => {
  it('returns exactly the incident edges at corners, boundaries, and interior vertices', () => {
    expect(edgesAtVertex(0, 0, 3, 2)).toEqual(['h:0:0', 'v:0:0']);
    expect(edgesAtVertex(0, 1, 3, 2)).toEqual(['h:0:0', 'h:0:1', 'v:0:1']);
    expect(edgesAtVertex(1, 0, 3, 2)).toEqual(['h:1:0', 'v:0:0', 'v:1:0']);
    expect(edgesAtVertex(1, 1, 3, 2)).toEqual(['h:1:0', 'h:1:1', 'v:0:1', 'v:1:1']);
    expect(edgesAtVertex(2, 3, 3, 2)).toEqual(['h:2:2', 'v:1:3']);
  });

  it('solves a generated candidate loop from derived clues with and without fixed starts', () => {
    const candidate = generateCandidateLoop({ width: 4, height: 4, seed: 'solver-remediation' });
    const solution = new Set(candidate.edges);
    const clues = Array.from({ length: candidate.height }, (_, row) =>
      Array.from({ length: candidate.width }, (_, column) =>
        cellEdges(row, column).filter((edge) => solution.has(edge)).length,
      ),
    );
    const basePuzzle: PuzzleDefinition = {
      schemaVersion: '1.0',
      id: 'loop-remediation-candidate',
      seed: candidate.seed,
      generatorVersion: '1.0',
      width: candidate.width,
      height: candidate.height,
      difficulty: 'beginner',
      clues,
      solutionEdges: candidate.edges,
      startingEdges: [],
      metadata: {
        loopLength: candidate.edges.length,
        complexityScore: 0.2,
        difficultyScore: 0.2,
        turnCount: 4,
        regionalCoverage: 1,
        startingEdgeRatio: 0,
      },
    };

    const withoutStarts = solvePuzzle(basePuzzle);
    expect(withoutStarts.report.valid).toBe(true);
    expect(withoutStarts.solutions.some((edges) => sameEdgeSet(edges, candidate.edges))).toBe(true);

    const startingEdges = candidate.edges.slice(0, 2);
    const withStarts = solvePuzzle({
      ...basePuzzle,
      startingEdges,
      metadata: { ...basePuzzle.metadata, startingEdgeRatio: startingEdges.length / candidate.edges.length },
    });
    expect(withStarts.report.valid).toBe(true);
    expect(withStarts.solutions.some((edges) => sameEdgeSet(edges, candidate.edges))).toBe(true);
  });

  it('keeps every generated loop vertex at degree two under corrected geometry', () => {
    const candidate = generateCandidateLoop({ width: 5, height: 5, seed: 'degree-remediation' });
    const degree = new Map<string, number>();
    for (const edge of candidate.edges) {
      for (const vertex of edgeVertices(edge)) {
        const key = vertexKey(vertex);
        degree.set(key, (degree.get(key) ?? 0) + 1);
      }
    }
    expect(degree.size).toBe(candidate.edges.length);
    expect([...degree.values()].every((value) => value === 2)).toBe(true);
  });
});

function sameEdgeSet(left: readonly EdgeId[], right: readonly EdgeId[]): boolean {
  return left.length === right.length && new Set(left).size === new Set(right).size && left.every((edge) => right.includes(edge));
}

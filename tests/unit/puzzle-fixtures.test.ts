import { describe, expect, it } from 'vitest';
import {
  approvedSchemas,
  validatePuzzleDefinition,
} from '@loops/puzzle-format';
import {
  invalidFixtures,
  multipleLoopsPuzzle,
  puzzleFixtures,
  validLoopPuzzle,
} from '../../test-fixtures/puzzles';

describe('reusable puzzle fixtures', () => {
  it('provides deterministic fixtures for valid loops and invalid geometries', () => {
    expect(puzzleFixtures.map((fixture) => fixture.name)).toEqual([
      'validLoop',
      'branch',
      'openPath',
      'multipleLoops',
    ]);
    expect(puzzleFixtures.map((fixture) => fixture.puzzle.id)).toEqual([
      'loop-valid-loop',
      'loop-branch',
      'loop-open-path',
      'loop-multiple-loops',
    ]);
    expect(invalidFixtures.map((fixture) => fixture.name)).toEqual(['clueError']);
    expect(JSON.stringify(puzzleFixtures)).toBe(JSON.stringify(puzzleFixtures));
  });

  it('keeps the valid loop and geometry fixtures contract-valid', () => {
    for (const fixture of puzzleFixtures) {
      const result = validatePuzzleDefinition(fixture.puzzle);
      expect(result, fixture.name).toEqual({ ok: true, value: fixture.puzzle });
    }
    expect(validLoopPuzzle.solutionEdges).toHaveLength(8);
    expect(multipleLoopsPuzzle.solutionEdges).toHaveLength(16);
  });

  it('includes a clue error fixture rejected by schema-aligned validation', () => {
    const result = validatePuzzleDefinition(invalidFixtures[0].puzzle);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toContain('clues[0][0]');
    }
  });
});

describe('schema validation harness', () => {
  it('loads every approved schema during the unit test run', () => {
    const schemaIds = Object.values(approvedSchemas).map((schema) => schema.$id);
    expect(schemaIds).toHaveLength(10);
    expect(schemaIds).toEqual([...schemaIds].sort());
    for (const schema of Object.values(approvedSchemas)) {
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.type).toBe('object');
    }
  });
});

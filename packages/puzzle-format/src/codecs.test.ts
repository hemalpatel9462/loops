import { describe, expect, it } from 'vitest';
import { createEdgeId, isEdgeId, parseEdgeId } from './edge-id';
import {
  decodePuzzleDefinition,
  encodePuzzleDefinition,
  parsePuzzleDefinition,
  PuzzleFormatError,
  validatePuzzleDefinition,
} from './codecs';
import type { PuzzleDefinition } from './types';

const validPuzzle: PuzzleDefinition = {
  schemaVersion: '1.0',
  id: 'loop-contract-fixture',
  seed: 'contract-fixture',
  generatorVersion: '1.0.0',
  width: 2,
  height: 2,
  difficulty: 'beginner',
  clues: [
    [2, 2],
    [2, 2],
  ],
  solutionEdges: [
    'h:0:0',
    'h:0:1',
    'h:2:0',
    'h:2:1',
    'v:0:0',
    'v:1:0',
    'v:0:2',
    'v:1:2',
  ] as unknown as PuzzleDefinition['solutionEdges'],
  startingEdges: ['h:0:0', 'h:0:1'] as unknown as PuzzleDefinition['startingEdges'],
  metadata: {
    loopLength: 8,
    complexityScore: 0.2,
    difficultyScore: 0.1,
    turnCount: 4,
    regionalCoverage: 1,
    startingEdgeRatio: 0.25,
  },
};

describe('edge identifiers', () => {
  it('accepts and parses horizontal and vertical IDs', () => {
    expect(isEdgeId('h:0:3')).toBe(true);
    expect(isEdgeId('v:2:1')).toBe(true);
    expect(parseEdgeId('h:0:3')).toEqual({ orientation: 'h', row: 0, column: 3 });
    expect(createEdgeId('v', 2, 1)).toBe('v:2:1');
  });

  it('rejects malformed IDs and invalid coordinates', () => {
    expect(isEdgeId('horizontal:0:3')).toBe(false);
    expect(isEdgeId('h:-1:0')).toBe(false);
    expect(() => createEdgeId('h', -1, 0)).toThrow(RangeError);
  });
});

describe('puzzle definition codec', () => {
  it('accepts a schema-shaped, dimensionally consistent puzzle', () => {
    const result = validatePuzzleDefinition(validPuzzle);
    expect(result).toEqual({ ok: true, value: validPuzzle });
    expect(parsePuzzleDefinition(validPuzzle)).toBe(validPuzzle);
    expect(decodePuzzleDefinition(encodePuzzleDefinition(validPuzzle))).toEqual(validPuzzle);
  });

  it('rejects malformed dimensions, clues, edges, and metadata', () => {
    const malformed = {
      ...validPuzzle,
      width: 3,
      clues: [[2, 2]],
      solutionEdges: ['h:0:0', 'h:0:0', 'h:99:99'],
      startingEdges: ['v:0:1'],
      metadata: { ...validPuzzle.metadata, loopLength: 4 },
    };

    const result = validatePuzzleDefinition(malformed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining(['clues', 'solutionEdges[1]', 'solutionEdges[2]', 'metadata.loopLength']),
      );
    }
    expect(() => parsePuzzleDefinition(malformed)).toThrow(PuzzleFormatError);
  });

  it('rejects malformed JSON text', () => {
    expect(() => decodePuzzleDefinition('{')).toThrow(PuzzleFormatError);
  });
});

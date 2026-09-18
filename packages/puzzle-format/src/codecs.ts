import { isEdgeInBounds, parseEdgeId } from './edge-id';
import type { EdgeId } from './edge-id';
import type { Difficulty, PuzzleDefinition, PuzzleMetadata } from './types';

export interface PuzzleValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type PuzzleValidationResult =
  | { readonly ok: true; readonly value: PuzzleDefinition }
  | { readonly ok: false; readonly issues: readonly PuzzleValidationIssue[] };

export class PuzzleFormatError extends Error {
  readonly issues: readonly PuzzleValidationIssue[];

  constructor(issues: readonly PuzzleValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
    this.name = 'PuzzleFormatError';
    this.issues = issues;
  }
}

const DIFFICULTIES = new Set<Difficulty>([
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert',
]);

const ROOT_KEYS = new Set([
  'schemaVersion',
  'id',
  'seed',
  'generatorVersion',
  'width',
  'height',
  'difficulty',
  'clues',
  'solutionEdges',
  'startingEdges',
  'metadata',
]);

const METADATA_REQUIRED_KEYS = new Set([
  'loopLength',
  'complexityScore',
  'difficultyScore',
  'turnCount',
  'regionalCoverage',
  'startingEdgeRatio',
]);

const METADATA_OPTIONAL_KEYS = new Set([
  'boundingBoxWidthRatio',
  'boundingBoxHeightRatio',
  'rowsUsed',
  'columnsUsed',
  'estimatedSolveTimeSeconds',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: PuzzleValidationIssue[],
  path: string,
  message: string,
): void {
  issues.push({ path, message });
}

function checkNoUnexpectedKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  issues: PuzzleValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      addIssue(issues, `${path}.${key}`, 'unexpected property');
    }
  }
}

function checkNonEmptyString(
  value: unknown,
  path: string,
  issues: PuzzleValidationIssue[],
): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    addIssue(issues, path, 'must be a non-empty string');
    return false;
  }
  return true;
}

function checkScore(
  value: unknown,
  path: string,
  issues: PuzzleValidationIssue[],
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    addIssue(issues, path, 'must be a number between 0 and 1');
    return false;
  }
  return true;
}

function checkNonNegativeInteger(
  value: unknown,
  path: string,
  issues: PuzzleValidationIssue[],
): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    addIssue(issues, path, 'must be a non-negative integer');
    return false;
  }
  return true;
}

function validateMetadata(
  value: unknown,
  solutionEdgeCount: number,
  startingEdgeCount: number,
  issues: PuzzleValidationIssue[],
): value is PuzzleMetadata {
  if (!isRecord(value)) {
    addIssue(issues, 'metadata', 'must be an object');
    return false;
  }

  checkNoUnexpectedKeys(
    value,
    new Set([...METADATA_REQUIRED_KEYS, ...METADATA_OPTIONAL_KEYS]),
    'metadata',
    issues,
  );

  for (const key of METADATA_REQUIRED_KEYS) {
    if (!(key in value)) {
      addIssue(issues, `metadata.${key}`, 'is required');
    }
  }

  if (checkNonNegativeInteger(value.loopLength, 'metadata.loopLength', issues)) {
    if (value.loopLength !== solutionEdgeCount) {
      addIssue(issues, 'metadata.loopLength', 'must equal solutionEdges.length');
    }
  }
  checkScore(value.complexityScore, 'metadata.complexityScore', issues);
  checkScore(value.difficultyScore, 'metadata.difficultyScore', issues);
  checkNonNegativeInteger(value.turnCount, 'metadata.turnCount', issues);
  if (
    !checkNonNegativeInteger(value.regionalCoverage, 'metadata.regionalCoverage', issues) ||
    value.regionalCoverage < 1
  ) {
    addIssue(issues, 'metadata.regionalCoverage', 'must be at least 1');
  }
  if (checkScore(value.startingEdgeRatio, 'metadata.startingEdgeRatio', issues)) {
    const expectedRatio = solutionEdgeCount === 0 ? 0 : startingEdgeCount / solutionEdgeCount;
    if (Math.abs(value.startingEdgeRatio - expectedRatio) > 1e-9) {
      addIssue(issues, 'metadata.startingEdgeRatio', 'must equal startingEdges.length / solutionEdges.length');
    }
  }

  for (const key of ['boundingBoxWidthRatio', 'boundingBoxHeightRatio'] as const) {
    if (key in value) {
      checkScore(value[key], `metadata.${key}`, issues);
    }
  }
  for (const key of ['rowsUsed', 'columnsUsed', 'estimatedSolveTimeSeconds'] as const) {
    if (key in value) {
      checkNonNegativeInteger(value[key], `metadata.${key}`, issues);
    }
  }

  return issues.every((issue) => !issue.path.startsWith('metadata.'));
}

function validateEdges(
  value: unknown,
  path: string,
  width: number,
  height: number,
  minimumLength: number,
  issues: PuzzleValidationIssue[],
): EdgeId[] {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'must be an array');
    return [];
  }
  if (value.length < minimumLength) {
    addIssue(issues, path, `must contain at least ${minimumLength} edges`);
  }

  const edges: EdgeId[] = [];
  const seen = new Set<string>();
  value.forEach((candidate, index) => {
    const edgePath = `${path}[${index}]`;
    const parsed = parseEdgeId(candidate);
    if (!parsed) {
      addIssue(issues, edgePath, 'must match h:row:column or v:row:column');
      return;
    }
    if (!isEdgeInBounds(parsed, width, height)) {
      addIssue(issues, edgePath, 'is outside the puzzle dimensions');
    }
    if (seen.has(candidate)) {
      addIssue(issues, edgePath, 'must be unique');
    }
    seen.add(candidate);
    edges.push(candidate);
  });
  return edges;
}

export function validatePuzzleDefinition(input: unknown): PuzzleValidationResult {
  const issues: PuzzleValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{ path: '$', message: 'must be an object' }],
    };
  }

  checkNoUnexpectedKeys(input, ROOT_KEYS, '$', issues);
  if (input.schemaVersion !== '1.0') {
    addIssue(issues, 'schemaVersion', 'must equal 1.0');
  }
  checkNonEmptyString(input.id, 'id', issues);
  if (typeof input.id === 'string' && !/^loop-[A-Za-z0-9._-]+$/.test(input.id)) {
    addIssue(issues, 'id', 'must match the loop identifier format');
  }
  checkNonEmptyString(input.seed, 'seed', issues);
  checkNonEmptyString(input.generatorVersion, 'generatorVersion', issues);

  const width = input.width;
  const height = input.height;
  if (typeof width !== 'number' || !Number.isInteger(width) || width < 2) {
    addIssue(issues, 'width', 'must be an integer of at least 2');
  }
  if (typeof height !== 'number' || !Number.isInteger(height) || height < 2) {
    addIssue(issues, 'height', 'must be an integer of at least 2');
  }
  const validDimensions =
    typeof width === 'number' && Number.isInteger(width) && width >= 2 &&
    typeof height === 'number' && Number.isInteger(height) && height >= 2;

  if (typeof input.difficulty !== 'string' || !DIFFICULTIES.has(input.difficulty as Difficulty)) {
    addIssue(issues, 'difficulty', 'must be one of beginner, easy, medium, hard, or expert');
  }

  if (!Array.isArray(input.clues)) {
    addIssue(issues, 'clues', 'must be an array');
  } else if (validDimensions && input.clues.length !== height) {
    addIssue(issues, 'clues', 'must contain exactly height rows');
  }
  if (Array.isArray(input.clues)) {
    input.clues.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        addIssue(issues, `clues[${rowIndex}]`, 'must be an array');
        return;
      }
      if (validDimensions && row.length !== width) {
        addIssue(issues, `clues[${rowIndex}]`, 'must contain exactly width clues');
      }
      row.forEach((clue, columnIndex) => {
        if (typeof clue !== 'number' || !Number.isInteger(clue) || clue < 0 || clue > 3) {
          addIssue(issues, `clues[${rowIndex}][${columnIndex}]`, 'must be an integer from 0 through 3');
        }
      });
    });
  }

  const solutionEdges = validDimensions
    ? validateEdges(input.solutionEdges, 'solutionEdges', width, height, 4, issues)
    : [];
  const startingEdges = validDimensions
    ? validateEdges(input.startingEdges, 'startingEdges', width, height, 0, issues)
    : [];
  const solutionSet = new Set(solutionEdges);
  startingEdges.forEach((edge, index) => {
    if (!solutionSet.has(edge)) {
      addIssue(issues, `startingEdges[${index}]`, 'must also appear in solutionEdges');
    }
  });

  validateMetadata(input.metadata, solutionEdges.length, startingEdges.length, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: input as unknown as PuzzleDefinition,
  };
}

export function parsePuzzleDefinition(input: unknown): PuzzleDefinition {
  const result = validatePuzzleDefinition(input);
  if (!result.ok) {
    throw new PuzzleFormatError(result.issues);
  }
  return result.value;
}

export function decodePuzzleDefinition(json: string): PuzzleDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    throw new PuzzleFormatError([
      {
        path: '$',
        message: `invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
      },
    ]);
  }
  return parsePuzzleDefinition(parsed);
}

export function encodePuzzleDefinition(puzzle: PuzzleDefinition): string {
  return JSON.stringify(parsePuzzleDefinition(puzzle));
}

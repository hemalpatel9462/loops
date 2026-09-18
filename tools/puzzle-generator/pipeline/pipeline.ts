import {
  encodePuzzleDefinition,
  parsePuzzleDefinition,
} from '@loops/puzzle-format';
import type { Difficulty, EdgeId, PuzzleDefinition } from '@loops/puzzle-format';
import { generateCandidateLoop } from '../src/generator.ts';
import { validateCandidateLoop } from '../src/geometry.ts';
import { solvePuzzle } from '@loops/puzzle-validator';
import type { CandidateLoop } from '../src/types.ts';
import { deriveClues } from './clues.ts';
import { selectStartingEdges } from './starting-edges.ts';
import {
  DIFFICULTY_PROFILES,
  type PipelineAttempt,
  type PipelineConfig,
  type PipelineResult,
} from './types.ts';

function countTurns(edges: readonly EdgeId[]): number {
  const orientations = edges.map((edge) => edge[0]);
  let turns = 0;
  for (let index = 0; index < orientations.length; index += 1) {
    if (orientations[index] !== orientations[(index + orientations.length - 1) % orientations.length]) turns += 1;
  }
  return turns;
}

function regionalCoverage(candidate: CandidateLoop): number {
  const zones = new Set<string>();
  for (const vertex of candidate.vertices) {
    const rowZone = vertex.row === 0 ? 0 : vertex.row > candidate.height / 2 ? 2 : 1;
    const columnZone = vertex.column === 0 ? 0 : vertex.column > candidate.width / 2 ? 2 : 1;
    zones.add(`${rowZone}:${columnZone}`);
  }
  return Math.max(1, zones.size);
}

function makePuzzle(
  config: PipelineConfig,
  candidate: CandidateLoop,
  clues: readonly (readonly number[])[],
  startingEdges: readonly EdgeId[],
): PuzzleDefinition {
  const turns = countTurns(candidate.edges);
  const rowsUsed = new Set(candidate.vertices.map((vertex) => vertex.row)).size;
  const columnsUsed = new Set(candidate.vertices.map((vertex) => vertex.column)).size;
  const puzzle = {
    schemaVersion: '1.0' as const,
    id: `loop-${config.difficulty}-${config.seed.replace(/[^A-Za-z0-9._-]/g, '-')}`,
    seed: config.seed,
    generatorVersion: config.generatorVersion ?? 'pipeline-1.0.0',
    width: candidate.width,
    height: candidate.height,
    difficulty: config.difficulty,
    clues,
    solutionEdges: candidate.edges,
    startingEdges,
    metadata: {
      loopLength: candidate.edges.length,
      complexityScore: Math.min(1, turns / Math.max(1, candidate.edges.length) * 2),
      difficultyScore: Math.min(1, Math.max(0, (candidate.width - 4) / 8)),
      turnCount: turns,
      regionalCoverage: regionalCoverage(candidate),
      startingEdgeRatio: candidate.edges.length === 0 ? 0 : startingEdges.length / candidate.edges.length,
      boundingBoxWidthRatio: Math.min(1, columnsUsed / candidate.width),
      boundingBoxHeightRatio: Math.min(1, rowsUsed / candidate.height),
      rowsUsed,
      columnsUsed,
      estimatedSolveTimeSeconds: Math.max(30, candidate.edges.length * (config.difficulty === 'beginner' ? 4 : 8)),
    },
  };
  return parsePuzzleDefinition(puzzle);
}

export function buildPuzzleAttempt(config: PipelineConfig): PipelineAttempt {
  const profile = DIFFICULTY_PROFILES[config.difficulty];
  const width = config.width ?? profile.width;
  const height = config.height ?? profile.height;
  const candidate = generateCandidateLoop({
    width,
    height,
    seed: config.seed,
    minRowsUsed: profile.minRowsUsed,
    minColumnsUsed: profile.minColumnsUsed,
    maxAttempts: config.maxAttempts,
    searchBudget: config.searchBudget,
  });
  const candidateValidation = validateCandidateLoop(candidate);
  if (!candidateValidation.valid) {
    throw new Error(`Candidate loop rejected: ${candidateValidation.errors.join('; ')}`);
  }
  const clues = deriveClues(width, height, candidate.edges);
  const starting = selectStartingEdges(
    config.difficulty,
    width,
    height,
    candidate.edges,
    clues,
    profile.startingEdgeRatio,
  );
  const puzzle = makePuzzle(config, candidate, clues, starting.edges);
  const solverResult = solvePuzzle(puzzle);
  return {
    candidate,
    clues,
    startingEdges: starting,
    puzzle,
    solverReport: solverResult.report,
  };
}

export function generateAcceptedPuzzle(config: PipelineConfig): PuzzleDefinition {
  const maxAttempts = config.maxAttempts ?? 32;
  const rejectionReasons: string[] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const attemptConfig = { ...config, seed: attempt === 0 ? config.seed : `${config.seed}:${attempt}` };
    try {
      const candidateAttempt = buildPuzzleAttempt(attemptConfig);
      const result = solvePuzzle(candidateAttempt.puzzle);
      if (result.solutionCount === 1 && result.report.valid && result.report.unique) {
        return parsePuzzleDefinition(candidateAttempt.puzzle);
      }
      rejectionReasons.push(`${attemptConfig.seed}: solver rejected puzzle (${result.report.solutionCount} solutions)`);
    } catch (error) {
      rejectionReasons.push(`${attemptConfig.seed}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to generate an accepted ${config.difficulty} puzzle: ${rejectionReasons.join(' | ')}`);
}

export function generatePuzzles(config: PipelineConfig, count: number): readonly PuzzleDefinition[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count must be a positive integer');
  return Array.from({ length: count }, (_, index) =>
    generateAcceptedPuzzle({ ...config, seed: `${config.seed}:${index}` }),
  );
}

export function emitAcceptedPuzzle(puzzle: PuzzleDefinition): string {
  const validated = parsePuzzleDefinition(puzzle);
  const solverResult = solvePuzzle(validated);
  if (solverResult.solutionCount !== 1 || !solverResult.report.valid || !solverResult.report.unique) {
    throw new Error(`Refusing to emit puzzle ${validated.id}: solver did not prove uniqueness`);
  }
  return encodePuzzleDefinition(validated);
}

export function generatePipelineResult(config: PipelineConfig): PipelineResult {
  try {
    const puzzle = generateAcceptedPuzzle(config);
    const solverReport = solvePuzzle(puzzle).report;
    return { accepted: true, puzzle, solverReport, attempts: 1, rejectionReasons: [] };
  } catch (error) {
    return {
      accepted: false,
      attempts: config.maxAttempts ?? 32,
      rejectionReasons: [error instanceof Error ? error.message : String(error)],
    };
  }
}

import type { Difficulty, SolverDeductions, SolverReport } from '@loops/puzzle-format';
import { DIFFICULTY_PROFILES, getDifficultyProfile } from './profiles.ts';
import { measureLoop } from './geometry.ts';
import type {
  AnalyzeOptions,
  AnalyzerDifficultyProfile,
  AnalyzerPuzzle,
  LoopMetrics,
  PuzzleAnalysis,
  QualityEvaluation,
} from './types.ts';

const EMPTY_DEDUCTIONS: SolverDeductions = {
  direct: 0,
  vertex: 0,
  connectivity: 0,
  contradiction: 0,
  searchOnly: 0,
  maximumDepth: 0,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isRectangle(puzzle: AnalyzerPuzzle, metrics: LoopMetrics): boolean {
  if (metrics.turnCount !== 4 || puzzle.solutionEdges.length === 0) return false;
  const vertices = new Set<string>();
  for (const edge of puzzle.solutionEdges) {
    const [, row, column] = edge.split(':');
    vertices.add(`${row}:${column}`);
  }
  return metrics.loopLength === 2 * ((metrics.columnsUsed - 1) + (metrics.rowsUsed - 1));
}

function scoreQuality(metrics: LoopMetrics, profile: AnalyzerDifficultyProfile, fixedRatio: number): number {
  const coverage = (metrics.boundingBoxWidthRatio + metrics.boundingBoxHeightRatio) / 2;
  const regional = metrics.regionalCoverage / 9;
  const density = 1 - clamp(metrics.density / Math.max(0.01, profile.maxDensity));
  const turns = clamp(metrics.turnCount / Math.max(4, profile.minTurns ?? 4) / 2);
  const assistance = profile.startingEdgeRatio.max === 0
    ? 1
    : 1 - Math.abs(fixedRatio - (profile.startingEdgeRatio.min + profile.startingEdgeRatio.max) / 2);
  return clamp(coverage * 0.3 + regional * 0.15 + density * 0.15 + turns * 0.2 + (1 - metrics.repetitionScore) * 0.1 + assistance * 0.1);
}

export function evaluateQuality(
  puzzle: AnalyzerPuzzle,
  metrics: LoopMetrics = measureLoop(puzzle),
  profile: AnalyzerDifficultyProfile = getDifficultyProfile(puzzle.difficulty),
): QualityEvaluation {
  const fixedRatio = puzzle.solutionEdges.length === 0 ? 0 : puzzle.startingEdges.length / puzzle.solutionEdges.length;
  const tiny = metrics.loopLength < profile.minLoopLength;
  const trivial = isRectangle(puzzle, metrics) || (metrics.turnCount <= 4 && metrics.loopLength < profile.minLoopLength * 2);
  const overlyDense = metrics.density > profile.maxDensity;
  const concentrated = metrics.boundingBoxWidthRatio < profile.minCoverageRatio ||
    metrics.boundingBoxHeightRatio < profile.minCoverageRatio ||
    metrics.regionalCoverage < profile.minRegionalCoverage;
  const repetitive = metrics.repetitionScore > profile.maxRepetition;
  const symmetrical = profile.rejectSymmetry && metrics.symmetryScore > 0.98;
  const startingEdgeRatio = fixedRatio >= profile.startingEdgeRatio.min && fixedRatio <= profile.startingEdgeRatio.max;
  const rejectionReasons: string[] = [];
  if (tiny) rejectionReasons.push('loop-too-short');
  if (trivial) rejectionReasons.push('trivial-rectangle-or-low-turn-shape');
  if (overlyDense) rejectionReasons.push('loop-too-dense');
  if (concentrated) rejectionReasons.push('loop-too-concentrated');
  if (repetitive) rejectionReasons.push('loop-too-repetitive');
  if (symmetrical) rejectionReasons.push('loop-too-symmetrical');
  if (!startingEdgeRatio) rejectionReasons.push('starting-edge-ratio-out-of-profile');
  return {
    accepted: rejectionReasons.length === 0,
    qualityScore: scoreQuality(metrics, profile, fixedRatio),
    rejectionReasons,
    checks: { tiny, trivial, overlyDense, concentrated, repetitive, symmetrical, startingEdgeRatio },
  };
}

export function analyzePuzzle(puzzle: AnalyzerPuzzle, options: AnalyzeOptions = {}): PuzzleAnalysis {
  const profile = options.profile ?? getDifficultyProfile(puzzle.difficulty);
  const metrics = measureLoop(puzzle);
  const fixedEdgeRatio = puzzle.solutionEdges.length === 0 ? 0 : puzzle.startingEdges.length / puzzle.solutionEdges.length;
  const solverDeductions = options.solverReport?.deductions ?? EMPTY_DEDUCTIONS;
  return {
    schemaVersion: '1.0',
    artifactType: 'puzzle-analysis',
    puzzleId: puzzle.id,
    difficulty: puzzle.difficulty,
    metrics,
    fixedEdgeRatio,
    difficultyProfile: profile,
    solverDeductions,
    ...(options.solverReport ? { solverReport: options.solverReport } : {}),
    quality: evaluateQuality(puzzle, metrics, profile),
  };
}

export function analyzePuzzles(
  puzzles: readonly AnalyzerPuzzle[],
  reports: ReadonlyMap<string, SolverReport> = new Map(),
): readonly PuzzleAnalysis[] {
  return puzzles.map((puzzle) => analyzePuzzle(puzzle, { solverReport: reports.get(puzzle.id) }));
}

export { DIFFICULTY_PROFILES };
export const analyze = analyzePuzzle;
export const evaluatePuzzleQuality = evaluateQuality;

import type { Difficulty } from '@loops/puzzle-format';
import type { AnalyzerDifficultyProfile } from './types.ts';

/**
 * Product-approved fixed-line targets from the game design specification.
 * The geometry thresholds are quality gates, not replacements for playtesting.
 */
export const DIFFICULTY_PROFILES: Readonly<Record<Difficulty, AnalyzerDifficultyProfile>> = {
  beginner: {
    boardSizes: [{ width: 4, height: 4 }],
    startingEdgeRatio: { min: 0.4, max: 0.5 },
    minCoverageRatio: 0.45,
    minRegionalCoverage: 4,
    minLoopLength: 8,
    maxDensity: 0.72,
    maxRepetition: 0.9,
    minTurns: 4,
    rejectSymmetry: false,
  },
  easy: {
    boardSizes: [{ width: 5, height: 5 }],
    startingEdgeRatio: { min: 0.25, max: 0.3 },
    minCoverageRatio: 0.55,
    minRegionalCoverage: 5,
    minLoopLength: 10,
    maxDensity: 0.68,
    maxRepetition: 0.86,
    minTurns: 4,
    rejectSymmetry: false,
  },
  medium: {
    boardSizes: [{ width: 6, height: 6 }, { width: 7, height: 7 }],
    startingEdgeRatio: { min: 0.15, max: 0.2 },
    minCoverageRatio: 0.65,
    minRegionalCoverage: 6,
    minLoopLength: 12,
    maxDensity: 0.64,
    maxRepetition: 0.82,
    minTurns: 6,
    rejectSymmetry: false,
  },
  hard: {
    boardSizes: [{ width: 8, height: 8 }, { width: 9, height: 9 }],
    startingEdgeRatio: { min: 0.1, max: 0.15 },
    minCoverageRatio: 0.75,
    minRegionalCoverage: 7,
    minLoopLength: 16,
    maxDensity: 0.6,
    maxRepetition: 0.78,
    minTurns: 8,
    rejectSymmetry: true,
  },
  expert: {
    boardSizes: [{ width: 10, height: 10 }],
    startingEdgeRatio: { min: 0.05, max: 0.1 },
    minCoverageRatio: 0.8,
    minRegionalCoverage: 8,
    minLoopLength: 20,
    maxDensity: 0.56,
    maxRepetition: 0.74,
    minTurns: 10,
    rejectSymmetry: true,
  },
};

export function getDifficultyProfile(difficulty: Difficulty): AnalyzerDifficultyProfile {
  return DIFFICULTY_PROFILES[difficulty];
}

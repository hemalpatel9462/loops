import type { Difficulty, PuzzleCatalog, PuzzleDefinition } from '@loops/puzzle-format';

export interface CatalogBuildOptions {
  readonly outputDir?: string;
  readonly catalogVersion?: string;
  readonly generatedAt?: string;
  readonly seed?: string;
  readonly countPerDifficulty?: number;
  readonly difficulties?: readonly Difficulty[];
  readonly puzzles?: readonly PuzzleDefinition[];
}

export interface CatalogBuildResult {
  readonly catalog: PuzzleCatalog;
  readonly puzzlePaths: readonly string[];
}

export interface CatalogValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly catalog?: PuzzleCatalog;
}

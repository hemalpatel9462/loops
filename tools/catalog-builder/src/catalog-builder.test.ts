import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EdgeId, PuzzleDefinition } from '@loops/puzzle-format';
import { buildCatalog } from './builder.ts';
import { validateCatalogFile } from './catalog.ts';

function fixture(id: string): PuzzleDefinition {
  return {
    schemaVersion: '1.0', id, seed: id, generatorVersion: 'test', width: 2, height: 2,
    difficulty: 'beginner', clues: [[2, 2], [2, 2]],
    solutionEdges: ['h:0:0', 'h:0:1', 'h:2:0', 'h:2:1', 'v:0:0', 'v:1:0', 'v:0:2', 'v:1:2'] as unknown as EdgeId[],
    startingEdges: ['h:0:0'] as unknown as EdgeId[],
    metadata: { loopLength: 8, complexityScore: 0.1, difficultyScore: 0.1, turnCount: 4, regionalCoverage: 1, startingEdgeRatio: 0.125 },
  };
}

describe('catalog builder', () => {
  it('emits validated puzzle JSON and catalog entries pointing to real files', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'loops-catalog-'));
    try {
      const result = buildCatalog({ outputDir, puzzles: [fixture('loop-catalog-fixture')] });
      expect(result.catalog.puzzles).toHaveLength(1);
      const validation = validateCatalogFile(join(outputDir, 'catalog.json'), { dataRoot: outputDir });
      expect(validation.valid).toBe(true);
      const puzzlePath = join(outputDir, result.catalog.puzzles[0].path);
      expect(JSON.parse(readFileSync(puzzlePath, 'utf8')).id).toBe('loop-catalog-fixture');
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate puzzle IDs before writing a catalog', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'loops-catalog-'));
    try {
      expect(() => buildCatalog({ outputDir, puzzles: [fixture('loop-duplicate'), fixture('loop-duplicate')] })).toThrow(/Duplicate puzzle IDs/);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rejects catalog entries pointing to missing puzzle files', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'loops-catalog-'));
    try {
      const result = buildCatalog({ outputDir, puzzles: [fixture('loop-missing')] });
      const catalogPath = join(outputDir, 'catalog.json');
      const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { puzzles: Array<{ path: string }> };
      catalog.puzzles[0].path = 'puzzles/beginner/missing.json';
      writeFileSync(catalogPath, JSON.stringify(catalog));
      expect(validateCatalogFile(catalogPath, { dataRoot: outputDir }).valid).toBe(false);
      void result;
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

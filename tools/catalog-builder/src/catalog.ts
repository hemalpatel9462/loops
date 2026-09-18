import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve, relative, sep } from 'node:path';
import { parsePuzzleDefinition } from '@loops/puzzle-format';
import type { Difficulty, PuzzleCatalog, PuzzleCatalogEntry, PuzzleDefinition } from '@loops/puzzle-format';
import type { CatalogValidationResult } from './types.ts';

const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

function isPuzzleCatalog(value: unknown): value is PuzzleCatalog {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.schemaVersion === '1.0' && typeof record.catalogVersion === 'string' &&
    typeof record.generatedAt === 'string' && Array.isArray(record.puzzles);
}

function isSafeRelativePath(path: string): boolean {
  return path.length > 0 && !isAbsolute(path) && !path.split('/').includes('..') && !path.includes(`..${sep}`);
}

function validateEntryShape(entry: unknown, index: number, errors: string[]): entry is PuzzleCatalogEntry {
  const initialErrorCount = errors.length;
  if (!entry || typeof entry !== 'object') {
    errors.push(`puzzles[${index}] must be an object`);
    return false;
  }
  const value = entry as Record<string, unknown>;
  for (const key of ['id', 'difficulty', 'path'] as const) {
    if (typeof value[key] !== 'string' || value[key].length === 0) errors.push(`puzzles[${index}].${key} must be a non-empty string`);
  }
  for (const key of ['width', 'height'] as const) {
    if (!Number.isInteger(value[key]) || Number(value[key]) < 2) errors.push(`puzzles[${index}].${key} must be an integer of at least 2`);
  }
  if (typeof value.difficulty === 'string' && !DIFFICULTIES.includes(value.difficulty as Difficulty)) errors.push(`puzzles[${index}].difficulty is not an approved difficulty`);
  return errors.length === initialErrorCount;
}

export function validateCatalogFile(
  catalogPath: string,
  options: { readonly dataRoot?: string } = {},
): CatalogValidationResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch (error) {
    return { valid: false, errors: [`unable to read catalog: ${error instanceof Error ? error.message : String(error)}`] };
  }
  if (!isPuzzleCatalog(parsed)) return { valid: false, errors: ['catalog must contain schemaVersion, catalogVersion, generatedAt, and puzzles'] };
  if (Number.isNaN(Date.parse(parsed.generatedAt))) errors.push('generatedAt must be an ISO date-time');
  const catalogRoot = resolve(options.dataRoot ?? resolve(catalogPath, '..'));
  const ids = new Set<string>();
  for (let index = 0; index < parsed.puzzles.length; index += 1) {
    const entryValue = parsed.puzzles[index];
    if (!validateEntryShape(entryValue, index, errors)) continue;
    const entry = entryValue as PuzzleCatalogEntry;
    if (ids.has(entry.id)) errors.push(`duplicate puzzle id: ${entry.id}`);
    ids.add(entry.id);
    if (!isSafeRelativePath(entry.path)) {
      errors.push(`puzzles[${index}].path must be a safe relative path`);
      continue;
    }
    const puzzlePath = resolve(catalogRoot, entry.path);
    const contained = puzzlePath === catalogRoot || puzzlePath.startsWith(`${catalogRoot}${sep}`);
    if (!contained) {
      errors.push(`puzzles[${index}].path escapes the data package: ${entry.path}`);
      continue;
    }
    try {
      statSync(puzzlePath);
    } catch {
      errors.push(`catalog entry points to missing file: ${entry.path}`);
      continue;
    }
    let puzzle: PuzzleDefinition;
    try {
      puzzle = parsePuzzleDefinition(JSON.parse(readFileSync(puzzlePath, 'utf8')));
    } catch (error) {
      errors.push(`invalid puzzle file ${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (puzzle.id !== entry.id) errors.push(`catalog id mismatch for ${entry.path}`);
    if (puzzle.difficulty !== entry.difficulty) errors.push(`catalog difficulty mismatch for ${entry.id}`);
    if (puzzle.width !== entry.width || puzzle.height !== entry.height) errors.push(`catalog dimensions mismatch for ${entry.id}`);
  }
  return errors.length === 0 ? { valid: true, errors: [], catalog: parsed } : { valid: false, errors };
}

export function assertCatalogValid(catalogPath: string, options?: { readonly dataRoot?: string }): PuzzleCatalog {
  const result = validateCatalogFile(catalogPath, options);
  if (!result.valid || !result.catalog) throw new Error(`Catalog validation failed: ${result.errors.join('; ')}`);
  return result.catalog;
}

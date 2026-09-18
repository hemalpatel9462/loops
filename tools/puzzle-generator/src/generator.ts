import type { EdgeId } from '@loops/puzzle-format';
import { candidateVertices, edgeKey, validateCandidateLoop, vertexKey } from './geometry.ts';
import { SeededRandom } from './random.ts';
import type { CandidateLoop, CandidateLoopConfig } from './types.ts';

interface Vertex {
  readonly row: number;
  readonly column: number;
}

const DIRECTIONS: readonly Vertex[] = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 },
];

function assertConfig(config: CandidateLoopConfig): void {
  if (!Number.isInteger(config.width) || config.width < 2) throw new RangeError('width must be an integer of at least 2');
  if (!Number.isInteger(config.height) || config.height < 2) throw new RangeError('height must be an integer of at least 2');
  if (config.seed.length === 0) throw new RangeError('seed must be non-empty');
  for (const [name, value] of Object.entries(config)) {
    if (name !== 'seed' && value !== undefined && typeof value === 'number' && !Number.isFinite(value)) {
      throw new RangeError(`${name} must be finite`);
    }
  }
}

function allVertices(width: number, height: number): Vertex[] {
  const result: Vertex[] = [];
  for (let row = 0; row <= height; row += 1) {
    for (let column = 0; column <= width; column += 1) result.push({ row, column });
  }
  return result;
}

function neighbors(vertex: Vertex, width: number, height: number): Vertex[] {
  return DIRECTIONS
    .map((direction) => ({ row: vertex.row + direction.row, column: vertex.column + direction.column }))
    .filter((candidate) => candidate.row >= 0 && candidate.row <= height && candidate.column >= 0 && candidate.column <= width);
}

function hashAttempt(seed: string, attempt: number): string {
  return `${seed}\u0000${attempt}`;
}

function defaultMinimumLength(width: number, height: number): number {
  return Math.max(8, Math.min(2 * (width + height), 2 * width + 2 * height));
}

function defaultMaximumLength(width: number, height: number): number {
  const totalEdges = width * (height + 1) + height * (width + 1);
  return Math.max(8, Math.floor(totalEdges * 0.78));
}

function findCycle(config: CandidateLoopConfig, random: SeededRandom): EdgeId[] | undefined {
  const minLength = config.minLoopLength ?? defaultMinimumLength(config.width, config.height);
  const maxLength = config.maxLoopLength ?? defaultMaximumLength(config.width, config.height);
  const minRows = config.minRowsUsed ?? Math.min(2, config.height + 1);
  const minColumns = config.minColumnsUsed ?? Math.min(2, config.width + 1);
  const budget = config.searchBudget ?? 50_000;
  if (minLength < 4 || maxLength < minLength) return undefined;

  const start = random.shuffle(allVertices(config.width, config.height))[0];
  const path: Vertex[] = [start];
  const used = new Set<string>([vertexKey(start)]);
  let explored = 0;

  function meetsCoverage(candidate: readonly Vertex[]): boolean {
    return new Set(candidate.map((vertex) => vertex.row)).size >= minRows &&
      new Set(candidate.map((vertex) => vertex.column)).size >= minColumns;
  }

  function dfs(current: Vertex): EdgeId[] | undefined {
    explored += 1;
    if (explored > budget) return undefined;
    const options = random.shuffle(neighbors(current, config.width, config.height));
    for (const next of options) {
      const nextKey = vertexKey(next);
      if (nextKey === vertexKey(start)) {
        if (path.length < minLength || !meetsCoverage(path)) continue;
        const cycle = path.map((vertex, index) => edgeKey(vertex, path[(index + 1) % path.length]));
        const candidate: CandidateLoop = {
          artifactType: 'candidate-loop',
          version: '1.0',
          seed: config.seed,
          width: config.width,
          height: config.height,
          edges: cycle,
          vertices: candidateVertices(cycle),
        };
        if (validateCandidateLoop(candidate).valid) return cycle;
        continue;
      }
      if (used.has(nextKey) || path.length >= maxLength) continue;
      // A path that traps every available continuation cannot become a cycle.
      const nextNeighbors = neighbors(next, config.width, config.height)
        .filter((candidate) => !used.has(vertexKey(candidate)) || vertexKey(candidate) === vertexKey(start));
      if (nextNeighbors.length === 0) continue;
      used.add(nextKey);
      path.push(next);
      const result = dfs(next);
      if (result) return result;
      path.pop();
      used.delete(nextKey);
    }
    return undefined;
  }

  return dfs(start);
}

export function generateCandidateLoop(config: CandidateLoopConfig): CandidateLoop {
  assertConfig(config);
  const attempts = config.maxAttempts ?? 32;
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError('maxAttempts must be a positive integer');
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cycle = findCycle(config, new SeededRandom(hashAttempt(config.seed, attempt)));
    if (!cycle) continue;
    const candidate: CandidateLoop = {
      artifactType: 'candidate-loop',
      version: '1.0',
      seed: config.seed,
      width: config.width,
      height: config.height,
      edges: cycle,
      vertices: candidateVertices(cycle),
    };
    if (validateCandidateLoop(candidate).valid) return candidate;
  }
  throw new Error(`Unable to generate a valid candidate loop for ${config.width}x${config.height} after ${attempts} attempts`);
}

export function generateCandidates(config: CandidateLoopConfig, count: number): CandidateLoop[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count must be a positive integer');
  return Array.from({ length: count }, (_, index) => generateCandidateLoop({ ...config, seed: `${config.seed}:${index}` }));
}

export function candidateLoopToEdges(candidate: CandidateLoop): readonly EdgeId[] {
  return candidate.edges;
}

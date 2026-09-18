import type { EdgeId } from '@loops/puzzle-format';
import type {
  CandidateLoop,
  CandidateLoopMetrics,
  CandidateValidationResult,
  CandidateVertex,
} from './types.ts';

export interface GridVertex {
  readonly row: number;
  readonly column: number;
}

interface ParsedEdge {
  readonly orientation: 'h' | 'v';
  readonly row: number;
  readonly column: number;
}

const EDGE_PATTERN = /^([hv]):([0-9]+):([0-9]+)$/;

function createEdgeId(orientation: 'h' | 'v', row: number, column: number): EdgeId {
  return `${orientation}:${row}:${column}` as EdgeId;
}

function parseEdgeId(value: unknown): ParsedEdge | undefined {
  if (typeof value !== 'string') return undefined;
  const match = EDGE_PATTERN.exec(value);
  return match
    ? { orientation: match[1] as 'h' | 'v', row: Number(match[2]), column: Number(match[3]) }
    : undefined;
}

export function vertexKey(vertex: GridVertex): string {
  return `${vertex.row}:${vertex.column}`;
}

export function edgeKey(a: GridVertex, b: GridVertex): EdgeId {
  if (a.row === b.row && Math.abs(a.column - b.column) === 1) {
    return createEdgeId('h', a.row, Math.min(a.column, b.column));
  }
  if (a.column === b.column && Math.abs(a.row - b.row) === 1) {
    return createEdgeId('v', Math.min(a.row, b.row), a.column);
  }
  throw new RangeError('Candidate loop edges must join adjacent lattice vertices');
}

export function edgeVertices(edge: EdgeId): [GridVertex, GridVertex] {
  const parsed = parseEdgeId(edge);
  if (!parsed) {
    throw new RangeError(`Invalid edge identifier: ${String(edge)}`);
  }
  if (parsed.orientation === 'h') {
    return [
      { row: parsed.row, column: parsed.column },
      { row: parsed.row, column: parsed.column + 1 },
    ];
  }
  return [
    { row: parsed.row, column: parsed.column },
    { row: parsed.row + 1, column: parsed.column },
  ];
}

export function edgeSet(edges: readonly EdgeId[]): Set<EdgeId> {
  return new Set(edges);
}

export function hasFullCellEnclosure(
  edges: ReadonlySet<EdgeId>,
  width: number,
  height: number,
): boolean {
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const top = createEdgeId('h', row, column);
      const bottom = createEdgeId('h', row + 1, column);
      const left = createEdgeId('v', row, column);
      const right = createEdgeId('v', row, column + 1);
      if (edges.has(top) && edges.has(bottom) && edges.has(left) && edges.has(right)) {
        return true;
      }
    }
  }
  return false;
}

function connected(edges: readonly EdgeId[], adjacency: ReadonlyMap<string, readonly string[]>): boolean {
  if (edges.length === 0) return false;
  const first = vertexKey(edgeVertices(edges[0])[0]);
  const seen = new Set<string>([first]);
  const queue = [first];
  while (queue.length > 0) {
    const vertex = queue.shift()!;
    for (const neighbor of adjacency.get(vertex) ?? []) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return edges.every((edge) => {
    const [a, b] = edgeVertices(edge);
    return seen.has(vertexKey(a)) && seen.has(vertexKey(b));
  });
}

function metrics(edges: readonly EdgeId[], width: number, height: number): CandidateLoopMetrics {
  const vertices = edges.flatMap(edgeVertices);
  const rows = new Set(vertices.map((vertex) => vertex.row));
  const columns = new Set(vertices.map((vertex) => vertex.column));
  let turns = 0;
  for (let index = 0; index < edges.length; index += 1) {
    const previous = parseEdgeId(edges[(index + edges.length - 1) % edges.length])!;
    const current = parseEdgeId(edges[index])!;
    if (previous.orientation !== current.orientation) turns += 1;
  }
  // `width` and `height` are accepted to keep this helper's output tied to
  // the board contract and to make accidental dimension omissions apparent.
  void width;
  void height;
  return { edgeCount: edges.length, rowsUsed: rows.size, columnsUsed: columns.size, turnCount: turns };
}

export function validateCandidateLoop(candidate: CandidateLoop): CandidateValidationResult {
  const errors: string[] = [];
  const { width, height, edges } = candidate;
  if (candidate.artifactType !== 'candidate-loop' || candidate.version !== '1.0') {
    errors.push('candidate artifact type/version is not supported');
  }
  if (!Number.isInteger(width) || width < 2 || !Number.isInteger(height) || height < 2) {
    errors.push('width and height must be integers of at least 2');
  }
  if (edges.length < 4) errors.push('a loop must contain at least four edges');

  const seenEdges = new Set<EdgeId>();
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (seenEdges.has(edge)) {
      errors.push(`duplicate edge: ${edge}`);
      continue;
    }
    seenEdges.add(edge);
    const parsed = parseEdgeId(edge);
    if (!parsed) {
      errors.push(`invalid edge identifier: ${String(edge)}`);
      continue;
    }
    const inBounds = parsed.orientation === 'h'
      ? parsed.row <= height && parsed.column < width
      : parsed.row < height && parsed.column <= width;
    if (!inBounds) {
      errors.push(`edge outside board: ${edge}`);
      continue;
    }
    const [a, b] = edgeVertices(edge);
    const aKey = vertexKey(a);
    const bKey = vertexKey(b);
    const aNeighbors = adjacency.get(aKey) ?? [];
    const bNeighbors = adjacency.get(bKey) ?? [];
    aNeighbors.push(bKey);
    bNeighbors.push(aKey);
    adjacency.set(aKey, aNeighbors);
    adjacency.set(bKey, bNeighbors);
  }

  for (const [vertex, neighbors] of adjacency) {
    if (neighbors.length !== 2) {
      errors.push(`vertex ${vertex} has degree ${neighbors.length}; expected 2`);
    }
  }
  if (hasFullCellEnclosure(seenEdges, width, height)) {
    errors.push('loop contains a full-cell four-edge enclosure');
  }
  if (errors.length === 0 && !connected(edges, adjacency)) {
    errors.push('loop edges are disconnected');
  }
  return errors.length === 0
    ? { valid: true, errors: [], metrics: metrics(edges, width, height) }
    : { valid: false, errors };
}

export function isCandidateLoop(candidate: CandidateLoop): boolean {
  return validateCandidateLoop(candidate).valid;
}

export function candidateVertices(edges: readonly EdgeId[]): CandidateVertex[] {
  if (edges.length === 0) return [];
  const vertices: CandidateVertex[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    for (const vertex of edgeVertices(edge)) {
      const key = vertexKey(vertex);
      if (!seen.has(key)) {
        seen.add(key);
        vertices.push(vertex);
      }
    }
  }
  return vertices.sort((a, b) => a.row - b.row || a.column - b.column);
}

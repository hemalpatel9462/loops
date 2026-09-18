import type { EdgeId } from '@loops/puzzle-format';
import type { AnalyzerPuzzle, LoopMetrics, OrderedLoop } from './types.ts';

interface ParsedEdge {
  readonly orientation: 'h' | 'v';
  readonly row: number;
  readonly column: number;
}

interface Vertex {
  readonly row: number;
  readonly column: number;
}

const EDGE_PATTERN = /^([hv]):([0-9]+):([0-9]+)$/;

function parseEdge(edge: EdgeId): ParsedEdge | undefined {
  const match = EDGE_PATTERN.exec(edge);
  return match
    ? { orientation: match[1] as 'h' | 'v', row: Number(match[2]), column: Number(match[3]) }
    : undefined;
}

function edgeVertices(edge: EdgeId): [Vertex, Vertex] | undefined {
  const parsed = parseEdge(edge);
  if (!parsed) return undefined;
  return parsed.orientation === 'h'
    ? [{ row: parsed.row, column: parsed.column }, { row: parsed.row, column: parsed.column + 1 }]
    : [{ row: parsed.row, column: parsed.column }, { row: parsed.row + 1, column: parsed.column }];
}

function vertexKey(vertex: Vertex): string {
  return `${vertex.row}:${vertex.column}`;
}

function direction(edge: EdgeId): 'h' | 'v' {
  return edge[0] === 'v' ? 'v' : 'h';
}

/** Orders an edge collection by following adjacent vertices around the loop. */
export function orderLoopEdges(edges: readonly EdgeId[]): OrderedLoop {
  if (edges.length < 2) return { edges: [...edges], validOrder: false };
  const incident = new Map<string, EdgeId[]>();
  for (const edge of edges) {
    const vertices = edgeVertices(edge);
    if (!vertices) continue;
    for (const vertex of vertices) {
      const key = vertexKey(vertex);
      incident.set(key, [...(incident.get(key) ?? []), edge]);
    }
  }
  const first = edges[0];
  const firstVertices = edgeVertices(first);
  if (!firstVertices) return { edges: [...edges], validOrder: false };
  const ordered = [first];
  const used = new Set<EdgeId>([first]);
  const startKey = vertexKey(firstVertices[0]);
  let currentKey = vertexKey(firstVertices[1]);
  while (currentKey !== startKey) {
    const next = (incident.get(currentKey) ?? []).find((edge) => !used.has(edge));
    if (!next) return { edges: [...edges], validOrder: false };
    used.add(next);
    ordered.push(next);
    const vertices = edgeVertices(next)!;
    currentKey = vertexKey(vertexKey(vertices[0]) === currentKey ? vertices[1] : vertices[0]);
    if (ordered.length > edges.length) return { edges: [...edges], validOrder: false };
  }
  return { edges: ordered.length === edges.length ? ordered : [...edges], validOrder: ordered.length === edges.length };
}

function regionKey(vertex: Vertex, width: number, height: number): string {
  const rowZone = vertex.row === 0 ? 0 : vertex.row > height / 2 ? 2 : 1;
  const columnZone = vertex.column === 0 ? 0 : vertex.column > width / 2 ? 2 : 1;
  return `${rowZone}:${columnZone}`;
}

function runLengths(orderedEdges: readonly EdgeId[]): number[] {
  if (orderedEdges.length === 0) return [];
  const directions = orderedEdges.map(direction);
  const runs: number[] = [];
  let current = directions[0];
  let length = 1;
  for (let index = 1; index < directions.length; index += 1) {
    if (directions[index] === current) length += 1;
    else {
      runs.push(length);
      current = directions[index];
      length = 1;
    }
  }
  if (directions[directions.length - 1] === current && runs.length > 0 && directions[0] === current) {
    runs[0] += length;
  } else {
    runs.push(length);
  }
  return runs;
}

function symmetryScore(vertices: readonly Vertex[], width: number, height: number): number {
  if (vertices.length === 0) return 0;
  const unique = new Set(vertices.map(vertexKey));
  const score = (transform: (vertex: Vertex) => Vertex): number => {
    const matches = vertices.filter((vertex) => unique.has(vertexKey(transform(vertex)))).length;
    return matches / vertices.length;
  };
  return Math.max(
    score((vertex) => ({ row: vertex.row, column: width - vertex.column })),
    score((vertex) => ({ row: height - vertex.row, column: vertex.column })),
    score((vertex) => ({ row: height - vertex.row, column: width - vertex.column })),
  );
}

export function measureLoop(puzzle: AnalyzerPuzzle): LoopMetrics {
  const ordered = orderLoopEdges(puzzle.solutionEdges);
  const vertices = puzzle.solutionEdges.flatMap((edge) => edgeVertices(edge) ?? []);
  const rows = vertices.map((vertex) => vertex.row);
  const columns = vertices.map((vertex) => vertex.column);
  const minRow = rows.length > 0 ? Math.min(...rows) : 0;
  const maxRow = rows.length > 0 ? Math.max(...rows) : 0;
  const minColumn = columns.length > 0 ? Math.min(...columns) : 0;
  const maxColumn = columns.length > 0 ? Math.max(...columns) : 0;
  const uniqueRows = new Set(rows);
  const uniqueColumns = new Set(columns);
  const regions = new Set(vertices.map((vertex) => regionKey(vertex, puzzle.width, puzzle.height)));
  const runs = runLengths(ordered.edges);
  const turnCount = ordered.edges.reduce((turns, edge, index) => {
    const previous = ordered.edges[(index + ordered.edges.length - 1) % ordered.edges.length];
    return turns + (direction(edge) === direction(previous) ? 0 : 1);
  }, 0);
  const totalBoardEdges = puzzle.width * (puzzle.height + 1) + puzzle.height * (puzzle.width + 1);
  const repetitionScore = runs.length === 0 ? 0 : 1 - new Set(runs).size / runs.length;
  return {
    loopLength: puzzle.solutionEdges.length,
    boundingBoxWidthRatio: puzzle.width === 0 ? 0 : (maxColumn - minColumn) / puzzle.width,
    boundingBoxHeightRatio: puzzle.height === 0 ? 0 : (maxRow - minRow) / puzzle.height,
    rowsUsed: uniqueRows.size,
    columnsUsed: uniqueColumns.size,
    regionalCoverage: regions.size,
    turnCount,
    density: totalBoardEdges === 0 ? 0 : puzzle.solutionEdges.length / totalBoardEdges,
    repetitionScore,
    symmetryScore: symmetryScore(vertices, puzzle.width, puzzle.height),
    longestStraightRun: runs.length === 0 ? 0 : Math.max(...runs),
    averageStraightRun: runs.length === 0 ? 0 : puzzle.solutionEdges.length / runs.length,
  };
}

export const analyzeLoopGeometry = measureLoop;

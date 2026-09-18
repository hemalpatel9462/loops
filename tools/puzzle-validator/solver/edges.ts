import type { EdgeId } from '@loops/puzzle-format';

export interface ParsedEdge {
  readonly orientation: 'h' | 'v';
  readonly row: number;
  readonly column: number;
}

const EDGE_PATTERN = /^([hv]):([0-9]+):([0-9]+)$/;

export function createEdgeId(orientation: 'h' | 'v', row: number, column: number): EdgeId {
  return `${orientation}:${row}:${column}` as EdgeId;
}

export function parseEdgeId(value: unknown): ParsedEdge | undefined {
  if (typeof value !== 'string') return undefined;
  const match = EDGE_PATTERN.exec(value);
  return match
    ? { orientation: match[1] as 'h' | 'v', row: Number(match[2]), column: Number(match[3]) }
    : undefined;
}

export function isEdgeInBounds(edge: ParsedEdge, width: number, height: number): boolean {
  return edge.orientation === 'h'
    ? edge.row <= height && edge.column < width
    : edge.row < height && edge.column <= width;
}

export function allBoardEdges(width: number, height: number): EdgeId[] {
  const edges: EdgeId[] = [];
  for (let row = 0; row <= height; row += 1) {
    for (let column = 0; column < width; column += 1) edges.push(createEdgeId('h', row, column));
  }
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column <= width; column += 1) edges.push(createEdgeId('v', row, column));
  }
  return edges;
}

export interface Vertex {
  readonly row: number;
  readonly column: number;
}

export function vertexKey(vertex: Vertex): string {
  return `${vertex.row}:${vertex.column}`;
}

export function edgeVertices(edge: EdgeId): [Vertex, Vertex] {
  const parsed = parseEdgeId(edge);
  if (!parsed) throw new RangeError(`Invalid edge identifier: ${String(edge)}`);
  return parsed.orientation === 'h'
    ? [{ row: parsed.row, column: parsed.column }, { row: parsed.row, column: parsed.column + 1 }]
    : [{ row: parsed.row, column: parsed.column }, { row: parsed.row + 1, column: parsed.column }];
}

export function cellEdges(row: number, column: number): [EdgeId, EdgeId, EdgeId, EdgeId] {
  return [
    createEdgeId('h', row, column),
    createEdgeId('h', row + 1, column),
    createEdgeId('v', row, column),
    createEdgeId('v', row, column + 1),
  ];
}

export function edgesAtVertex(row: number, column: number, width: number, height: number): EdgeId[] {
  const edges: EdgeId[] = [];
  if (row > 0) edges.push(createEdgeId('h', row - 1, column));
  if (row < height) edges.push(createEdgeId('h', row, column));
  if (column > 0) edges.push(createEdgeId('v', row, column - 1));
  if (column < width) edges.push(createEdgeId('v', row, column));
  return edges;
}

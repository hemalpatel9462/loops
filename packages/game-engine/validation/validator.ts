import { createEdgeId, isEdgeInBounds, parseEdgeId } from '@loops/puzzle-format';
import type { EdgeId, PuzzleDefinition } from '@loops/puzzle-format';
import type { EdgeState, EdgeStateMap } from '../model/edge-state';

export interface ValidationPuzzle {
  readonly width: number;
  readonly height: number;
  readonly clues: readonly (readonly number[])[];
}

export interface ValidationState {
  readonly width: number;
  readonly height: number;
  readonly edgeStates: EdgeStateMap;
}

export type PuzzleValidationInput = Pick<
  PuzzleDefinition,
  'width' | 'height' | 'clues'
>;

export type EdgeInput =
  | ValidationState
  | Pick<ValidationState, 'edgeStates'>
  | EdgeStateMap
  | readonly EdgeId[];

export interface CellCoordinate {
  readonly row: number;
  readonly column: number;
}

export interface VertexCoordinate {
  readonly row: number;
  readonly column: number;
}

export interface ClueViolation extends CellCoordinate {
  readonly expected: number;
  readonly actual: number;
}

export interface ClueValidationResult {
  readonly valid: boolean;
  readonly violations: readonly ClueViolation[];
  readonly clueViolations: readonly ClueViolation[];
  readonly counts: readonly (readonly number[])[];
}

export interface VertexViolation extends VertexCoordinate {
  readonly degree: number;
  readonly kind: 'endpoint' | 'branch';
}

export interface VertexValidationResult {
  readonly valid: boolean;
  readonly violations: readonly VertexViolation[];
  readonly endpoints: readonly VertexViolation[];
  readonly branches: readonly VertexViolation[];
  readonly degrees: Readonly<Record<string, number>>;
}

export interface ConnectivityValidationResult {
  readonly valid: boolean;
  readonly connected: boolean;
  readonly closed: boolean;
  readonly hasSingleLoop: boolean;
  readonly componentCount: number;
  readonly components: readonly (readonly EdgeId[])[];
}

export interface RuleValidationResult {
  readonly valid: boolean;
  readonly complete: boolean;
  readonly clues: ClueValidationResult;
  readonly vertices: VertexValidationResult;
  readonly connectivity: ConnectivityValidationResult;
  readonly selectedEdges: readonly EdgeId[];
  readonly outOfBoundsEdges: readonly EdgeId[];
}

export const validateCompletion = (
  puzzle: PuzzleValidationInput,
  edgeInput: EdgeInput,
): RuleValidationResult => validateRules(puzzle, edgeInput);

export const checkCompletion = validateCompletion;

function isStateInput(
  value: EdgeInput,
): value is ValidationState | Pick<ValidationState, 'edgeStates'> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as { readonly edgeStates?: unknown };
  return (
    typeof candidate.edgeStates === 'object' &&
    candidate.edgeStates !== null &&
    !Array.isArray(candidate.edgeStates)
  );
}

function getEdgeStates(edgeInput: EdgeInput): EdgeStateMap {
  if (Array.isArray(edgeInput)) {
    const selected: Record<string, EdgeState> = {};
    for (const edge of edgeInput) {
      selected[edge] = 'line';
    }
    return selected;
  }

  return isStateInput(edgeInput)
    ? edgeInput.edgeStates
    : edgeInput as EdgeStateMap;
}

function canonicalEdgeSort(a: EdgeId, b: EdgeId): number {
  return a.localeCompare(b, 'en');
}

function normalizeEdges(
  puzzle: Pick<ValidationPuzzle, 'width' | 'height'>,
  edgeInput: EdgeInput,
): { readonly selectedEdges: readonly EdgeId[]; readonly outOfBoundsEdges: readonly EdgeId[] } {
  const selected = Object.entries(getEdgeStates(edgeInput))
    .filter(([, state]) => state === 'line')
    .map(([edge]) => edge as EdgeId)
    .sort(canonicalEdgeSort);
  const selectedEdges: EdgeId[] = [];
  const outOfBoundsEdges: EdgeId[] = [];

  for (const edge of selected) {
    const parsed = parseEdgeId(edge);
    if (!parsed || !isEdgeInBounds(parsed, puzzle.width, puzzle.height)) {
      outOfBoundsEdges.push(edge);
      continue;
    }
    selectedEdges.push(edge);
  }

  return { selectedEdges, outOfBoundsEdges };
}

function edgeIsSelected(edgeStates: EdgeStateMap, edge: EdgeId): boolean {
  return edgeStates[edge] === 'line';
}

function cellEdges(row: number, column: number): readonly EdgeId[] {
  return [
    createEdgeId('h', row, column),
    createEdgeId('h', row + 1, column),
    createEdgeId('v', row, column),
    createEdgeId('v', row, column + 1),
  ];
}

export function validateClues(
  puzzle: PuzzleValidationInput,
  edgeInput: EdgeInput,
): ClueValidationResult {
  const edgeStates = getEdgeStates(edgeInput);
  const counts: number[][] = [];
  const violations: ClueViolation[] = [];

  for (let row = 0; row < puzzle.height; row += 1) {
    const countRow: number[] = [];
    counts.push(countRow);
    for (let column = 0; column < puzzle.width; column += 1) {
      const actual = cellEdges(row, column).filter((edge) => edgeIsSelected(edgeStates, edge)).length;
      countRow.push(actual);
      const expected = puzzle.clues[row]?.[column];
      if (typeof expected !== 'number' || expected !== actual) {
        violations.push({
          row,
          column,
          expected: typeof expected === 'number' ? expected : Number.NaN,
          actual,
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    clueViolations: violations,
    counts,
  };
}

interface VertexGraph {
  readonly vertices: ReadonlyMap<string, VertexCoordinate>;
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  readonly edgeEndpoints: ReadonlyMap<EdgeId, readonly [string, string]>;
}

function vertexKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function endpointsForEdge(edge: EdgeId): readonly [VertexCoordinate, VertexCoordinate] | undefined {
  const parsed = parseEdgeId(edge);
  if (!parsed) {
    return undefined;
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

function buildVertexGraph(edges: readonly EdgeId[]): VertexGraph {
  const vertices = new Map<string, VertexCoordinate>();
  const mutableAdjacency = new Map<string, string[]>();
  const edgeEndpoints = new Map<EdgeId, readonly [string, string]>();

  for (const edge of edges) {
    const endpoints = endpointsForEdge(edge);
    if (!endpoints) {
      continue;
    }
    const first = vertexKey(endpoints[0].row, endpoints[0].column);
    const second = vertexKey(endpoints[1].row, endpoints[1].column);
    vertices.set(first, endpoints[0]);
    vertices.set(second, endpoints[1]);
    const firstEdges = mutableAdjacency.get(first) ?? [];
    const secondEdges = mutableAdjacency.get(second) ?? [];
    firstEdges.push(second);
    secondEdges.push(first);
    mutableAdjacency.set(first, firstEdges);
    mutableAdjacency.set(second, secondEdges);
    edgeEndpoints.set(edge, [first, second]);
  }

  const adjacency = new Map<string, readonly string[]>();
  for (const [key, neighbors] of mutableAdjacency) {
    adjacency.set(key, Object.freeze([...neighbors].sort()));
  }

  return { vertices, adjacency, edgeEndpoints };
}

export function validateVertices(
  puzzle: Pick<ValidationPuzzle, 'width' | 'height'>,
  edgeInput: EdgeInput,
): VertexValidationResult {
  const { selectedEdges } = normalizeEdges(puzzle, edgeInput);
  const graph = buildVertexGraph(selectedEdges);
  const violations: VertexViolation[] = [];
  const degrees: Record<string, number> = {};

  for (const [key, coordinate] of graph.vertices) {
    const degree = graph.adjacency.get(key)?.length ?? 0;
    degrees[key] = degree;
    if (degree === 1) {
      violations.push({ ...coordinate, degree, kind: 'endpoint' });
    } else if (degree !== 0 && degree !== 2) {
      violations.push({ ...coordinate, degree, kind: 'branch' });
    }
  }

  violations.sort((a, b) => a.row - b.row || a.column - b.column);
  return {
    valid: violations.length === 0,
    violations,
    endpoints: violations.filter((violation) => violation.kind === 'endpoint'),
    branches: violations.filter((violation) => violation.kind === 'branch'),
    degrees,
  };
}

function connectedComponents(
  edges: readonly EdgeId[],
  graph: VertexGraph,
): readonly (readonly EdgeId[])[] {
  const edgeByVertex = new Map<string, EdgeId[]>();
  for (const edge of edges) {
    const endpoints = graph.edgeEndpoints.get(edge);
    if (!endpoints) continue;
    for (const vertex of endpoints) {
      const incident = edgeByVertex.get(vertex) ?? [];
      incident.push(edge);
      edgeByVertex.set(vertex, incident);
    }
  }

  const visited = new Set<EdgeId>();
  const components: EdgeId[][] = [];
  for (const root of edges) {
    if (visited.has(root)) continue;
    const component: EdgeId[] = [];
    const pending: EdgeId[] = [root];
    visited.add(root);
    while (pending.length > 0) {
      const edge = pending.pop() as EdgeId;
      component.push(edge);
      for (const vertex of graph.edgeEndpoints.get(edge) ?? []) {
        for (const adjacent of edgeByVertex.get(vertex) ?? []) {
          if (!visited.has(adjacent)) {
            visited.add(adjacent);
            pending.push(adjacent);
          }
        }
      }
    }
    component.sort(canonicalEdgeSort);
    components.push(component);
  }
  return components;
}

export function validateConnectivity(
  puzzle: Pick<ValidationPuzzle, 'width' | 'height'>,
  edgeInput: EdgeInput,
): ConnectivityValidationResult {
  const { selectedEdges } = normalizeEdges(puzzle, edgeInput);
  const graph = buildVertexGraph(selectedEdges);
  const components = connectedComponents(selectedEdges, graph);
  const vertices = validateVertices(puzzle, edgeInput);
  const connected = components.length === 1;
  const closed = selectedEdges.length > 0 && vertices.valid;
  const hasSingleLoop = selectedEdges.length > 0 && connected && closed;

  return {
    valid: hasSingleLoop,
    connected,
    closed,
    hasSingleLoop,
    componentCount: components.length,
    components,
  };
}

export function validateRules(
  puzzle: PuzzleValidationInput,
  edgeInput: EdgeInput,
): RuleValidationResult {
  const { selectedEdges, outOfBoundsEdges } = normalizeEdges(puzzle, edgeInput);
  const clues = validateClues(puzzle, edgeInput);
  const vertices = validateVertices(puzzle, edgeInput);
  const connectivity = validateConnectivity(puzzle, edgeInput);
  const valid =
    outOfBoundsEdges.length === 0 &&
    clues.valid &&
    vertices.valid &&
    connectivity.valid;

  return {
    valid,
    complete: valid,
    clues,
    vertices,
    connectivity,
    selectedEdges,
    outOfBoundsEdges,
  };
}

export const validatePuzzleState = validateRules;
export const validateGameState = validateRules;
export const validateClueCounts = validateClues;
export const validateVertexDegrees = validateVertices;
export const validateSingleLoop = validateConnectivity;

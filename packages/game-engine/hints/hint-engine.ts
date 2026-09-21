import { allBoardEdges } from '../model/board';
import type { EdgeState, EdgeStateMap } from '../model/edge-state';
import type { EdgeId, PuzzleDefinition } from '@loops/puzzle-format';
import { createEdgeId, parseEdgeId } from '@loops/puzzle-format';

export type HintLevel = 1 | 2 | 3;
export type DeductionType = 'player-mistake' | 'direct-clue' | 'vertex' | 'connectivity' | 'contradiction';
export type RecommendedState = EdgeState;

export interface HintPuzzle {
  readonly width: number;
  readonly height: number;
  readonly clues: readonly (readonly number[])[];
  readonly id?: string;
  /** The canonical solution is used only to locate incorrect player marks. */
  readonly solutionEdges?: readonly EdgeId[];
}

export interface HintState {
  readonly width?: number;
  readonly height?: number;
  readonly edgeStates: EdgeStateMap;
  readonly fixedEdges?: readonly EdgeId[];
  /** Most recent first. Used to keep hints near the player's active area. */
  readonly recentEdges?: readonly EdgeId[];
}

export interface HintHighlight {
  readonly edge: EdgeId;
  readonly cell?: readonly [number, number];
  readonly vertex?: readonly [number, number];
}

export interface HintEvidence {
  readonly forced: boolean;
  readonly deductionType: DeductionType;
  readonly reason: string;
  readonly relatedEdges: readonly EdgeId[];
  readonly alternatives: readonly {
    readonly state: RecommendedState;
    readonly allowed: boolean;
  }[];
}

export interface HintDeduction {
  readonly deductionType: DeductionType;
  readonly targetEdge?: EdgeId;
  readonly targetCell?: readonly [number, number];
  readonly targetVertex?: readonly [number, number];
  readonly recommendedState?: RecommendedState;
  readonly evidence: HintEvidence;
}

export interface RuntimeHint {
  readonly puzzleId?: string;
  readonly hintLevel: HintLevel;
  readonly deductionType: DeductionType;
  readonly forced: boolean;
  readonly highlight?: HintHighlight;
  readonly explanation?: string;
  readonly reveal?: {
    readonly edge: EdgeId;
    readonly state: RecommendedState;
  };
  readonly targetEdge?: EdgeId;
  readonly targetCell?: { readonly row: number; readonly column: number };
  readonly recommendedState?: RecommendedState;
  readonly evidence: HintEvidence;
}

export interface HintSearchResult {
  readonly deductions: readonly HintDeduction[];
  readonly stateIsConsistent: boolean;
}

interface NormalizedState {
  readonly edgeStates: EdgeStateMap;
  readonly fixedEdges: ReadonlySet<EdgeId>;
  readonly recentEdges: readonly EdgeId[];
}

interface CellObservation {
  readonly row: number;
  readonly column: number;
  readonly clue: number;
  readonly edges: readonly EdgeId[];
  readonly selected: readonly EdgeId[];
  readonly unknown: readonly EdgeId[];
}

interface VertexObservation {
  readonly row: number;
  readonly column: number;
  readonly edges: readonly EdgeId[];
  readonly selected: readonly EdgeId[];
  readonly unknown: readonly EdgeId[];
}

interface PartialChecks {
  readonly clue: boolean;
  readonly vertex: boolean;
  readonly connectivity: boolean;
  readonly valid: boolean;
}

const DEDUCTION_ORDER: readonly DeductionType[] = [
  'player-mistake',
  'direct-clue',
  'vertex',
  'connectivity',
  'contradiction',
];

function isHintState(state: HintState | EdgeStateMap): state is HintState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'edgeStates' in state &&
    typeof (state as { readonly edgeStates?: unknown }).edgeStates === 'object'
  );
}

function getEdgeStates(state: HintState | EdgeStateMap): EdgeStateMap {
  return isHintState(state) ? state.edgeStates : state;
}

function normalizeState(
  puzzle: HintPuzzle,
  state: HintState | EdgeStateMap,
): NormalizedState {
  const edgeStates = getEdgeStates(state);
  const fixedEdges = isHintState(state) && state.fixedEdges
    ? new Set<EdgeId>(state.fixedEdges)
    : new Set<EdgeId>();
  const recentEdges = isHintState(state) && state.recentEdges
    ? state.recentEdges
    : [];
  const canonical: Record<string, EdgeState> = {};
  for (const edge of allBoardEdges(puzzle.width, puzzle.height)) {
    canonical[edge] = edgeStates[edge] ?? 'unknown';
  }
  for (const edge of fixedEdges) {
    canonical[edge] = 'line';
  }
  return {
    edgeStates: canonical,
    fixedEdges,
    recentEdges: recentEdges.filter((edge) => Object.prototype.hasOwnProperty.call(canonical, edge)),
  };
}

function cellEdges(row: number, column: number): readonly EdgeId[] {
  return [
    createEdgeId('h', row, column),
    createEdgeId('h', row + 1, column),
    createEdgeId('v', row, column),
    createEdgeId('v', row, column + 1),
  ];
}

function vertexEdges(row: number, column: number, width: number, height: number): readonly EdgeId[] {
  const edges: EdgeId[] = [];
  if (column > 0) edges.push(createEdgeId('h', row, column - 1));
  if (column < width) edges.push(createEdgeId('h', row, column));
  if (row > 0) edges.push(createEdgeId('v', row - 1, column));
  if (row < height) edges.push(createEdgeId('v', row, column));
  return edges;
}

function edgeSort(a: EdgeId, b: EdgeId): number {
  return a.localeCompare(b, 'en');
}

function isUnknown(state: NormalizedState, edge: EdgeId): boolean {
  return !state.fixedEdges.has(edge) && state.edgeStates[edge] === 'unknown';
}

function observeCells(puzzle: HintPuzzle, state: NormalizedState): readonly CellObservation[] {
  const observations: CellObservation[] = [];
  for (let row = 0; row < puzzle.height; row += 1) {
    for (let column = 0; column < puzzle.width; column += 1) {
      const edges = cellEdges(row, column);
      observations.push({
        row,
        column,
        clue: puzzle.clues[row]?.[column] ?? Number.NaN,
        edges,
        selected: edges.filter((edge) => state.edgeStates[edge] === 'line'),
        unknown: edges.filter((edge) => isUnknown(state, edge)),
      });
    }
  }
  return observations;
}

function observeVertices(puzzle: HintPuzzle, state: NormalizedState): readonly VertexObservation[] {
  const observations: VertexObservation[] = [];
  for (let row = 0; row <= puzzle.height; row += 1) {
    for (let column = 0; column <= puzzle.width; column += 1) {
      const edges = vertexEdges(row, column, puzzle.width, puzzle.height);
      observations.push({
        row,
        column,
        edges,
        selected: edges.filter((edge) => state.edgeStates[edge] === 'line'),
        unknown: edges.filter((edge) => isUnknown(state, edge)),
      });
    }
  }
  return observations;
}

function cloneWithMove(
  state: NormalizedState,
  edge: EdgeId,
  nextState: RecommendedState,
): NormalizedState {
  return {
    edgeStates: { ...state.edgeStates, [edge]: nextState },
    fixedEdges: state.fixedEdges,
    recentEdges: state.recentEdges,
  };
}

function partialCluesValid(puzzle: HintPuzzle, state: NormalizedState): boolean {
  for (const cell of observeCells(puzzle, state)) {
    const selected = cell.selected.length;
    if (!Number.isFinite(cell.clue) || selected > cell.clue || selected + cell.unknown.length < cell.clue) {
      return false;
    }
  }
  return true;
}

function partialVerticesValid(puzzle: HintPuzzle, state: NormalizedState): boolean {
  for (const vertex of observeVertices(puzzle, state)) {
    const degree = vertex.selected.length;
    if (degree > 2 || (degree > 0 && degree + vertex.unknown.length < 2)) {
      return false;
    }
  }
  return true;
}

function edgeEndpoints(edge: EdgeId): readonly [string, string] | undefined {
  const parsed = parseEdgeId(edge);
  if (!parsed) return undefined;
  if (parsed.orientation === 'h') {
    return [`${parsed.row}:${parsed.column}`, `${parsed.row}:${parsed.column + 1}`];
  }
  return [`${parsed.row}:${parsed.column}`, `${parsed.row + 1}:${parsed.column}`];
}

function hasPrematureCycle(puzzle: HintPuzzle, state: NormalizedState): boolean {
  const selected = allBoardEdges(puzzle.width, puzzle.height)
    .filter((edge) => state.edgeStates[edge] === 'line')
    .sort(edgeSort);
  const adjacency = new Map<string, string[]>();
  const selectedByVertex = new Map<string, EdgeId[]>();
  for (const edge of selected) {
    const endpoints = edgeEndpoints(edge);
    if (!endpoints) continue;
    const [first, second] = endpoints;
    adjacency.set(first, [...(adjacency.get(first) ?? []), second]);
    adjacency.set(second, [...(adjacency.get(second) ?? []), first]);
    selectedByVertex.set(first, [...(selectedByVertex.get(first) ?? []), edge]);
    selectedByVertex.set(second, [...(selectedByVertex.get(second) ?? []), edge]);
  }

  const visited = new Set<string>();
  const cycleComponents: string[][] = [];
  const selectedVertices = [...adjacency.keys()].sort();
  for (const root of selectedVertices) {
    if (visited.has(root)) continue;
    const component: string[] = [];
    const pending = [root];
    visited.add(root);
    while (pending.length > 0) {
      const vertex = pending.pop() as string;
      component.push(vertex);
      for (const adjacent of adjacency.get(vertex) ?? []) {
        if (!visited.has(adjacent)) {
          visited.add(adjacent);
          pending.push(adjacent);
        }
      }
    }
    const edgeCount = component.reduce(
      (count, vertex) => count + (selectedByVertex.get(vertex)?.length ?? 0),
      0,
    ) / 2;
    const allDegreeTwo = component.every(
      (vertex) => (selectedByVertex.get(vertex)?.length ?? 0) === 2,
    );
    if (allDegreeTwo && edgeCount > 0) cycleComponents.push(component);
  }

  if (cycleComponents.length === 0) return false;
  if (cycleComponents.length > 1) return true;

  const cycleVertices = new Set(cycleComponents[0]);
  return selectedVertices.some((vertex) => !cycleVertices.has(vertex));
}

function partialChecks(puzzle: HintPuzzle, state: NormalizedState): PartialChecks {
  const clue = partialCluesValid(puzzle, state);
  const vertex = partialVerticesValid(puzzle, state);
  const connectivity = !hasPrematureCycle(puzzle, state);
  return { clue, vertex, connectivity, valid: clue && vertex && connectivity };
}

function evidence(
  deductionType: DeductionType,
  reason: string,
  relatedEdges: readonly EdgeId[],
  alternatives: readonly { state: RecommendedState; allowed: boolean }[],
  forced: boolean,
): HintEvidence {
  return {
    forced,
    deductionType,
    reason,
    relatedEdges: [...relatedEdges].sort(edgeSort),
    alternatives,
  };
}

function cellsForEdge(
  puzzle: HintPuzzle,
  edge: EdgeId,
): readonly (readonly [number, number])[] {
  const parsed = parseEdgeId(edge);
  if (!parsed) return [];

  const candidates: readonly (readonly [number, number])[] = parsed.orientation === 'h'
    ? [[parsed.row, parsed.column], [parsed.row - 1, parsed.column]]
    : [[parsed.row, parsed.column], [parsed.row, parsed.column - 1]];

  return candidates.filter(([row, column]) => (
    row >= 0 && row < puzzle.height && column >= 0 && column < puzzle.width
  ));
}

function cellForEdge(
  puzzle: HintPuzzle,
  edge: EdgeId,
): readonly [number, number] | undefined {
  return cellsForEdge(puzzle, edge)[0];
}

function playerMistakeDeductions(
  puzzle: HintPuzzle,
  state: NormalizedState,
): readonly HintDeduction[] {
  if (!puzzle.solutionEdges) return [];

  const solution = new Set(puzzle.solutionEdges);
  const deductions: HintDeduction[] = [];
  for (const edge of [...allBoardEdges(puzzle.width, puzzle.height)].sort(edgeSort)) {
    if (state.fixedEdges.has(edge)) continue;

    const current = state.edgeStates[edge];
    const expected: RecommendedState = solution.has(edge) ? 'line' : 'unknown';
    const isIncorrect = (current === 'line' && expected === 'unknown')
      || (current === 'x' && expected === 'line');
    if (!isIncorrect) continue;

    const targetCell = cellForEdge(puzzle, edge);
    deductions.push({
      deductionType: 'player-mistake',
      targetEdge: edge,
      targetCell,
      recommendedState: expected,
      evidence: evidence(
        'player-mistake',
        expected === 'line'
          ? 'This edge is part of the solution, so the X mark here should be a line.'
          : 'This line is not part of the solution. Remove it; leaving the edge blank is valid.',
        [edge],
        expected === 'line'
          ? [
              { state: 'line', allowed: true },
              { state: 'x', allowed: false },
            ]
          : [
              { state: 'unknown', allowed: true },
              { state: 'line', allowed: false },
            ],
        true,
      ),
    });
  }
  return deductions;
}

function directClueDeductions(
  puzzle: HintPuzzle,
  state: NormalizedState,
): readonly HintDeduction[] {
  const deductions: HintDeduction[] = [];
  for (const cell of observeCells(puzzle, state)) {
    if (!Number.isFinite(cell.clue) || cell.unknown.length === 0) continue;
    const selectedCount = cell.selected.length;
    if (selectedCount === cell.clue) {
      for (const edge of cell.unknown) {
        deductions.push({
          deductionType: 'direct-clue',
          targetEdge: edge,
          targetCell: [cell.row, cell.column],
          recommendedState: 'x',
          evidence: evidence(
            'direct-clue',
            `Cell (${cell.row}, ${cell.column}) already has its required ${cell.clue} line${cell.clue === 1 ? '' : 's'}, so this edge must be excluded.`,
            cell.edges,
            [
              { state: 'x', allowed: true },
              { state: 'line', allowed: false },
            ],
            true,
          ),
        });
      }
    } else if (selectedCount + cell.unknown.length === cell.clue) {
      for (const edge of cell.unknown) {
        deductions.push({
          deductionType: 'direct-clue',
          targetEdge: edge,
          targetCell: [cell.row, cell.column],
          recommendedState: 'line',
          evidence: evidence(
            'direct-clue',
            `Cell (${cell.row}, ${cell.column}) needs every remaining edge to reach its clue of ${cell.clue}; this edge must be drawn.`,
            cell.edges,
            [
              { state: 'line', allowed: true },
              { state: 'x', allowed: false },
            ],
            true,
          ),
        });
      }
    }
  }
  return deductions;
}

function vertexDeductions(
  puzzle: HintPuzzle,
  state: NormalizedState,
): readonly HintDeduction[] {
  const deductions: HintDeduction[] = [];
  for (const vertex of observeVertices(puzzle, state)) {
    if (vertex.unknown.length === 0) continue;
    const selectedCount = vertex.selected.length;
    if (selectedCount === 2) {
      for (const edge of vertex.unknown) {
        deductions.push({
          deductionType: 'vertex',
          targetEdge: edge,
          targetVertex: [vertex.row, vertex.column],
          recommendedState: 'x',
          evidence: evidence(
            'vertex',
            `Vertex (${vertex.row}, ${vertex.column}) already has two loop edges, so additional edges would create a branch.`,
            vertex.edges,
            [
              { state: 'x', allowed: true },
              { state: 'line', allowed: false },
            ],
            true,
          ),
        });
      }
    } else if (selectedCount + vertex.unknown.length === 2) {
      for (const edge of vertex.unknown) {
        deductions.push({
          deductionType: 'vertex',
          targetEdge: edge,
          targetVertex: [vertex.row, vertex.column],
          recommendedState: 'line',
          evidence: evidence(
            'vertex',
            `Vertex (${vertex.row}, ${vertex.column}) needs every remaining edge to reach degree two and keep the loop continuous.`,
            vertex.edges,
            [
              { state: 'line', allowed: true },
              { state: 'x', allowed: false },
            ],
            true,
          ),
        });
      }
    }
  }
  return deductions;
}

function connectivityDeductions(
  puzzle: HintPuzzle,
  state: NormalizedState,
): readonly HintDeduction[] {
  const deductions: HintDeduction[] = [];
  const unknown = allBoardEdges(puzzle.width, puzzle.height)
    .filter((edge) => isUnknown(state, edge))
    .sort(edgeSort);
  for (const edge of unknown) {
    const lineState = cloneWithMove(state, edge, 'line');
    const xState = cloneWithMove(state, edge, 'x');
    const lineChecks = partialChecks(puzzle, lineState);
    const xChecks = partialChecks(puzzle, xState);
    if (!lineChecks.connectivity && xChecks.valid) {
      deductions.push({
        deductionType: 'connectivity',
        targetEdge: edge,
        recommendedState: 'x',
        evidence: evidence(
          'connectivity',
          'Drawing this edge would close a loop while another selected segment remains outside it, creating more than one loop.',
          [edge],
          [
            { state: 'x', allowed: true },
            { state: 'line', allowed: false },
          ],
          true,
        ),
      });
    }
  }
  return deductions;
}

function contradictionDeductions(
  puzzle: HintPuzzle,
  state: NormalizedState,
): readonly HintDeduction[] {
  const deductions: HintDeduction[] = [];
  const current = partialChecks(puzzle, state);
  const unknown = allBoardEdges(puzzle.width, puzzle.height)
    .filter((edge) => isUnknown(state, edge))
    .sort(edgeSort);
  for (const edge of unknown) {
    const lineChecks = partialChecks(puzzle, cloneWithMove(state, edge, 'line'));
    const xChecks = partialChecks(puzzle, cloneWithMove(state, edge, 'x'));
    if (!lineChecks.valid && !xChecks.valid) {
      deductions.push({
        deductionType: 'contradiction',
        targetEdge: edge,
        evidence: evidence(
          'contradiction',
          current.valid
            ? 'Neither state for this edge can satisfy the current clue, vertex, and connectivity constraints; inspect the surrounding moves.'
            : 'The current board already contains a contradiction; this edge cannot repair both possible assignments.',
          [edge],
          [
            { state: 'line', allowed: false },
            { state: 'x', allowed: false },
          ],
          false,
        ),
      });
    }
  }
  return deductions;
}

function edgeDistance(first: EdgeId, second: EdgeId): number {
  const firstParsed = parseEdgeId(first);
  const secondParsed = parseEdgeId(second);
  if (!firstParsed || !secondParsed) return Number.MAX_SAFE_INTEGER;

  const firstRow = firstParsed.row + (firstParsed.orientation === 'v' ? 0.5 : 0);
  const firstColumn = firstParsed.column + (firstParsed.orientation === 'h' ? 0.5 : 0);
  const secondRow = secondParsed.row + (secondParsed.orientation === 'v' ? 0.5 : 0);
  const secondColumn = secondParsed.column + (secondParsed.orientation === 'h' ? 0.5 : 0);
  return Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn);
}

function knownEdgeCount(edges: readonly EdgeId[], state: NormalizedState): number {
  return edges.filter((edge) => !isUnknown(state, edge)).length;
}

function frontierScore(
  puzzle: HintPuzzle,
  state: NormalizedState,
  deduction: HintDeduction,
): number {
  if (!deduction.targetEdge) return 0;

  const target = parseEdgeId(deduction.targetEdge);
  if (!target) return 0;

  const endpoints: readonly (readonly [number, number])[] = target.orientation === 'h'
    ? [[target.row, target.column], [target.row, target.column + 1]]
    : [[target.row, target.column], [target.row + 1, target.column]];
  const adjacentEdges = endpoints.flatMap(([row, column]) => vertexEdges(row, column, puzzle.width, puzzle.height));
  const relatedEdges = new Set([
    ...adjacentEdges,
    ...deduction.evidence.relatedEdges,
  ]);
  relatedEdges.delete(deduction.targetEdge);
  return knownEdgeCount([...relatedEdges], state);
}

function sortDeductions(
  puzzle: HintPuzzle,
  state: NormalizedState,
  deductions: readonly HintDeduction[],
): readonly HintDeduction[] {
  return [...deductions].sort((a, b) => {
    const typeOrder = DEDUCTION_ORDER.indexOf(a.deductionType) - DEDUCTION_ORDER.indexOf(b.deductionType);
    const aIsMistake = a.deductionType === 'player-mistake';
    const bIsMistake = b.deductionType === 'player-mistake';
    if (aIsMistake !== bIsMistake) return aIsMistake ? -1 : 1;

    const latestEdge = state.recentEdges[0];
    if (aIsMistake && bIsMistake) {
      const aRecency = a.targetEdge ? state.recentEdges.indexOf(a.targetEdge) : -1;
      const bRecency = b.targetEdge ? state.recentEdges.indexOf(b.targetEdge) : -1;
      if (aRecency !== bRecency) {
        if (aRecency < 0) return 1;
        if (bRecency < 0) return -1;
        return aRecency - bRecency;
      }
    }

    if (latestEdge && a.targetEdge && b.targetEdge) {
      const distanceOrder = edgeDistance(a.targetEdge, latestEdge) - edgeDistance(b.targetEdge, latestEdge);
      if (distanceOrder !== 0) return distanceOrder;
    }

    // After a reload there is no move history. Prefer the unresolved edge
    // surrounded by the most player decisions, so hints resume at the
    // current frontier instead of restarting at the first cell.
    const frontierOrder = frontierScore(puzzle, state, b) - frontierScore(puzzle, state, a);
    if (frontierOrder !== 0) return frontierOrder;
    if (typeOrder !== 0) return typeOrder;
    return (a.targetEdge ?? '').localeCompare(b.targetEdge ?? '', 'en');
  });
}

export function findDeductions(
  puzzle: HintPuzzle,
  stateInput: HintState | EdgeStateMap,
): HintSearchResult {
  const state = normalizeState(puzzle, stateInput);
  const current = partialChecks(puzzle, state);
  const deductions = sortDeductions(puzzle, state, [
    ...playerMistakeDeductions(puzzle, state),
    ...directClueDeductions(puzzle, state),
    ...vertexDeductions(puzzle, state),
    ...connectivityDeductions(puzzle, state),
    ...contradictionDeductions(puzzle, state),
  ]);
  return { deductions, stateIsConsistent: current.valid };
}

function toRuntimeHint(
  puzzle: HintPuzzle,
  deduction: HintDeduction,
  hintLevel: HintLevel,
): RuntimeHint {
  const highlight = deduction.targetEdge
    ? {
        edge: deduction.targetEdge,
        ...(deduction.targetCell ? { cell: deduction.targetCell } : {}),
        ...(deduction.targetVertex ? { vertex: deduction.targetVertex } : {}),
      }
    : undefined;
  const reveal = hintLevel === 3 && deduction.targetEdge && deduction.recommendedState
    ? { edge: deduction.targetEdge, state: deduction.recommendedState }
    : undefined;
  return {
    puzzleId: puzzle.id,
    hintLevel,
    deductionType: deduction.deductionType,
    forced: deduction.evidence.forced,
    highlight,
    explanation: hintLevel >= 2 ? deduction.evidence.reason : undefined,
    reveal,
    targetEdge: deduction.targetEdge,
    targetCell: deduction.targetCell
      ? { row: deduction.targetCell[0], column: deduction.targetCell[1] }
      : undefined,
    recommendedState: deduction.recommendedState,
    evidence: deduction.evidence,
  };
}

export function computeHint(
  puzzle: HintPuzzle,
  state: HintState | EdgeStateMap,
  hintLevel: HintLevel = 1,
): RuntimeHint | undefined {
  if (![1, 2, 3].includes(hintLevel)) {
    throw new RangeError('Hint level must be 1, 2, or 3.');
  }
  const result = findDeductions(puzzle, state);
  // X marks are optional player notes. Keep those deductions available to
  // rule analysis, but never turn one into a user-facing or auto-applied hint.
  const actionable = result.deductions.filter((candidate) => candidate.recommendedState !== 'x');
  const deduction = actionable.find((candidate) => candidate.evidence.forced)
    ?? actionable[0];
  return deduction ? toRuntimeHint(puzzle, deduction, hintLevel) : undefined;
}

export const getHint = computeHint;
export const requestHint = computeHint;

export function applyHintToEdgeStates(
  edgeStates: EdgeStateMap,
  hint: RuntimeHint,
): EdgeStateMap {
  if (!hint.reveal) return edgeStates;
  return Object.freeze({
    ...edgeStates,
    [hint.reveal.edge]: hint.reveal.state,
  });
}

export const applyHint = applyHintToEdgeStates;

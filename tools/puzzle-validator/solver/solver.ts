import type { EdgeId, PuzzleDefinition, SolutionCount, SolverReport } from '@loops/puzzle-format';
import {
  allBoardEdges,
  cellEdges,
  edgeVertices,
  edgesAtVertex,
  isEdgeInBounds,
  parseEdgeId,
  vertexKey,
} from './edges.ts';
import type { SolverOptions, SolverResult } from './types.ts';

type Assignment = 'line' | 'excluded';

interface InternalState {
  readonly assignments: Map<EdgeId, Assignment>;
  readonly unknown: Set<EdgeId>;
}

interface MutableDeductions {
  direct: number;
  vertex: number;
  connectivity: number;
  contradiction: number;
  searchOnly: number;
  maximumDepth: number;
}

interface Component {
  readonly edges: EdgeId[];
  readonly vertices: Set<string>;
}

function initialDeductions(): MutableDeductions {
  return { direct: 0, vertex: 0, connectivity: 0, contradiction: 0, searchOnly: 0, maximumDepth: 0 };
}

function cloneState(state: InternalState): InternalState {
  return { assignments: new Map(state.assignments), unknown: new Set(state.unknown) };
}

function setAssignment(
  state: InternalState,
  edge: EdgeId,
  value: Assignment,
): 'changed' | 'same' | 'conflict' {
  const existing = state.assignments.get(edge);
  if (existing) return existing === value ? 'same' : 'conflict';
  if (!state.unknown.has(edge)) return 'conflict';
  state.unknown.delete(edge);
  state.assignments.set(edge, value);
  return 'changed';
}

function selectedCount(state: InternalState, edges: readonly EdgeId[]): number {
  return edges.reduce((count, edge) => count + (state.assignments.get(edge) === 'line' ? 1 : 0), 0);
}

function unknownEdges(state: InternalState, edges: readonly EdgeId[]): EdgeId[] {
  return edges.filter((edge) => state.unknown.has(edge));
}

function selectedEdges(state: InternalState): EdgeId[] {
  return [...state.assignments.entries()].filter(([, value]) => value === 'line').map(([edge]) => edge);
}

function components(edges: readonly EdgeId[]): Component[] {
  const adjacency = new Map<string, Array<{ edge: EdgeId; vertex: string }>>();
  for (const edge of edges) {
    const [a, b] = edgeVertices(edge);
    const aKey = vertexKey(a);
    const bKey = vertexKey(b);
    adjacency.set(aKey, [...(adjacency.get(aKey) ?? []), { edge, vertex: bKey }]);
    adjacency.set(bKey, [...(adjacency.get(bKey) ?? []), { edge, vertex: aKey }]);
  }
  const visited = new Set<string>();
  const result: Component[] = [];
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    const queue = [start];
    const vertices = new Set<string>([start]);
    const componentEdges = new Set<EdgeId>();
    visited.add(start);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const link of adjacency.get(current) ?? []) {
        componentEdges.add(link.edge);
        if (!visited.has(link.vertex)) {
          visited.add(link.vertex);
          vertices.add(link.vertex);
          queue.push(link.vertex);
        }
      }
    }
    result.push({ edges: [...componentEdges], vertices });
  }
  return result;
}

function hasClosedSelectedComponent(state: InternalState): boolean {
  const selected = selectedEdges(state);
  for (const component of components(selected)) {
    const degrees = new Map<string, number>();
    for (const edge of component.edges) {
      const [a, b] = edgeVertices(edge);
      degrees.set(vertexKey(a), (degrees.get(vertexKey(a)) ?? 0) + 1);
      degrees.set(vertexKey(b), (degrees.get(vertexKey(b)) ?? 0) + 1);
    }
    if (component.edges.length >= 4 && [...degrees.values()].every((degree) => degree === 2)) return true;
  }
  return false;
}

function finalSolutionIsValid(
  state: InternalState,
  puzzle: PuzzleDefinition,
): boolean {
  const selected = selectedEdges(state);
  if (selected.length < 4 || components(selected).length !== 1) return false;
  for (let row = 0; row < puzzle.height; row += 1) {
    for (let column = 0; column < puzzle.width; column += 1) {
      if (selectedCount(state, cellEdges(row, column)) !== puzzle.clues[row][column]) return false;
    }
  }
  for (let row = 0; row <= puzzle.height; row += 1) {
    for (let column = 0; column <= puzzle.width; column += 1) {
      if (selectedCount(state, edgesAtVertex(row, column, puzzle.width, puzzle.height)) % 2 !== 0) return false;
      if (![0, 2].includes(selectedCount(state, edgesAtVertex(row, column, puzzle.width, puzzle.height)))) return false;
    }
  }
  return true;
}

function chooseBranchEdge(state: InternalState, puzzle: PuzzleDefinition): EdgeId | undefined {
  const candidates = [...state.unknown];
  candidates.sort((a, b) => {
    const score = (edge: EdgeId) => {
      const [first, second] = edgeVertices(edge);
      let value = 0;
      for (const cell of [[first.row - 1, first.column], [first.row, first.column - 1], [second.row - 1, second.column], [second.row, second.column - 1]]) {
        if (cell[0] >= 0 && cell[0] < puzzle.height && cell[1] >= 0 && cell[1] < puzzle.width) value += 2;
      }
      value += edgesAtVertex(first.row, first.column, puzzle.width, puzzle.height).length;
      value += edgesAtVertex(second.row, second.column, puzzle.width, puzzle.height).length;
      return value;
    };
    return score(b) - score(a) || a.localeCompare(b);
  });
  return candidates[0];
}

function propagate(
  state: InternalState,
  puzzle: PuzzleDefinition,
  deductions: MutableDeductions,
): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (let row = 0; row < puzzle.height; row += 1) {
      for (let column = 0; column < puzzle.width; column += 1) {
        const edges = cellEdges(row, column);
        const selected = selectedCount(state, edges);
        const unknown = unknownEdges(state, edges);
        const clue = puzzle.clues[row][column];
        if (selected > clue || selected + unknown.length < clue) {
          deductions.contradiction += 1;
          return false;
        }
        const forced: Assignment | undefined = selected === clue ? 'excluded' : selected + unknown.length === clue ? 'line' : undefined;
        if (forced) {
          for (const edge of unknown) {
            const result = setAssignment(state, edge, forced);
            if (result === 'conflict') {
              deductions.contradiction += 1;
              return false;
            }
            if (result === 'changed') {
              deductions.direct += 1;
              changed = true;
            }
          }
        }
      }
    }
    for (let row = 0; row <= puzzle.height; row += 1) {
      for (let column = 0; column <= puzzle.width; column += 1) {
        const edges = edgesAtVertex(row, column, puzzle.width, puzzle.height);
        const selected = selectedCount(state, edges);
        const unknown = unknownEdges(state, edges);
        if (selected > 2 || (selected === 1 && unknown.length === 0)) {
          deductions.contradiction += 1;
          return false;
        }
        const forced: Assignment | undefined = selected === 2
          ? 'excluded'
          : selected === 1 && unknown.length === 1
            ? 'line'
            : selected === 0 && unknown.length === 1
              ? 'excluded'
              : undefined;
        if (forced) {
          for (const edge of unknown) {
            const result = setAssignment(state, edge, forced);
            if (result === 'conflict') {
              deductions.contradiction += 1;
              return false;
            }
            if (result === 'changed') {
              deductions.vertex += 1;
              changed = true;
            }
          }
        }
      }
    }
    if (hasClosedSelectedComponent(state)) {
      const selected = selectedEdges(state);
      const closed = components(selected).some((component) => {
        const degrees = new Map<string, number>();
        for (const edge of component.edges) {
          const [a, b] = edgeVertices(edge);
          degrees.set(vertexKey(a), (degrees.get(vertexKey(a)) ?? 0) + 1);
          degrees.set(vertexKey(b), (degrees.get(vertexKey(b)) ?? 0) + 1);
        }
        return component.edges.length >= 4 && [...degrees.values()].every((degree) => degree === 2);
      });
      if (closed && components(selected).length > 1) {
        deductions.connectivity += 1;
        deductions.contradiction += 1;
        return false;
      }
    }
  }
  return true;
}

function normalizeInput(puzzle: PuzzleDefinition, options: SolverOptions): { state: InternalState; error?: string } {
  if (!isPuzzleShapeValid(puzzle)) return { state: { assignments: new Map(), unknown: new Set() }, error: 'puzzle definition failed shared contract validation' };
  const allEdges = allBoardEdges(puzzle.width, puzzle.height);
  const state: InternalState = { assignments: new Map(), unknown: new Set(allEdges) };
  const fixed = [...new Set([...(puzzle.startingEdges ?? []), ...(options.fixedEdges ?? [])])];
  const excluded = new Set(options.excludedEdges ?? []);
  for (const edge of [...fixed, ...excluded]) {
    const parsed = parseEdgeId(edge);
    if (!parsed || !isEdgeInBounds(parsed, puzzle.width, puzzle.height)) {
      return { state, error: `edge outside board: ${String(edge)}` };
    }
  }
  for (const edge of fixed) {
    if (excluded.has(edge) || setAssignment(state, edge, 'line') === 'conflict') return { state, error: `fixed/excluded conflict: ${edge}` };
  }
  for (const edge of excluded) {
    if (setAssignment(state, edge, 'excluded') === 'conflict') return { state, error: `fixed/excluded conflict: ${edge}` };
  }
  return { state };
}

function isPuzzleShapeValid(puzzle: PuzzleDefinition): boolean {
  if (!puzzle || !Number.isInteger(puzzle.width) || puzzle.width < 2 || !Number.isInteger(puzzle.height) || puzzle.height < 2) return false;
  if (!Array.isArray(puzzle.clues) || puzzle.clues.length !== puzzle.height) return false;
  for (const row of puzzle.clues) {
    if (!Array.isArray(row) || row.length !== puzzle.width || row.some((clue) => !Number.isInteger(clue) || clue < 0 || clue > 3)) return false;
  }
  if (typeof puzzle.id !== 'string' || puzzle.id.length === 0) return false;
  return true;
}

export function solvePuzzle(puzzle: PuzzleDefinition, options: SolverOptions = {}): SolverResult {
  const started = Date.now();
  const deductions = initialDeductions();
  const normalized = normalizeInput(puzzle, options);
  const solutions: EdgeId[][] = [];
  let exploredNodes = 0;
  const maxSolutions = 2;
  const rejectionReasons: string[] = [];

  function search(state: InternalState, depth: number): void {
    if (solutions.length >= maxSolutions) return;
    exploredNodes += 1;
    deductions.maximumDepth = Math.max(deductions.maximumDepth, depth);
    const working = cloneState(state);
    if (!propagate(working, puzzle, deductions)) return;
    if (working.unknown.size === 0) {
      if (finalSolutionIsValid(working, puzzle)) solutions.push(selectedEdges(working).sort());
      return;
    }
    const branch = chooseBranchEdge(working, puzzle);
    if (!branch) return;
    deductions.searchOnly += 1;
    const lineBranch = cloneState(working);
    if (setAssignment(lineBranch, branch, 'line') !== 'conflict') search(lineBranch, depth + 1);
    if (solutions.length >= maxSolutions) return;
    const excludedBranch = cloneState(working);
    if (setAssignment(excludedBranch, branch, 'excluded') !== 'conflict') search(excludedBranch, depth + 1);
  }

  if (normalized.error) rejectionReasons.push(normalized.error);
  else search(normalized.state, 0);
  const solutionCount: SolutionCount = solutions.length === 0 ? 0 : solutions.length === 1 ? 1 : 2;
  const report: SolverReport = {
    schemaVersion: '1.0',
    puzzleId: puzzle.id,
    solutionCount,
    unique: solutionCount === 1,
    valid: solutionCount > 0,
    elapsedMilliseconds: Math.max(0, Date.now() - started),
    deductions,
    ...(rejectionReasons.length > 0 ? { rejectionReasons } : {}),
  };
  return { report, solutionCount, solutions, exploredNodes };
}

export const solve = solvePuzzle;
export const solvePuzzleDefinition = solvePuzzle;

export type EdgeOrientation = 'h' | 'v';

/** A validated grid-edge identifier in h:row:column or v:row:column form. */
export type EdgeId = string & { readonly __brand: 'LoopsEdgeId' };

export interface ParsedEdgeId {
  readonly orientation: EdgeOrientation;
  readonly row: number;
  readonly column: number;
}

const EDGE_ID_PATTERN = /^([hv]):([0-9]+):([0-9]+)$/;

export function isEdgeId(value: unknown): value is EdgeId {
  return typeof value === 'string' && EDGE_ID_PATTERN.test(value);
}

export function parseEdgeId(value: unknown): ParsedEdgeId | undefined {
  if (!isEdgeId(value)) {
    return undefined;
  }

  const match = EDGE_ID_PATTERN.exec(value);
  if (!match) {
    return undefined;
  }

  return {
    orientation: match[1] as EdgeOrientation,
    row: Number(match[2]),
    column: Number(match[3]),
  };
}

export function createEdgeId(
  orientation: EdgeOrientation,
  row: number,
  column: number,
): EdgeId {
  if (!Number.isInteger(row) || row < 0) {
    throw new RangeError('Edge row must be a non-negative integer.');
  }
  if (!Number.isInteger(column) || column < 0) {
    throw new RangeError('Edge column must be a non-negative integer.');
  }

  return `${orientation}:${row}:${column}` as EdgeId;
}

export const makeEdgeId = createEdgeId;

export function isEdgeInBounds(
  edge: ParsedEdgeId,
  width: number,
  height: number,
): boolean {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    return false;
  }

  return edge.orientation === 'h'
    ? edge.row <= height && edge.column < width
    : edge.row < height && edge.column <= width;
}

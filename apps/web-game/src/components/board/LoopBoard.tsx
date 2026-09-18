import { allBoardEdges } from '@loops/game-engine/model';
import { createEdgeId, parseEdgeId } from '@loops/puzzle-format';
import type { EdgeId } from '@loops/puzzle-format';
import { EdgeSegment } from '../edge/index.ts';
import type { EdgeGeometry } from '../edge/types.ts';
import type { LoopBoardProps } from './types.ts';
import './board.css';

const CELL_SIZE = 100;

function edgeGeometry(edge: EdgeId): EdgeGeometry {
  const parsed = parseEdgeId(edge);
  if (!parsed) throw new RangeError(`Invalid board edge: ${edge}`);
  if (parsed.orientation === 'h') {
    return {
      x1: parsed.column * CELL_SIZE,
      y1: parsed.row * CELL_SIZE,
      x2: (parsed.column + 1) * CELL_SIZE,
      y2: parsed.row * CELL_SIZE,
      orientation: 'horizontal',
    };
  }
  return {
    x1: parsed.column * CELL_SIZE,
    y1: parsed.row * CELL_SIZE,
    x2: parsed.column * CELL_SIZE,
    y2: (parsed.row + 1) * CELL_SIZE,
    orientation: 'vertical',
  };
}

function edgeState(
  edgeStates: LoopBoardProps['edgeStates'],
  edge: EdgeId,
): 'unknown' | 'line' | 'x' {
  return edgeStates?.[edge] ?? 'unknown';
}

function cellLabel(row: number, column: number, clue: number): string {
  return `Cell ${row + 1}, ${column + 1}, clue ${clue}`;
}

export function LoopBoard({
  width,
  height,
  clues,
  edgeStates,
  fixedEdges = [],
  onEdgeAction,
  ariaLabel = 'Loops puzzle board',
  className = '',
}: LoopBoardProps) {
  const fixed = new Set(fixedEdges);
  const edges = allBoardEdges(width, height);
  const boardClassName = ['loop-board', className].filter(Boolean).join(' ');

  return (
    <section className={boardClassName} aria-label={ariaLabel}>
      <div className="loop-board__viewport">
        <svg
          aria-label={ariaLabel}
          className="loop-board__svg"
          role="grid"
          style={{ aspectRatio: `${width} / ${height}` }}
          viewBox={`0 0 ${width * CELL_SIZE} ${height * CELL_SIZE}`}
        >
          <g className="loop-board__cells" aria-label="Puzzle clues">
            {Array.from({ length: height }, (_, row) =>
              Array.from({ length: width }, (_, column) => {
                const clue = clues[row]?.[column] ?? 0;
                return (
                  <g
                    aria-label={cellLabel(row, column, clue)}
                    className="loop-board__cell"
                    data-cell={`${row}:${column}`}
                    key={`${row}:${column}`}
                    role="gridcell"
                  >
                    <rect
                      height={CELL_SIZE}
                      width={CELL_SIZE}
                      x={column * CELL_SIZE}
                      y={row * CELL_SIZE}
                    />
                    <text
                      className="loop-board__clue"
                      dominantBaseline="central"
                      textAnchor="middle"
                      x={(column + 0.5) * CELL_SIZE}
                      y={(row + 0.5) * CELL_SIZE}
                    >
                      {clue}
                    </text>
                  </g>
                );
              }),
            )}
          </g>

          <g className="loop-board__edges" aria-label="Puzzle edges">
            {edges.map((edge) => (
              <EdgeSegment
                edgeId={edge}
                fixed={fixed.has(edge)}
                geometry={edgeGeometry(edge)}
                key={edge}
                onAction={onEdgeAction}
                state={edgeState(edgeStates, edge)}
              />
            ))}
          </g>

          <g className="loop-board__dots" aria-hidden="true">
            {Array.from({ length: height + 1 }, (_, row) =>
              Array.from({ length: width + 1 }, (_, column) => (
                <circle
                  className="loop-board__dot"
                  cx={column * CELL_SIZE}
                  cy={row * CELL_SIZE}
                  key={`${row}:${column}`}
                  r="5"
                />
              )),
            )}
          </g>
        </svg>
      </div>
    </section>
  );
}

export const Board = LoopBoard;
export default LoopBoard;

export { CELL_SIZE, edgeGeometry, createEdgeId };

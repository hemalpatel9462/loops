import type { KeyboardEvent, PointerEvent } from 'react';
import type { EdgeSegmentProps } from './types.ts';
import './edge.css';

function describeEdge(edgeId: string, state: string, fixed: boolean): string {
  const [orientation, row, column] = edgeId.split(':');
  const direction = orientation === 'h' ? 'horizontal' : 'vertical';
  const status = fixed ? 'fixed line' : state === 'unknown' ? 'empty' : state;
  return `${direction} edge, row ${row}, column ${column}: ${status}`;
}

export function EdgeSegment({
  edgeId,
  geometry,
  state = 'unknown',
  fixed = false,
  onAction,
}: EdgeSegmentProps) {
  const handleAction = () => {
    if (!fixed) onAction?.(edgeId, 'cycle');
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (fixed) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAction();
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGGElement>) => {
    event.preventDefault();
    handleAction();
  };

  const { x1, y1, x2, y2 } = geometry;
  const className = [
    'loop-edge',
    `loop-edge--${state}`,
    fixed ? 'loop-edge--fixed' : '',
    `loop-edge--${geometry.orientation}`,
  ].filter(Boolean).join(' ');

  return (
    <g
      aria-disabled={fixed || undefined}
      aria-label={describeEdge(edgeId, state, fixed)}
      className={className}
      data-edge-id={edgeId}
      data-edge-state={fixed ? 'fixed' : state}
      data-fixed={fixed ? 'true' : 'false'}
      onKeyDown={handleKeyDown}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={fixed ? 0 : 0}
    >
      <line
        className="loop-edge__hit-target"
        data-hit-target="true"
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
      />
      <line
        className="loop-edge__guide"
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
      />
      {(state === 'line' || fixed) && (
        <line
          className="loop-edge__line"
          x1={x1}
          x2={x2}
          y1={y1}
          y2={y2}
        />
      )}
      {state === 'x' && (
        <g className="loop-edge__x" aria-hidden="true">
          <line x1={x1 - 8} x2={x2 + 8} y1={y1 - 8} y2={y2 + 8} />
          <line x1={x1 - 8} x2={x2 + 8} y1={y1 + 8} y2={y2 - 8} />
        </g>
      )}
    </g>
  );
}

export default EdgeSegment;

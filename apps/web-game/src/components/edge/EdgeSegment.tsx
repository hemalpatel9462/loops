import type { KeyboardEvent, PointerEvent } from 'react';
import { X as XIcon } from 'lucide-react';
import type { EdgeSegmentProps } from './types.ts';
import './edge.css';

const X_MARK_SIZE = 24;

function describeEdge(edgeId: string, state: string, fixed: boolean): string {
  const [orientation, row, column] = edgeId.split(':');
  const direction = orientation === 'h' ? 'horizontal' : 'vertical';
  const status = fixed ? 'fixed line' : state === 'unknown' ? 'empty' : state;
  return `${direction} edge, row ${row}, column ${column}: ${status}`;
}

export function EdgeSegment({
  edgeId,
  geometry,
  hintState,
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
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const showHint = Boolean(hintState && state === hintState && !fixed);
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
      data-hint-state={showHint ? hintState : undefined}
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
      {(state === 'line' || fixed) && !showHint && (
        <line
          className="loop-edge__line"
          x1={x1}
          x2={x2}
          y1={y1}
          y2={y2}
        />
      )}
      {state === 'x' && !showHint && (
        <g className="loop-edge__x" aria-hidden="true">
          <XIcon
            aria-hidden="true"
            className="loop-edge__x-icon"
            height={X_MARK_SIZE}
            strokeWidth={2.5}
            width={X_MARK_SIZE}
            x={centerX - X_MARK_SIZE / 2}
            y={centerY - X_MARK_SIZE / 2}
          />
        </g>
      )}
      {showHint && hintState === 'line' && (
        <line
          className="loop-edge__hint-line"
          x1={x1}
          x2={x2}
          y1={y1}
          y2={y2}
        />
      )}
      {showHint && hintState === 'x' && (
        <g className="loop-edge__x loop-edge__x--hint" aria-hidden="true">
          <XIcon
            aria-hidden="true"
            className="loop-edge__x-icon"
            height={X_MARK_SIZE}
            strokeWidth={2.5}
            width={X_MARK_SIZE}
            x={centerX - X_MARK_SIZE / 2}
            y={centerY - X_MARK_SIZE / 2}
          />
        </g>
      )}
    </g>
  );
}

export default EdgeSegment;

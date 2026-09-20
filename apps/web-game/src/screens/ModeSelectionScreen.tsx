import { PuzzleSelectionScreen } from './PuzzleSelectionScreen';
import type { ModeSelectionProps } from './types';
import './screens.css';

/** @deprecated Use PuzzleSelectionScreen. This compatibility export has no mode picker. */
export function ModeSelectionScreen(props: ModeSelectionProps) {
  return <PuzzleSelectionScreen {...props} />;
}

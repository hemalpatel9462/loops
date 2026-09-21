import type { Difficulty } from '@loops/puzzle-format';
import { Crown, Flame, Leaf, Mountain, Sprout } from 'lucide-react';
import type { PuzzleSelectionProps } from './types';
import { PUZZLE_SLOT_COUNT } from './puzzle-constants';
import './screens.css';

const difficulties: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];
const difficultyIcons = {
  beginner: Sprout,
  easy: Leaf,
  medium: Mountain,
  hard: Flame,
  expert: Crown,
} as const;

function titleCase(value: string): string {
  return value[0].toUpperCase() + value.slice(1);
}

function statusLabel(status: PuzzleSelectionProps['puzzleSequence'][number]['status'], number: number): string {
  if (status === 'locked') return `Locked — complete puzzle ${number - 1} first`;
  if (status === 'in-progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  return 'Available';
}

export function PuzzleSelectionScreen({
  selectedDifficulty,
  puzzleSequence,
  onDifficultyChange,
  onPuzzleSelect,
  onBack,
}: PuzzleSelectionProps) {
  return (
    <section className="flow-screen flow-screen--selection" aria-labelledby="puzzle-selection-title">
      <header className="flow-screen__header flow-screen__header--selection">
        <button aria-label="Back to start" className="flow-back flow-back--icon" onClick={onBack} type="button">
          <span aria-hidden="true">←</span>
        </button>
        <h1 id="puzzle-selection-title">Choose a puzzle</h1>
      </header>

      <fieldset aria-label="Difficulty" className="flow-picker">
        <div className="flow-picker__options">
          {difficulties.map((difficulty) => {
            const Icon = difficultyIcons[difficulty];
            return (
              <button
                aria-pressed={selectedDifficulty === difficulty}
                className="flow-choice"
                key={difficulty}
                onClick={() => onDifficultyChange(difficulty)}
                type="button"
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2} />
                <span>{titleCase(difficulty)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset aria-label={`${titleCase(selectedDifficulty)} puzzles`} className="flow-picker flow-picker--puzzles">
        <ol className="puzzle-list">
          {Array.from({ length: PUZZLE_SLOT_COUNT }, (_, index) => {
            const number = index + 1;
            const item = puzzleSequence[index];
            const locked = !item || item.status === 'locked';
            const status = item ? statusLabel(item.status, item.number) : 'Locked — puzzle not available yet';
            return (
              <li className={`puzzle-list__item puzzle-list__item--${item?.status ?? 'locked'}`} key={item?.puzzle.id ?? `${selectedDifficulty}-${number}`}>
                <button
                  aria-label={`Puzzle ${number}: ${status}`}
                  className="puzzle-choice"
                  disabled={locked}
                  onClick={item ? () => onPuzzleSelect(item.number) : undefined}
                  type="button"
                >
                  <span className="puzzle-choice__number" aria-hidden="true">{number}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </fieldset>

    </section>
  );
}

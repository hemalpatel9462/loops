# Loops Product Requirements

This document captures confirmed product enhancements and fixes before they
are converted into an implementation plan for the Orchestrator.

## 1. Puzzle Selection and Progression

### 1.1 Start screen

Add a start screen before the user enters the puzzle-selection flow.

### 1.2 Difficulty and puzzle selection

- The user first selects a difficulty.
- After a difficulty is selected, show the puzzles available within that
  difficulty.
- Number the puzzles sequentially, starting at `1` for each difficulty.

### 1.3 Sequential unlocking

- The user must solve puzzles in sequence.
- Puzzle 1 is initially available.
- The next puzzle remains locked until the current puzzle is solved.
- A solved puzzle must be visually marked with a success-state color.

## 2. Selection Screen Simplification

- Remove Play mode selection from the puzzle-selection screen.
- Make Play mode a global setting instead.
- Remove Quick Play.
- Keep Daily Loop and Continue in the flow for now; their behavior is not
  changed by this requirements batch unless specified later.

## 3. Copy and Layout Cleanup

- Remove the heading “Play at your pace.”
- Remove the tagline “Every puzzle is validated locally and works offline.”
- Reassess the oversized typography and overall layout after those two text
  elements are removed.

## 4. Theme and Contrast Simplification

- Remove Dark Mode entirely.
- Remove High Contrast entirely.
- Remove the related UI controls, preference state, persistence, styling
  behavior, and tests.
- Keep the application in its standard light theme and default contrast.
- Ensure no settings or accessibility flow exposes either option.

## 5. Reference Notes

- The supplied screenshot documents the current UI state only. It is a visual
  reference and does not add requirements beyond the user's written request.

## 6. How-to-Play Navigation and Tutorial

### 6.1 Current defect

- The “How to play” navigation item is currently a hash link to
  `#how-to-play`.
- No rendered element has the `how-to-play` ID, so the link only changes the
  URL hash and does not show content.
- The existing `Tutorial` component is implemented but is not imported or
  rendered by the active `AppShell` composition root.
- The tutorial's required open, complete, skip, and close callbacks are not
  connected to any parent state.

### 6.2 Required fix

- Wire the “How to play” navigation item to open the existing tutorial.
- Render the tutorial from the active application shell using controlled open
  state.
- Connect the tutorial's completion, skip, and close actions to the application
  flow.
- Preserve the tutorial's step navigation and practice content.
- Ensure the dialog is keyboard-accessible and can be closed without starting
  a puzzle unintentionally.
- Add coverage proving that selecting “How to play” opens the tutorial and
  that its close, skip, and completion actions behave correctly.

## 7. Open Decisions for Later Refinement

- Exact content, branding, and primary action for the new start screen.
- Exact global Play mode setting location and interaction.
- Exact behavior and relationship of Daily Loop and Continue within the new
  sequential puzzle flow.
- Exact success-state color and visual treatment for solved puzzles.
- Presentation of the puzzle list when a difficulty contains many puzzles.

# Loops Enhancements — Orchestrator Implementation Plan

**Status:** Proposed implementation plan

**Source requirements:**
[REQUIREMENTS.md](/Users/hemalpatel/Development/loops/orchestration/REQUIREMENTS.md)

**Baseline:** The existing MVP1 implementation and the tasks recorded in
`orchestration/task-registry.json` are treated as the starting point. This plan
adds a follow-up implementation wave; it does not replace the original plan.

## 1. Objective

Update the active Loops browser flow so that users:

1. See a start screen before puzzle selection.
2. Choose a difficulty and then choose a numbered puzzle within that
   difficulty.
3. Progress through each difficulty sequentially, with future puzzles locked
   until the previous puzzle is solved.
4. See completed puzzles marked with an accessible success state.
5. Use a globally configured gameplay mode from Settings rather than choosing
   the mode inside the puzzle-selection screen.
6. Continue to use Daily Loop and Continue while Quick Play is removed.
7. Can open the existing How-to-Play tutorial from the primary navigation.
8. Use the standard light theme and default contrast only.

The implementation must preserve the existing puzzle engine, validated puzzle
data, local/offline operation, Daily Loop behavior, Continue behavior, reduced-
motion support, and gameplay rules.

## 2. Confirmed behavior

### 2.1 Entry and selection flow

```text
Start screen
    ↓ Start
Puzzle selection
    ├─ choose difficulty
    ├─ choose numbered puzzle 1..N
    ├─ Daily Loop
    └─ Continue, when unfinished progress exists
```

- The start screen is the first screen inside the active game flow.
- Selecting a difficulty reveals the puzzles in that difficulty.
- Difficulty controls show the number of puzzles available.
- Puzzle numbers are one-based and restart at `1` for every difficulty.
- Puzzle ordering must be deterministic and derived from the validated catalog
  order, not from a display-only counter that can change between sessions.

### 2.2 Sequential progression

- Puzzle 1 of every difficulty is available initially.
- Puzzle `N + 1` is locked until puzzle `N` has a persisted completed record.
- Locked puzzles cannot start a session and communicate why they are locked.
- Completed puzzles remain visibly completed and may be replayed unless a later
  product decision changes that behavior.
- An unfinished selected puzzle resumes its saved state when possible.
- The existing global Continue action continues to resume the current
  unfinished puzzle.
- Completing a selected puzzle persists completion before the selection screen
  is shown again, so the next puzzle unlocks immediately.

### 2.3 Gameplay mode

- Relaxed/Assisted is configured in global Settings.
- The selection screen does not contain a Play mode picker.
- The setting applies to newly started puzzles.
- Continue preserves the mode stored with the unfinished puzzle.
- Changing the setting during an active puzzle must not mutate that active
  session's mode.

### 2.4 Removed UI and features

- Remove Quick Play from the UI and from the user-facing flow.
- Remove the “Play at your pace.” heading.
- Remove the “Every puzzle is validated locally and works offline.” tagline.
- Remove Dark Mode and High Contrast controls and behavior.
- The application remains in the standard light theme and default contrast.
- Reduced-motion support remains intact.

### 2.5 How-to-Play tutorial

- The existing How-to-Play navigation item opens the existing tutorial dialog.
- It must not rely on a hash target that is not rendered.
- The tutorial remains a controlled dialog with its existing steps and practice
  content.
- Close, Skip tutorial, Back, Next, and final completion actions must work.
- Closing or completing the tutorial from navigation returns to the current
  flow without starting a puzzle unintentionally.
- The dialog must remain keyboard-accessible and expose its modal semantics.

## 3. Planning assumptions

These assumptions resolve implementation details that were not specified in the
request while keeping the behavior reversible:

- The current catalog order within each difficulty defines puzzle numbering.
- Existing per-puzzle `PlayerProgress.completed` records are the source of
  truth for sequential unlock state; no duplicate completion ledger is added.
- A completed puzzle remains selectable for replay. Only puzzles after the
  first incomplete puzzle are locked.
- Selecting an unfinished puzzle resumes its saved progress; selecting a
  completed puzzle starts a fresh replay session.
- Settings uses the existing header settings button and existing
  `AppSettings.defaultMode` persistence field.
- Removing theme and high-contrast persistence normalizes legacy stored
  settings by discarding only the removed values while preserving supported
  settings where possible.
- Existing Daily Loop and Continue semantics remain unchanged except that they
  are entered from the revised selection flow and use the global mode default
  where appropriate.

## 4. Workstream and dependency graph

All baseline dependencies from `orchestration/task-registry.json` are assumed
verified. The enhancement tasks below use the `E` prefix so they cannot be
confused with the original `P` tasks.

```text
E1-01 Settings contracts and persistence cleanup ─────┐
                                                      ├─ E1-04 App shell,
E1-02 Puzzle progression domain ── E1-03 Selection UI ─┘    settings, tutorial
                                                               ↓
                                                     E1-05 Browser regression
                                                               ↓
                                                     E1-06 Release verification
```

`E1-01` and `E1-02` may run in parallel because their production write scopes
are disjoint. `E1-03` depends on the progression API. `E1-04` depends on the
settings contract and the final selection-flow props. `E1-05` waits for both UI
streams. `E1-06` is the final integration gate.

## 5. Detailed implementation tasks

### E1-01 — Settings contracts and persistence cleanup

**Goal:** Remove Dark Mode and High Contrast from the settings contract and
storage path while preserving supported settings and reduced-motion behavior.

**Depends on:** Baseline shared contracts and persistence tasks.

**Write scope:**

- `packages/puzzle-format/src/types.ts`
- `schemas/app-settings.schema.json`
- `apps/web-game/src/persistence/defaults.ts`
- `apps/web-game/src/persistence/schema-validation.ts`
- `apps/web-game/src/persistence/types.ts`
- `apps/web-game/src/persistence/storage.ts`
- `apps/web-game/src/persistence/persistence.test.ts`

**Implementation requirements:**

- Remove the `Theme` type and the `theme` field from `AppSettings`.
- Remove `highContrast` from `AppSettings`.
- Update the app-settings JSON schema and runtime parser accordingly.
- Keep `defaultMode`, `reducedMotion`, line thickness, haptics, sound,
  tutorial state, and locale behavior intact.
- Keep the storage repository API coherent after the shape change.
- Normalize or safely discard legacy `theme` and `highContrast` values when an
  older local settings record is read; preserve supported fields instead of
  making all settings unusable.
- Update default settings to represent the standard light/default-contrast
  behavior without storing removed options.

**Acceptance criteria:**

- New settings records contain no theme or high-contrast fields.
- Runtime and JSON validation reject malformed supported settings and accept
  the new canonical shape.
- A legacy settings record does not cause a crash or permanently prevent the
  app from loading settings.
- Existing persistence tests continue to cover reset, read, write, and invalid
  record behavior.
- `defaultMode` remains persistable for the global gameplay-mode setting.

### E1-02 — Puzzle progression domain and selection APIs

**Goal:** Replace Quick Play selection with deterministic, persisted,
sequential puzzle selection while preserving Daily Loop and Continue.

**Depends on:** Baseline game-flow and persistence tasks.

**Write scope:**

- `apps/web-game/src/state/game-flow/types.ts`
- `apps/web-game/src/state/game-flow/puzzle-catalog.ts`
- `apps/web-game/src/state/game-flow/game-flow.ts`
- `apps/web-game/src/state/game-flow/index.ts`
- `apps/web-game/src/state/game-flow/game-flow.test.ts`

**Implementation requirements:**

- Define a stable one-based puzzle index within each difficulty.
- Derive ordering from catalog order and keep it deterministic as the catalog
  grows.
- Expose the number of puzzles per difficulty and the status of each puzzle,
  at minimum: `available`, `in-progress`, `completed`, or `locked`.
- Use existing per-puzzle persisted progress to determine completion and
  in-progress status.
- Add a selected-puzzle start/resume API that accepts difficulty, one-based
  puzzle number, and gameplay mode.
- Prevent starting a puzzle whose preceding puzzle is not completed.
- Preserve completed progress records when a session completes.
- Remove the user-facing Quick Play source and selection API once no active
  caller remains. Daily Loop and Continue sources remain supported.
- Preserve Continue's saved mode and saved edge state.

**Acceptance criteria:**

- Every difficulty maps to puzzle numbers `1..N` with no zero-based UI leak.
- Puzzle `1` is available with empty progress; puzzle `2` is locked until
  puzzle `1` has `completed: true`, and so on.
- Completed puzzle status survives a repository reload.
- An unfinished selected puzzle can be resumed without losing edge state,
  elapsed time, hints, checks, or mode.
- Attempting to start a locked puzzle is rejected without creating progress.
- Daily Loop selection remains deterministic and Continue remains functional.
- Unit tests cover empty progress, in-progress progress, completed progress,
  unlock transitions, replay of completed puzzles, and invalid puzzle numbers.

### E1-03 — Start screen and numbered puzzle-selection UI

**Goal:** Implement the revised user-facing selection flow and remove the old
selection-screen copy, Play mode picker, and Quick Play action.

**Depends on:** `E1-02`.

**Write scope:**

- `apps/web-game/src/screens/types.ts`
- `apps/web-game/src/screens/index.ts`
- `apps/web-game/src/screens/GameFlowScreen.tsx`
- `apps/web-game/src/screens/ModeSelectionScreen.tsx` or its replacement
- New screen components under `apps/web-game/src/screens/`
- `apps/web-game/src/screens/screens.css`

**Implementation requirements:**

- Add a start screen with a clear primary action that enters puzzle
  selection.
- Keep the start screen inside `GameFlowScreen`, which is the active flow
  mounted by `AppShell`.
- Add a difficulty selection state and a numbered puzzle list for the selected
  difficulty.
- Show the available puzzle count on each difficulty control.
- Render one-based puzzle numbers and status labels.
- Disable and visually distinguish locked puzzles; do not rely on color alone
  to communicate locking.
- Mark completed puzzles with the design system's success color plus a text or
  semantic indicator such as “Completed”.
- Keep Daily Loop and Continue available in the revised selection flow.
- Remove the Play mode fieldset and Quick Play button.
- Remove “Play at your pace.” and the offline-validation tagline.
- Reduce the visual dominance of the old hero typography and keep the new
  layout responsive at phone, tablet, and desktop widths.
- Keep back navigation predictable between start, selection, Daily Loop, and
  Continue screens.

**Acceptance criteria:**

- A fresh visit shows the start screen before any difficulty or puzzle list.
- The Start action reveals selection and does not start a puzzle directly.
- Selecting a difficulty displays its count and puzzle buttons numbered from 1.
- Locked puzzle buttons are disabled, labelled, and cannot start a session.
- Completing puzzle 1 and returning to selection makes puzzle 2 available.
- The old heading, tagline, Play mode controls, and Quick Play action are not
  present.
- Daily Loop and Continue still reach their existing screens.
- The screen remains usable without horizontal overflow at configured viewport
  sizes.

### E1-04 — Global gameplay settings, shell cleanup, and tutorial wiring

**Goal:** Make gameplay mode global, remove appearance modes, and connect the
existing How-to-Play tutorial to the active application shell.

**Depends on:** `E1-01` and `E1-03`.

**Write scope:**

- `apps/web-game/src/app/AppShell.tsx`
- New settings component(s) under `apps/web-game/src/app/`
- `apps/web-game/src/app/integration/GameIntegration.tsx`
- `apps/web-game/src/accessibility/types.ts`
- `apps/web-game/src/accessibility/preferences.ts`
- `apps/web-game/src/accessibility/AccessibilitySettings.tsx`
- `apps/web-game/src/accessibility/index.ts`
- `apps/web-game/src/accessibility/accessibility.test.ts`
- `apps/web-game/src/components/tutorial/Tutorial.tsx`
- `apps/web-game/src/components/tutorial/tutorial.css`
- `apps/web-game/src/components/tutorial/index.ts`
- `apps/web-game/src/components/tutorial/tutorial.test.ts`
- `apps/web-game/src/styles/tokens.css`
- `apps/web-game/src/styles/global.css`

**Implementation requirements:**

- Replace the current appearance `ModePicker` with a functional Settings
  surface for Relaxed/Assisted gameplay mode.
- Load and save `AppSettings.defaultMode` through the existing persistence
  repository.
- Pass the current default mode into the flow without changing a live session's
  mode.
- Remove `VisualMode`, `data-visual-mode`, Dark Mode controls, High Contrast
  controls, dark theme tokens, high-contrast tokens, and their associated CSS.
- Remove `highContrast` from accessibility preference state and controls while
  preserving reduced-motion handling and browser reduced-motion behavior.
- Change the How-to-Play navigation item from a dead `#how-to-play` hash link
  to an action that opens controlled tutorial state.
- Render `Tutorial` from the active shell and wire its open, close, skip, and
  completion callbacks.
- Preserve the tutorial steps, Back/Next behavior, practice content, dialog
  labels, and modal semantics.
- Ensure focus enters the dialog when opened, returns to the trigger when it
  closes, and keyboard users can close it without starting a puzzle.
- If the final tutorial action is labelled “Start puzzle”, make its behavior
  explicit and safe; it must not silently start a puzzle when the tutorial was
  opened from navigation.

**Acceptance criteria:**

- Settings exposes Relaxed and Assisted as the global gameplay-mode choice.
- Refreshing the app preserves the selected default mode.
- A newly started selected puzzle uses the saved default mode.
- Continue still uses the mode stored with its saved progress.
- No Dark Mode or High Contrast control, data attribute, token block, or
  runtime branch remains.
- Reduced-motion behavior and its existing test remain passing.
- Clicking How to play opens a visible tutorial dialog instead of changing to a
  non-existent hash target.
- Tutorial close, skip, Back, Next, and completion actions work with mouse and
  keyboard input.
- Focus and accessible dialog semantics are correct.

### E1-05 — Browser regression and responsive coverage

**Goal:** Update end-to-end coverage to assert the new product flow and remove
stale Quick Play assumptions.

**Depends on:** `E1-03` and `E1-04`.

**Write scope:**

- `tests/e2e/helpers.ts`
- `tests/e2e/gameplay.spec.ts`
- `tests/e2e/accessibility.spec.ts`
- `tests/e2e/responsive.spec.ts`
- New focused specs under `tests/e2e/` when useful

**Required scenarios:**

- Fresh user sees Start, then selection after activating Start.
- Each difficulty displays its available count and one-based puzzle numbers.
- Puzzle 1 can start; the next puzzle is locked before completion.
- Completing puzzle 1 unlocks puzzle 2 and displays puzzle 1 as completed with
  a success treatment and non-color status text.
- An unfinished selected puzzle survives reload and can be resumed.
- Quick Play is absent from the UI.
- Daily Loop still opens and starts.
- Continue still resumes the saved puzzle and saved mode.
- Settings changes the default gameplay mode and persists through reload.
- How to play opens and closes the tutorial; keyboard navigation reaches its
  controls.
- Dark Mode and High Contrast are absent; reduced-motion coverage still passes.
- The revised selection and start screens have no horizontal overflow in the
  configured phone, tablet, and desktop projects.

**Test maintenance:**

- Replace helper names and fixture assumptions that refer to Quick Play.
- Use the current catalog paths and selected-puzzle flow rather than invoking a
  removed Quick Play API.
- Keep tests deterministic by resetting local storage per scenario.

### E1-06 — Final integration and release gate

**Goal:** Verify that the complete enhancement wave is integrated and safe to
  hand back to the user.

**Depends on:** `E1-01` through `E1-05` verified.

**Orchestrator verification commands:**

```bash
npm run typecheck
npm test
npm run validate:schemas
npm run validate:catalog
npm run build
npm run test:e2e
```

**Release acceptance:**

- Every task report is present and independently verified.
- No task modified another task's write scope without an explicit remediation
  brief.
- The production build succeeds.
- Unit, schema, catalog, and browser tests pass.
- The start-to-selection-to-puzzle flow is usable at configured viewport sizes.
- Sequential unlocking is based on persisted completion, not only in-memory
  state.
- No user-facing Quick Play, Dark Mode, or High Contrast path remains.
- Daily Loop, Continue, tutorial, and reduced-motion behavior remain intact.
- The implementation plan's assumptions are recorded in the final
  implementation report if product decisions differ during execution.

## 6. Orchestrator handoff notes

When this plan is approved for execution, the Orchestrator should:

1. Create canonical task briefs for `E1-01` through `E1-05` using the scopes and
   acceptance criteria above.
2. Add the tasks to `orchestration/task-registry.json` with dependencies,
   report paths, and disjoint write scopes.
3. Dispatch `E1-01` and `E1-02` first, subject to the active worker limit.
4. Require implementation reports before dispatching each verifier.
5. Dispatch `E1-03` after `E1-02` passes, then `E1-04` after both its
   dependencies pass.
6. Dispatch `E1-05` only after the user-facing implementation tasks pass.
7. Run `E1-06` as the final integration gate and preserve command output under
   the enhancement run folder.

The Orchestrator must treat the requirements and acceptance criteria as the
source of truth, preserve unrelated user changes in the worktree, and create a
remediation task for any failed verification criterion rather than silently
expanding another task's write scope.

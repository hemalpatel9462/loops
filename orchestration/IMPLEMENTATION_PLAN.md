# Loops Complete Implementation Plan

## 1. Goal

Build and deploy the MVP1 browser game for Loops using React, TypeScript, Vite,
HTML, CSS, SVG, and local persistence. Keep puzzle generation and expensive
uniqueness validation in development-only tools. Ship only validated puzzle data
and runtime game logic in the browser bundle.

## 2. Orchestration model

Each task has one implementation agent and one verification agent.

```text
Implementation agent → implementation-report.yaml
Verification agent   → verification-report.yaml
```

The Orchestrator owns task assignment, dependency sequencing, status updates,
integration, remediation, and final release validation.

The implementation plan is intentionally split into small tasks with disjoint
write scopes so independent streams can run concurrently. The target width is up
to six concurrent implementation streams, subject to the current Codex session's
configured concurrency limit.

### Codex execution configuration

The repository contains project-scoped agent configuration for reproducible
orchestration:

| Role | Codex agent | Model | Reasoning | Access |
|---|---|---|---|---|
| Orchestrator | Primary session | `gpt-5.6-luna` | `xhigh` | Project-dependent |
| Implementation | `loops_implementation_worker` | `gpt-5.6-luna` | `high` | `workspace-write` |
| Verification | `loops_verification_worker` | `gpt-5.6-luna` | `high` | Project read-only; run artifacts writable |

The spawned-agent limit is six total threads shared by implementation and
verification workers. The Orchestrator is not counted in that limit. As soon as
a worker completes, its slot can be reused by the next ready task or verifier.
The primary session model is selected when the Orchestrator session starts;
project-local config registers the worker roles but does not override the
primary session's model/profile selection. Use the opt-in
`loops-orchestrator` profile, documented in
`orchestration/codex-profiles/loops-orchestrator.config.toml`, when starting the
primary session.

## 3. Architecture target

```text
apps/web-game
  ├── React UI
  ├── responsive CSS
  ├── SVG board renderer
  ├── local persistence
  └── browser interaction

packages/game-engine
  ├── grid and edge model
  ├── state transitions
  ├── clue validation
  ├── vertex and connectivity rules
  └── runtime hint deductions

packages/puzzle-format
  ├── TypeScript types
  ├── JSON codecs
  └── schema integration

packages/puzzle-data
  ├── validated puzzle JSON
  └── puzzle catalog

tools/
  ├── puzzle-generator
  ├── puzzle-validator
  ├── puzzle-analyzer
  ├── catalog-builder
  └── schema-checker
```

## 4. Parallel waves

### Wave 0 — foundation

Sequential because every later stream depends on the workspace and contracts.

- `P0-01` — bootstrap monorepo, Vite app, workspaces, test commands, and Git discipline.
- `P0-02` — implement shared puzzle types, edge identifiers, schema loading, and package contracts.

### Wave 1 — independent foundations

Run as many of these as the active concurrency limit safely allows:

- `P1-01` — game-engine state model and edge transitions.
- `P1-02` — core rule validation and completion detection.
- `P1-03` — runtime hint deduction API.
- `P1-04` — unit-test fixtures and test harness.
- `P1-05` — web app shell and design-token foundation.
- `P1-06` — candidate loop generation.
- `P1-07` — exhaustive uniqueness solver.

`P1-03` depends on `P1-02`; the registry captures that dependency even though
the task belongs to the same wave conceptually.

### Wave 2 — feature construction

- `P2-01` — complete puzzle-generation pipeline.
- `P2-02` — difficulty analyzer and quality evaluator.
- `P2-03` — catalog builder and puzzle-data package.
- `P2-04` — SVG board and edge interaction UI.
- `P2-05` — local persistence and Continue state.
- `P2-06` — Quick Play, Daily Loop, and app flow.
- `P2-07` — tutorial and accessibility behaviors.

These remain parallel where dependencies allow; UI tasks must consume the shared
engine contract rather than reimplement game rules.

### Wave 3 — integration and release preparation

- `P3-01` — connect web UI to the game engine and real puzzle data.
- `P3-02` — browser and responsive end-to-end tests.
- `P3-03` — generate and validate initial puzzle pack.
- `P3-04` — Vercel packaging and production build configuration.

### Wave 4 — final release gate

- `P4-01` — full integration verification, accessibility smoke test, clean build,
  and release-readiness report.

## 5. Detailed task acceptance criteria

### P0-01 — Project bootstrap

- React + TypeScript + Vite app exists under `apps/web-game`.
- npm workspace configuration exists for `apps/*`, `packages/*`, and `tools/*`.
- Shared packages can be imported by the web app.
- TypeScript, lint, unit-test, and build commands are defined.
- Production build emits `apps/web-game/dist`.
- No puzzle or generator logic is placed in the UI package.

### P0-02 — Shared contracts

- TypeScript types match the JSON schemas.
- Edge IDs follow `h:row:column` and `v:row:column`.
- Puzzle dimensions and edge collections are represented consistently.
- JSON parsing rejects malformed puzzle definitions.
- The package has tests for valid and invalid examples.

### P1-01 — Engine state model

- `unknown`, `line`, and `x` player states are represented.
- Fixed starting edges cannot be changed by player actions.
- Edge cycling follows `Unknown → Line → X → Unknown`.
- State transitions are deterministic and side-effect free.
- Undo/redo can consume the state transition history later.

### P1-02 — Rules and completion

- Clue counts are validated.
- Vertex degree `0` or `2` is enforced.
- Loose endpoints and branches are detected.
- Multiple loops and disconnected fragments are rejected.
- A valid completion requires one closed connected loop and satisfied clues.

### P1-03 — Runtime hints

- Hints expose highlight, explanation, and reveal levels.
- Hints identify direct-clue, vertex, connectivity, or contradiction deductions.
- The engine never calls a move forced without supporting evidence.
- Hints do not mutate state until the UI applies a revealed move.

### P1-04 — Test harness

- Unit-test command runs in a clean checkout.
- Fixtures cover valid loops, branches, open paths, multiple loops, and clue errors.
- Schema validation is included in test execution.
- Test output is reproducible and stored in run artifacts by verifiers.

### P1-05 — Web shell

- The app starts with Vite.
- A responsive application shell exists.
- CSS variables define colors, spacing, typography, and edge styles.
- The shell supports light, dark, and high-contrast modes structurally.
- No production rules are duplicated in UI components.

### P1-06 — Candidate loop generation

- Generator creates candidate lattice loops.
- Candidates have no crossings, branches, or disconnected segments.
- Full-cell four-edge enclosures are rejected.
- Generation is deterministic for a given seed and configuration.
- Candidate output is separate from validated puzzle output.

### P1-07 — Uniqueness solver

- Solver returns zero, one, or multiple solutions.
- It understands clues, vertex rules, fixed edges, excluded edges, and connectivity.
- It stops after finding two solutions when checking uniqueness.
- It emits a solver report using the approved schema.

### P2-01 — Generation pipeline

- Hidden loop is generated first.
- Clues are derived from the hidden loop.
- Starting edges use difficulty ratios and deduction value.
- The solver validates the puzzle before output.
- Only accepted puzzles are emitted as `PuzzleDefinition` JSON.

### P2-02 — Difficulty and quality

- Coverage, regional usage, loop length, turns, density, and repetition are measured.
- Difficulty profiles use the approved fixed-edge ratios.
- Tiny, trivial, overly dense, or concentrated loops are rejected.
- Solver deduction metrics are included in analysis output.

### P2-03 — Catalog builder

- Validated puzzle JSON is copied or emitted to `packages/puzzle-data`.
- Catalog entries point to real puzzle files.
- Duplicate IDs are rejected.
- Catalog validates against its schema.

### P2-04 — SVG board and interactions

- Board renders dots, cells, clues, lines, X marks, and fixed lines.
- Edges have touch-friendly hit targets.
- Pointer and keyboard interaction are supported where practical.
- Board scales across phone, tablet, and desktop widths.
- UI dispatches actions to the engine rather than changing rules locally.

### P2-05 — Local persistence

- Progress is saved under versioned local-storage keys.
- Continue restores the correct puzzle and state.
- Settings, statistics, and daily state use the approved schemas.
- Corrupt or outdated records fail safely and can be reset.

### P2-06 — Game modes and flow

- Quick Play selects a local validated puzzle.
- Daily Loop selects deterministically by date.
- Continue resumes an unfinished puzzle.
- Relaxed and Assisted modes behave according to the specification.
- Completion statistics include time and hint count.

### P2-07 — Tutorial and accessibility

- Tutorial teaches clues, continuation, vertices, one-loop behavior, and a small puzzle.
- Reduced-motion and high-contrast settings work.
- Fixed and player-created lines are distinguishable without color alone.
- Controls have accessible labels and usable focus states.

### P3-01 — UI/engine integration

- The UI loads real `PuzzleDefinition` data.
- All edge actions pass through the game engine.
- Hints use engine output.
- Completion uses engine validation.
- No mock puzzle or mock rule path remains in production code.

### P3-02 — Browser tests

- Tests cover loading, tapping edges, cycling states, undo/redo, reset, hints,
  progress checks, completion, Continue, and Daily Loop.
- Tests run at representative phone, tablet, and desktop viewports.
- Keyboard and reduced-motion smoke tests exist.

### P3-03 — Initial puzzle pack

- At least one validated puzzle exists for every difficulty.
- Initial pack includes representative `4×4`, `5×5`, and `7×7` boards.
- Every puzzle is unique, playable, and schema-valid.
- Catalog and Daily Loop mapping build successfully.

### P3-04 — Vercel packaging

- Root workspace install succeeds with `npm ci`.
- `npm run build` succeeds from repository root.
- Output is `apps/web-game/dist`.
- Generator and test-only files are not bundled into the web app.
- Preview deployment settings are documented.

### P4-01 — Release verification

- All task verification reports are `PASS`.
- Clean install, type check, unit tests, browser tests, and production build pass.
- No critical accessibility or gameplay issue remains.
- A release summary is written under the run folder.

## 6. Orchestrator operating checklist

For each task:

1. Check dependencies in `task-registry.json`.
2. Create `runs/<run-id>/tasks/<task-id>/`.
3. Render the task brief from the registry and template.
4. Spawn the implementation agent with disjoint write ownership.
5. Wait for its report and inspect changed files.
6. Spawn the verification agent with acceptance criteria.
7. Wait for the verification report.
8. Mark `verified`, create remediation, or mark `blocked`.
9. Preserve all reports and command output.
10. Dispatch newly unblocked tasks.

Verifiers may run while unrelated implementation tasks are still active. They
must only inspect completed tasks and must not modify files owned by active
implementation agents.

# Loops — Game Design & Product Specification

## 1. Game Overview

**Working title:** Loops

**Genre:** Logic puzzle / casual puzzle

**Target audience:** Broad audience, including children, casual players, families, and experienced puzzle players.

**Core concept:** The player completes exactly one continuous closed loop across a grid. Every cell contains a numeric clue that indicates how many of its four edges must be part of the final loop.

Loops is inspired by the core reasoning mechanic of Slitherlink, but is intentionally designed to be more approachable. The game reduces ambiguity by numbering every cell and provides guaranteed-correct starting line segments as built-in guidance.

### Product principles

- Easy to understand within minutes
- Accessible to all ages
- No blank clue cells in the main game
- Every puzzle has exactly one closed loop
- Every puzzle begins with some correct solution segments already drawn
- Difficulty is controlled through board size, loop complexity, and starting assistance
- Puzzles should be logically solvable and avoid blind guessing
- Generated puzzles should make good use of the full board

---

## 2. Core Objective

The player must complete a single continuous closed loop by drawing line segments along the edges of the grid.

The completed loop must satisfy all numbered cells.

For each numbered cell:

- `0` means none of its four edges belong to the loop.
- `1` means exactly one edge belongs to the loop.
- `2` means exactly two edges belong to the loop.
- `3` means exactly three edges belong to the loop.

The final solution must contain exactly one loop.

---

## 3. Core Rules

### 3.1 Numeric clue rule

Every cell contains a number from `0` to `3`.

The number represents the exact number of the cell's four borders that must be part of the completed loop.

Example:

```text
●━━━●
┃ 2
●
```

This cell has two loop edges: top and left.

### 3.2 Single-loop rule

All selected solution edges must belong to one continuous closed loop.

The following are invalid:

- Two or more separate loops
- Branches
- Open-ended paths
- Disconnected solution segments
- Premature small loops while unresolved solution segments remain elsewhere

### 3.3 Vertex rule

At each grid dot, the completed loop must have either:

- `0` connected line segments, or
- `2` connected line segments

A dot may not have exactly 1, 3, or 4 connected solution lines.

This prevents dead ends and branching.

### 3.4 No `4` clues in the core game

Although a square has four borders, a cell surrounded by all four loop edges would form its own closed square.

On a normal multi-cell board, this would create an isolated loop and violate the one-loop rule.

Therefore the core game should generate only clues from `0` to `3`.

---

## 4. Board Structure

A puzzle board consists of:

- Grid dots / vertices
- Square cells
- A clue value in every cell
- Grid edges between adjacent dots
- A hidden solution loop
- Some pre-drawn solution edges

Possible edge states during play:

1. **Unknown**
2. **Line** — player believes the edge belongs to the loop
3. **X / excluded** — player believes the edge cannot belong to the loop

Some edges may also be marked as **fixed starting edges**.

Fixed starting edges:

- Are guaranteed to belong to the solution
- Cannot be removed by the player
- Should be visually distinguishable from user-created lines

---

## 5. Player Interaction Model

### 5.1 Basic interaction

Recommended tap behavior:

```text
Unknown → Line → X → Unknown
```

Alternative input options may be considered later for accessibility.

### 5.2 Core controls

The game should support:

- Tap edge to cycle its state
- Undo
- Redo
- Reset puzzle
- Check progress
- Request hint
- Pause
- Restart

### 5.3 Fixed lines

Pre-drawn fixed lines should:

- Use a visually distinct style
- Never be editable
- Clearly communicate that they are part of the known solution

### 5.4 Mistake handling

The MVP supports two gameplay modes:

**Relaxed mode**
- Do not immediately flag incorrect player moves
- Allow the player to reason freely
- Check only on request or completion

**Assisted mode**
- Flag impossible moves immediately
- Better suited for younger players and beginners

Temporary incorrect loops are allowed in both modes. A loop is evaluated when the
player checks progress or when completion conditions are reached.

---

## 6. Difficulty System

Difficulty is controlled using three coordinated variables.

### 6.1 Board size

Larger boards increase:

- Visual load
- Total reasoning steps
- Loop length
- Time to completion

Example progression:

| Difficulty | Suggested board sizes |
|---|---|
| Beginner | 4×4 |
| Easy | 5×5 |
| Medium | 6×6 to 7×7 |
| Hard | 8×8 to 9×9 |
| Expert | 10×10+ |

These ranges are starting targets and should be validated through playtesting.

### 6.2 Loop complexity

Loop complexity includes:

- Number of turns
- Average straight-run length
- Number of inward bends
- Number of narrow passages
- Number of near-connections
- Path density
- Spatial distribution
- Number of deductions involving distant regions of the board

Simple puzzles should contain:

- Fewer turns
- Longer obvious runs
- Fewer ambiguous junctions
- More local deductions

Complex puzzles may contain:

- More turns
- Tighter paths
- More competing possibilities
- Greater dependency between clues
- More connectivity-based reasoning

### 6.3 Starting assistance

The number and quality of pre-drawn solution lines should vary with difficulty.

Example:

| Difficulty | Starting assistance | Fixed solution edges |
|---|---|---:|
| Beginner | High | 40%–50% |
| Easy | Medium-high | 25%–30% |
| Medium | Medium | 15%–20% |
| Hard | Low | 10%–15% |
| Expert | Very low | 5%–10% |

Percentages are measured against the total number of edges in the hidden solution
loop. The exact count is rounded and then adjusted so that the selected lines are
useful rather than merely numerous.

Starting lines should not be chosen randomly.

The generator should favor lines that:

- Create useful initial deductions
- Interact with nearby clues
- Give the player a clear starting point
- Avoid completely solving a region

---

## 7. Puzzle Generation System

The generator should create the solution first and derive the visible puzzle from it.

### 7.1 Generation pipeline

```text
Generate hidden loop
        ↓
Validate loop geometry
        ↓
Validate board utilization
        ↓
Derive clue value for every cell
        ↓
Select starting solution edges
        ↓
Run solver
        ↓
Check uniqueness
        ↓
Measure difficulty
        ↓
Apply quality rules
        ↓
Accept or reject puzzle
```

---

## 8. Hidden Loop Generation

The hidden loop must satisfy all structural rules before clues are generated.

### Required properties

- Exactly one closed loop
- No branches
- No crossings
- No disconnected sections
- No isolated sub-loops
- No cell enclosed on all four sides
- Adequate use of the selected board size

---

## 9. Loop Quality Rules

A mathematically valid loop is not automatically a good puzzle.

For example, on a 10×10 board, a tiny 2×2 loop in one corner must be rejected.

The generator should score or enforce the following.

### 9.1 Bounding-box coverage

Measure the width and height of the smallest rectangle containing the loop.

Example metrics:

```text
loop width / board width
loop height / board height
```

A medium puzzle should target approximately 70% coverage in both dimensions.
Hard puzzles should target approximately 75%–80%, and Expert puzzles 80% or more.
Beginner and Easy puzzles may use lower coverage when needed to preserve clarity.

### 9.2 Row and column utilization

Require the loop to occupy a minimum number of rows and columns.

Example:

```text
10×10 board
minimum rows used: 8
minimum columns used: 8
```

### 9.3 Regional coverage

The board can be divided into logical zones.

Example:

```text
┌────┬────┬────┐
│ A  │ B  │ C  │
├────┼────┼────┤
│ D  │ E  │ F  │
├────┼────┼────┤
│ G  │ H  │ I  │
└────┴────┴────┘
```

A generated loop can be required to enter a target number of zones.

Possible targets:

- Beginner: 4 or more zones
- Easy: 5 or more zones
- Medium: 6 or more zones
- Hard: 7 or more zones
- Expert: 8 or more zones

### 9.4 Loop length

Reject loops that are too short for the board.

Also consider rejecting extremely dense loops if they create poor readability.

### 9.5 Shape complexity

Measure:

- Number of turns
- Longest straight section
- Average straight-run length
- Number of inward excursions
- Local density
- Symmetry
- Repeated simple shapes

### 9.6 Trivial-shape rejection

Reject or heavily penalize:

- Small rectangles
- Full-board rectangular borders
- Highly repetitive snakes
- Loops concentrated in one quadrant
- Excessively symmetrical shapes if they make the puzzle predictable

---

## 10. Clue Generation

After a valid hidden loop exists, every cell receives a clue based on how many of its four edges belong to the loop.

Possible values:

```text
0, 1, 2, 3
```

Every cell should retain its clue in the core game.

This is a deliberate design difference from traditional Slitherlink, where some cells may have no clue.

### Why all cells are numbered

Benefits:

- Removes ambiguity for beginners
- Makes every cell meaningful
- Improves learnability
- Makes the board feel complete
- Supports younger users
- Reduces the feeling that information is missing

Difficulty will be controlled through other mechanisms rather than by removing clue numbers.

---

## 11. Starting-Line Generation

The game begins with some correct solution edges already drawn.

These lines act as built-in guidance.

### 11.1 Purpose

Starting edges should:

- Reduce initial intimidation
- Provide an obvious place to begin
- Teach loop continuation naturally
- Create immediate deductions
- Make early puzzles feel rewarding

### 11.2 Selection strategy

Candidate starting lines can be scored based on deduction value.

A high-value starting edge might:

- Force a `1` cell's other sides to be excluded
- Help complete a `2`
- Strongly interact with a `3`
- Create a useful vertex deduction
- Connect to another pre-drawn segment

### 11.3 Difficulty impact

More starting lines generally lower difficulty, but line placement matters more than raw quantity.

Two high-value starting lines may help more than five isolated lines.

---

## 12. Solver

A solver is required for puzzle generation and validation.

The solver should determine whether a puzzle has:

- No valid solution
- Exactly one valid solution
- Multiple valid solutions

Only puzzles with exactly one solution should be accepted.

The solver should understand:

- Numeric clue constraints
- Vertex degree constraints
- Single-loop connectivity
- Premature-loop prevention
- Fixed starting edges
- Excluded edges

The solver should have two layers:

1. A constraint-propagation layer for clue, vertex, fixed-edge, and local
   contradiction deductions.
2. A complete search layer for uniqueness validation and puzzles that cannot be
   resolved by direct propagation alone.

The search solver should stop after finding two valid solutions, since that is
enough to reject a non-unique puzzle. A final solution is valid only when all
selected edges form one connected closed loop.

Deductions should be classified as direct clue, vertex, connectivity,
contradiction-based, or search-only. The hint system should prefer the first
three categories.

---

## 13. Difficulty Analyzer

Difficulty should not be assigned solely from board size.

The analyzer should measure how the puzzle is actually solved.

Potential metrics:

- Number of forced moves
- Number of immediately solvable clues
- Number of deduction chains
- Maximum deduction depth
- Number of connectivity deductions
- Number of ambiguous candidate edges
- Number of pre-drawn edges
- Board size
- Loop length
- Loop complexity
- Number of hints needed by an automated solver
- Number of contradiction-based deductions

### Example difficulty signature

```text
Puzzle ID: L-1842
Grid: 7×7
Loop length: 62 edges
Starting lines: 8
Direct deductions: 21
Pattern deductions: 10
Connectivity deductions: 3
Maximum deduction depth: 4
Difficulty: Medium
```

---

## 14. Suggested Difficulty Profiles

### Beginner

- 4×4 grid
- Simple loop
- High number of pre-drawn lines
- Mostly direct deductions
- Minimal connectivity reasoning
- Strong visual guidance
- 40%–50% fixed solution edges

### Easy

- 5×5 grid
- Simple to moderate loop
- Medium-high starting assistance
- Short deduction chains
- Limited ambiguity
- 25%–30% fixed solution edges

### Medium

- 6×6 or 7×7 grid
- Moderate loop complexity
- Medium starting assistance
- Combination of clue and vertex deductions
- Some global loop reasoning
- 15%–20% fixed solution edges

### Hard

- 8×8 or 9×9 grid
- Complex loop
- Few starting lines
- Longer deduction chains
- Greater connectivity reasoning
- 10%–15% fixed solution edges

### Expert

- 10×10 or larger
- High loop complexity
- Very little starting assistance
- Minimal direct guidance
- Deep logical chains
- Strong emphasis on global connectivity
- 5%–10% fixed solution edges

---

## 15. Hint System

The game should distinguish between three separate concepts.

### 15.1 Starting hints

Pre-drawn solution lines placed automatically when the puzzle begins.

These are part of puzzle generation.

### 15.2 Player-requested hint

A hint requested during play.

Hints are progressive:

1. Highlight a cell or edge with a forced move.
2. Explain the rule that makes the move forced.
3. Reveal the correct line or X state.

The hint system must only describe a move as forced when the solver can provide
the supporting deduction.

For younger audiences, explanatory hints may be more valuable than simply revealing an answer.

### 15.3 Check progress

Checks the player's current state without necessarily giving a solution.

Possible feedback:

- Everything is correct so far
- There is at least one incorrect line
- There is at least one incorrect X
- A specific area contains a contradiction

---

## 16. Tutorial and Onboarding

Accessibility should be treated as a core product requirement.

### Suggested tutorial flow

#### Tutorial 1 — Understanding clues

Introduce one clue type at a time:

- `0`
- `1`
- `2`
- `3`

#### Tutorial 2 — Continuing the loop

Show how existing lines constrain nearby edges.

#### Tutorial 3 — Vertex rule

Teach:

```text
A loop cannot stop.
A loop cannot branch.
```

#### Tutorial 4 — One-loop rule

Show why two separate closed loops are invalid.

#### Tutorial 5 — Complete small puzzle

Use a highly assisted 4×4 board.

The tutorial should be interactive rather than text-heavy.

---

## 17. Game Modes

### Initial launch candidates

#### Quick Play

Player selects:

- Difficulty
- Possibly board size

A generated or locally stored puzzle begins immediately.

#### Daily Loop

One shared puzzle per day.

The daily puzzle is selected deterministically from the local date and a stable
generator seed, so it works offline and does not require an account or server.

Potential features:

- Daily streak
- Completion time
- Hint count
- Shareable result

#### Continue

Resume an unfinished puzzle.

### Future modes

- Timed challenge
- Puzzle packs
- Weekly challenge
- Endless progression
- Kids mode
- No-hint challenge
- Large-board challenge

---

## 18. Progression and Rewards

MVP1 progression is local-only and requires no centralized database or account.

The MVP should support:

- Daily streak
- Puzzles completed
- Difficulty milestones
- Personal best times
- Optional daily streak tracking

Puzzle history, unfinished puzzles, completion statistics, and progression data
are stored on the device. Achievement badges, unlockable themes, competitive
leaderboards, cloud sync, and monetization are deferred until after the core
experience is validated.

Progression should not interfere with the purity of the core puzzle.

---

## 19. Visual and UX Direction

The board should remain visually minimal and readable.

### Visual priorities

- Clear grid
- Large touch targets
- Strong distinction between dots, clues, lines, and exclusions
- Fixed lines visually different from player lines
- High contrast
- Dark mode
- Tablet support
- Responsive board sizing

### Completion feedback

When solved:

- Animate the completed loop
- Highlight the full path
- Provide subtle haptic feedback where available
- Show completion statistics
- Avoid excessive effects that obscure the board

---

## 20. Completion and Validation Behavior

A puzzle is complete only when:

1. Every numbered cell is satisfied.
2. Every selected line belongs to a single closed loop.
3. No branches exist.
4. No loose endpoints exist.
5. No additional disconnected loop exists.

### Invalid completion examples

- All clue numbers satisfied but two separate loops exist
- One closed loop plus disconnected line fragments
- A branch at a vertex
- A path that is not closed

---

## 21. Puzzle Data Model

The canonical JSON Schemas for puzzle, generator, solver, player-progress,
settings, statistics, Daily Loop, hint, catalog, and playtest data are stored in
the [`schemas/`](/Users/hemalpatel/Development/loops/schemas/) directory.
They use JSON Schema Draft 2020-12 and are versioned independently from the
generator implementation.

A puzzle record may include:

```json
{
  "id": "loop-2026-0001842",
  "seed": "example-seed",
  "width": 7,
  "height": 7,
  "difficulty": "medium",
  "clues": [],
  "solutionEdges": [],
  "startingEdges": [],
  "loopLength": 62,
  "complexityScore": 0.64,
  "difficultyScore": 0.52,
  "generatorVersion": "1.0"
}
```

Additional metadata may include:

- Creation timestamp
- Solver statistics
- Deduction signature
- Regional coverage
- Number of turns
- Quality score
- Estimated solve time

---

## 22. Technical Architecture

The detailed repository organization and Vercel deployment plan are documented
in [`PROJECT_STRUCTURE_AND_DEPLOYMENT.md`](/Users/hemalpatel/Development/loops/PROJECT_STRUCTURE_AND_DEPLOYMENT.md).

Recommended separation of responsibilities:

```text
Loop Generator
      ↓
Clue Generator
      ↓
Starting-Hint Selector
      ↓
Solver / Validator
      ↓
Difficulty Analyzer
      ↓
Quality Evaluator
      ↓
Puzzle Repository
```

### Loop Generator

Creates candidate hidden loops.

### Clue Generator

Calculates the clue for every cell.

### Starting-Hint Selector

Chooses useful fixed solution segments.

### Solver / Validator

Ensures the puzzle is valid and uniquely solvable.

### Difficulty Analyzer

Scores reasoning complexity.

### Quality Evaluator

Rejects puzzles that are technically valid but boring, trivial, or visually poor.

---

## 23. Deterministic Generation

The generator should support seeded generation.

Benefits:

- Reproduce a puzzle exactly
- Debug generator problems
- Share puzzle IDs
- Generate daily puzzles consistently
- Support server and client consistency
- Allow offline puzzle generation

---

## 24. Puzzle Repository and Offline Play

MVP1 architecture:

- Pre-generate high-quality puzzles
- Store validated puzzles locally
- Allow offline play
- Use deterministic procedural generation as a supplement to stored puzzles
- Persist unfinished puzzles and local progression on the device

A later version may download new puzzle packs, but this is not required for MVP1.

---

## 25. Analytics and Balancing

Useful metrics:

- Puzzle completion rate
- Average solve time
- Median solve time
- Abandonment rate
- Number of undo operations
- Number of resets
- Hints requested
- Check-progress usage
- Mistake count
- Difficulty selected
- Difficulty completed
- Starting-edge count
- Player retention by difficulty
- Completion rate by board size

These metrics can help tune generator thresholds and difficulty classifications.

For MVP1, these metrics remain local and are intended for manual playtesting;
no analytics backend is required.

---

## 26. Accessibility

Because Loops is intended for a broad age range, accessibility should be built into the design.

Consider:

- Large touch targets
- Color-independent edge states
- High-contrast mode
- Adjustable line thickness
- Scalable text
- Screen-reader-friendly controls where feasible
- Reduced-motion option
- Haptic feedback controls
- Alternative indication for fixed vs user-created lines

---

## 27. Future Variants

Future gameplay variants should remain separate from the core launch rules.

Potential ideas:

- Multi-Loop mode
- Obstacles
- Special cells
- Locked edges
- Bonus objectives
- Symmetry challenges
- Timed puzzles
- Themed board shapes
- Irregular grids
- Hexagonal grids
- Color-based loops
- Multiple loop colors
- Cooperative challenge modes

These should be evaluated only after the core experience is proven.

---

## 28. Core Design Decisions — Current

The following decisions are currently considered foundational:

1. Every cell contains a numeric clue.
2. Core clue values are `0`, `1`, `2`, and `3`.
3. Every puzzle has exactly one closed loop.
4. No blank clue cells are used in the main game.
5. Correct solution segments are pre-drawn at puzzle start.
6. Pre-drawn lines are used as guidance rather than optional hints.
7. Difficulty is controlled by:
   - board size,
   - loop complexity,
   - starting assistance.
8. The generator creates the hidden loop first and derives clues afterward.
9. Generated loops must use a meaningful portion of the board.
10. Tiny or trivial valid loops must be rejected.
11. The solver must confirm a unique solution.
12. The game should target broad accessibility rather than traditional Slitherlink difficulty.
13. Relaxed and Assisted gameplay modes are supported.
14. X marks are optional for players but supported as a complete edge state.
15. Fixed-line targets are 40%–50% for Beginner, 25%–30% for Easy, 15%–20% for Medium, 10%–15% for Hard, and 5%–10% for Expert.
16. Hints progress from highlighting a forced move, to explaining it, to revealing it.
17. MVP1 progression, puzzle history, and unfinished games are stored locally.
18. Quick Play, Daily Loop, and Continue are the initial game modes.
19. Daily puzzles use deterministic date-based generation and work offline.
20. The solver uses constraint propagation plus complete search for uniqueness validation.

---

## 29. Resolved Decisions and Remaining Tuning

The major product decisions for MVP1 are resolved. The remaining work is
implementation tuning and playtesting.

### Implementation tuning

- Exact generator rejection thresholds
- Exact loop-complexity ranges per difficulty
- Hint wording and presentation
- Number of free hints, if any
- Daily streak edge cases
- Playtesting-based difficulty calibration

### Deferred product decisions

- Final game name
- Relationship to the wider puzzle-game platform
- Achievement badges and unlockable themes
- Competitive leaderboards
- Cloud sync and accounts
- Monetization

---

## 30. Next Design Steps

Recommended next steps:

1. Prototype loop-generation constraints.
2. Build the constraint-propagation and complete-search solver.
3. Generate sample 4×4, 5×5, and 7×7 puzzles.
4. Test starting-line strategies using the approved assistance ranges.
5. Compare puzzle completion with and without starting guidance.
6. Tune board-utilization and complexity thresholds.
7. Implement progressive hints with solver-backed explanations.
8. Design the interactive tutorial flow.
9. Create the first playable prototype.
10. Calibrate difficulty through local playtesting.

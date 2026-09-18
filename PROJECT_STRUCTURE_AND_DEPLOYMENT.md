# Loops Project Structure and Deployment

This document defines how the Loops project is organized during development and
how the browser game is packaged and deployed to Vercel.

The implementation orchestration plan, task registry, agent prompts, acceptance
criteria, and preserved implementation/verification reports are maintained in
[`orchestration/`](/Users/hemalpatel/Development/loops/orchestration/).

## 1. Architectural goals

The project has four important boundaries:

1. The web game is the player-facing application.
2. The puzzle engine contains reusable game rules and runtime logic.
3. Puzzle-generation tools are development-only utilities.
4. Validated puzzle data is the contract between the tools and the game.

The browser application should never generate candidate loops, run expensive
uniqueness searches, or depend on a server for normal gameplay.

The puzzle engine should remain platform-independent so it can later be reused
by iOS and Android clients.

## 2. Repository layout

```text
loops/
├── .codex/
│   ├── config.toml
│   └── agents/
│       ├── loops-implementation-worker.toml
│       └── loops-verification-worker.toml
│
├── apps/
│   └── web-game/
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── screens/
│       │   ├── state/
│       │   ├── persistence/
│       │   └── styles/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   ├── game-engine/
│   │   ├── model/
│   │   ├── validation/
│   │   ├── hints/
│   │   └── package.json
│   ├── puzzle-format/
│   │   ├── types/
│   │   ├── codecs/
│   │   └── package.json
│   └── puzzle-data/
│       ├── puzzles/
│       │   ├── beginner/
│       │   ├── easy/
│       │   ├── medium/
│       │   ├── hard/
│       │   └── expert/
│       ├── catalog.json
│       └── package.json
│
├── tools/
│   ├── puzzle-generator/
│   ├── puzzle-validator/
│   ├── puzzle-analyzer/
│   ├── catalog-builder/
│   └── schema-checker/
│
├── schemas/
├── loops_game_design_spec.md
├── PROJECT_STRUCTURE_AND_DEPLOYMENT.md
├── package.json
└── package-lock.json
```

The `.codex/` directory contains project-scoped development orchestration
configuration. It pins the implementation and verification worker roles and
their reasoning/access policies; it is not copied into the browser bundle or
deployed to Vercel.

## 3. Responsibilities by area

### `apps/web-game`

Contains the React and browser-specific application:

- Board rendering
- Menus and screens
- Touch and pointer interaction
- Undo and redo state
- Relaxed and Assisted modes
- Hint presentation
- Completion feedback
- Local storage
- Responsive layout and accessibility controls

This is the only application deployed to Vercel.

### `packages/game-engine`

Contains reusable, platform-independent game logic:

- Grid and edge model
- Edge identifiers
- Clue evaluation
- Vertex-degree validation
- Loop connectivity validation
- Completion detection
- Runtime constraint deductions for hints

This package must not depend on React, browser APIs, `localStorage`, or Vercel.

### `packages/puzzle-format`

Contains the shared data contract:

- TypeScript types
- JSON encoders and decoders
- Schema references
- Edge-ID helpers
- Compatibility checks for schema versions

Both the web game and the generator tools use this package.

### `packages/puzzle-data`

Contains only validated puzzle output and catalog information. It is consumed by
the web game as static data.

The package must not contain unvalidated candidate puzzles.

### `tools`

Contains development and content-production utilities:

- Candidate loop generation
- Complete uniqueness validation
- Difficulty analysis
- Quality scoring and rejection
- Catalog/index generation
- Schema validation
- Puzzle preview and export helpers

These tools are not included in the browser bundle.

## 4. Puzzle production pipeline

```text
Generator configuration
        ↓
Candidate loop generation
        ↓
Loop geometry validation
        ↓
Clue generation
        ↓
Starting-edge selection
        ↓
Complete uniqueness solver
        ↓
Difficulty analysis
        ↓
Quality evaluation
        ↓
Validated PuzzleDefinition JSON
        ↓
Catalog builder
        ↓
packages/puzzle-data
```

The generator and validator should use the same shared edge model and rule
definitions as the web game. This prevents the content pipeline and player
experience from disagreeing about valid loops.

The exhaustive solver may remain generator-only. The web game only needs the
runtime validation and deduction functionality required for checking moves and
providing hints.

## 5. Daily Loop strategy

MVP1 remains offline-first and does not include a backend.

Daily puzzles should therefore be generated or selected before deployment and
included in `packages/puzzle-data`. The app uses the local date to select the
corresponding puzzle deterministically.

The date-to-puzzle relationship may be represented in `catalog.json` or in a
dedicated daily mapping. If a date is not present, the app should fall back to a
deterministic seed-based selection from the local catalog.

The browser should not generate arbitrary new loops at runtime. This keeps the
generator separate and avoids putting expensive generation and uniqueness search
inside the player application.

## 6. Local runtime storage

The web game stores player-specific data locally:

- Current puzzle progress
- Continue state
- Completion history
- Best times
- Difficulty milestones
- Daily streak state
- Settings and accessibility preferences

Use `localStorage` for MVP1. The schemas in `schemas/` define the shape of the
stored records. IndexedDB can be introduced later if the history or catalog size
requires it.

No account, centralized database, server-side analytics, or cloud synchronization
is required for the first release.

## 7. Workspace configuration

Use npm workspaces initially:

```json
{
  "name": "loops",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tools/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace @loops/web-game",
    "build": "npm run build --workspace @loops/web-game",
    "test": "npm run test --workspaces --if-present",
    "validate:puzzles": "npm run validate --workspace @loops/puzzle-validator"
  }
}
```

Each workspace package must have a unique `name` and must explicitly declare
its workspace dependencies.

## 8. Vercel packaging

Vercel should be connected to the repository root, not directly to the
generator or an individual source folder.

Recommended project settings:

```text
Root Directory:    /
Framework Preset:  Vite
Build Command:     npm run build
Output Directory:   apps/web-game/dist
Install Command:   npm ci
```

An equivalent root-level `vercel.json` may be used:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web-game/dist",
  "installCommand": "npm ci",
  "framework": "vite"
}
```

The app-local Vite configuration at `apps/web-game/vite.config.ts` resolves
shared runtime packages from `packages/` and writes its production artifact to
`apps/web-game/dist`. The root workspace build command uses the same entry and
output contract, so local builds and Vercel builds produce the same static
artifact.

The build performs the following:

1. Installs workspace dependencies.
2. Resolves the web-game workspace.
3. Bundles the React app with Vite.
4. Includes the shared engine and validated puzzle data.
5. Writes static assets to `apps/web-game/dist`.
6. Publishes the contents of `dist` through Vercel.

The deployment contains:

- Compiled React application code
- Compiled shared game engine code
- Validated puzzle JSON
- CSS, SVG, icons, and other static assets

The deployment does not contain:

- Puzzle generator source or executables
- Uniqueness-search tooling
- Difficulty-analysis tooling
- Test fixtures
- Development-only scripts
- A database or server process

### Preview deployments

Keep Vercel connected to the repository root with automatic preview deployments
enabled for pull requests. Each preview runs `npm ci` followed by
`npm run build` and publishes the resulting `apps/web-game/dist` artifact. Use
preview URLs to exercise browser and responsive checks before merging to the
production branch; production deployment remains tied to the production branch
after puzzle validation and browser tests pass.

## 9. Client-side routing

If the initial game remains a single-page application, no special routing setup
is required. If routes such as `/daily`, `/quick-play`, or `/settings` are added,
configure an SPA fallback so unknown application paths resolve to
`/index.html`, while static asset paths continue to resolve normally.

## 10. Future mobile applications

The later iOS and Android applications should reuse:

- `packages/game-engine`
- `packages/puzzle-format`
- The validated puzzle data model

They should implement their own native or React Native presentation and local
storage layers. The browser UI itself is not expected to transfer directly to
mobile.

## 11. Deployment checklist

Before a production deployment:

1. Validate all puzzle JSON against the schemas.
2. Confirm every puzzle has exactly one solution.
3. Build the puzzle catalog.
4. Run game-engine unit tests.
5. Run browser interaction tests.
6. Confirm the production build succeeds from a clean install.
7. Test responsive layouts on phone, tablet, and desktop widths.
8. Verify local persistence and Continue behavior.
9. Verify Daily Loop selection for representative dates.
10. Deploy the Vite output from `apps/web-game/dist`.

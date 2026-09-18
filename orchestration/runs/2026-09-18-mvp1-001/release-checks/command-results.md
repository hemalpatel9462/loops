# P4-01 release command evidence

Run from repository root `/Users/hemalpatel/Development/loops` on 2026-09-18.

| Command | Exit code | Exact result evidence |
| --- | ---: | --- |
| `npm ci` | 0 | `added 116 packages, and audited 125 packages in 1s`; `2 moderate severity vulnerabilities` (audit warning only). |
| `npm run typecheck` | 0 | Root `typecheck` completed for web-game, game-engine, puzzle-format, catalog-builder, puzzle-analyzer, puzzle-generator, and puzzle-validator; no diagnostics. |
| `npm run test` | 0 | Workspace Vitest suites completed: web-game 17 passed, game-engine model 6 passed, validation 4 passed, hints 4 passed, puzzle-format 7 passed, catalog-builder 3 passed, puzzle-analyzer 4 passed, puzzle-generator 4 passed, puzzle-validator 8 passed. |
| `npm run test:e2e` | 0 | `Running 32 tests using 5 workers`; `3 skipped`; `29 passed (10.0s)`. The three skips are the intentionally reduced-motion-only test in phone, tablet, and desktop projects. |
| `npm run build` | 0 | Vite `93 modules transformed`; emitted `apps/web-game/dist/index.html`, `assets/index-DrP_tPS1.css`, and `assets/index-I1GnZrez.js`. |
| `npm run validate:puzzles` | 0 | JSON result: `id=loop-beginner-validate-puzzles`, `solutionCount=1`, `unique=true`. |
| `npm run validate:catalog` | 0 | JSON result: `valid=true`, `puzzleCount=5`, `catalogVersion=1.0.0`. |

The required release gate is green: all seven commands exited 0.

# Loops JSON Schemas

These schemas use JSON Schema Draft 2020-12.

## Runtime data

- `puzzle-definition.schema.json` — one validated puzzle consumed by the game.
- `puzzle-catalog.schema.json` — index of bundled or downloaded puzzles.
- `player-progress.schema.json` — one player's progress for one puzzle.
- `app-settings.schema.json` — device-local gameplay and accessibility settings.
- `player-statistics.schema.json` — device-local aggregate progression statistics.
- `daily-loop-state.schema.json` — device-local Daily Loop state.
- `hint-record.schema.json` — a solver-backed hint shown to the player.

## Generator and validation data

- `generator-config.schema.json` — generator settings used to create a puzzle set.
- `solver-report.schema.json` — solver and difficulty-analysis output for validation.
- `puzzle-attempt.schema.json` — a local playtest or gameplay attempt record.

The puzzle definition contains the hidden solution because MVP1 is offline-first.
The browser must not be treated as a secure environment for competitive scoring.

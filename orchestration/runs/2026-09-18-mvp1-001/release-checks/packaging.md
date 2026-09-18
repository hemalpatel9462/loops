# P4-01 packaging and schema checks

## Vercel contract

Inspected `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web-game/dist",
  "installCommand": "npm ci",
  "framework": "vite"
}
```

The app-local configuration at `apps/web-game/vite.config.ts` resolves the
shared `packages/` runtime alias and emits the same `apps/web-game/dist`
directory.

## Root versus app-local output comparison

The root build command and direct app-local command both completed with exit
code 0 and transformed 93 modules:

```text
npm run build
npx vite build --config apps/web-game/vite.config.ts
```

The SHA-256 manifests were byte-identical after each build:

```text
670b5bb839cf92f5f41b409af51c1745d87a16d9c2ec3e20e8cf952426cc5298  apps/web-game/dist/assets/index-DrP_tPS1.css
07b0f7ca3588fdbb4c6028c0c79be5ee0492f6a8f1c723f1e35d3848c37bdc7d  apps/web-game/dist/assets/index-I1GnZrez.js
38d930e68b1c3a6dc8bb7018e08c4a2474646fa75b8963bcf68079d61950e1fd  apps/web-game/dist/index.html
```

Direct app-local output inventory:

```text
apps/web-game/dist/assets/index-DrP_tPS1.css
apps/web-game/dist/assets/index-I1GnZrez.js
apps/web-game/dist/index.html
```

## Bundle exclusion check

Command:

```text
rg -n -i 'vitest|puzzle-generator|puzzle-validator|catalog-builder|test-candidates|tools/' apps/web-game/dist
```

Exit code: `1` (expected no-match result). The artifact tree contains only the
HTML entrypoint and hashed CSS/JavaScript assets; no generator or test-only
markers were found.

## Schema and report inventory

The ten checked-in schema files are:

```text
app-settings.schema.json
daily-loop-state.schema.json
generator-config.schema.json
hint-record.schema.json
player-progress.schema.json
player-statistics.schema.json
puzzle-attempt.schema.json
puzzle-catalog.schema.json
puzzle-definition.schema.json
solver-report.schema.json
```

Ruby YAML parsing validated all 24 verification-report files against the strict
verification-report shape (required fields and no unsupported top-level or nested
fields). There are 20 pre-release task
IDs (P0-01 through P3-04). The latest report for each task is PASS; P3-02’s
historical initial report was FAIL, and its checked-in
`verification-report-remediation-1.yaml` is the later PASS report. P1-02 and
P1-07 likewise retain their original reports alongside PASS remediation reports.
All 20 pre-release `status.json` records report `status: verified`.

The strict check also confirmed the P3-02 remediation report contains the
required `requiredRemediation: []` field and no remediation-only metadata.

The required data checks independently passed: five catalog entries cover
beginner/easy/medium/hard/expert with 4×4, 5×5, 7×7, 8×8, and 10×10 boards;
the catalog validator reports `valid=true` and the puzzle validator reports
`solutionCount=1`, `unique=true`.

# Wave 0 Result

Run: `2026-09-18-mvp1-001`

## Tasks

- P0-01 — VERIFIED / PASS
- P0-02 — VERIFIED / PASS

## Integration gate

Passed on 2026-09-18:

- `npm install --package-lock-only` — exit 0; lockfile regenerated to include `@loops/puzzle-format`.
- `npm ci` — exit 0.
- `npm run typecheck` — exit 0.
- `npm run test` — exit 0; web smoke test and 7 puzzle-format tests passed.
- `npm run validate:schemas` — exit 0.
- `npm run build` — exit 0; output emitted under `apps/web-game/dist`.
- `npm ls --workspaces --depth=0` — exit 0; both workspaces resolved.

## Remediation and risks

The P0-02 verifier reproduced the pre-gate lockfile mismatch as a LOW finding. The orchestrator regenerated `package-lock.json` in the integration gate; the clean install then passed. npm reported two moderate audit findings; no dependency upgrade was applied.

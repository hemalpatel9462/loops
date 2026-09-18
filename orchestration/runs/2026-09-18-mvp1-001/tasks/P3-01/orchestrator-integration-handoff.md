# P3-01 Orchestrator Integration Handoff

The implementation worker correctly stayed within the declared P3-01 write
scope and left the task PARTIAL because the existing AppShell entry point was
outside that scope. The Orchestrator completed the host wiring in
`apps/web-game/src/app/AppShell.tsx`: the browser shell now imports and mounts
`GameIntegration`, while retaining the existing header and visual-mode control.

This handoff removes the static mock landing/preview from the production main
content and makes the real catalog-backed flow the running application path.
The verifier must inspect this host wiring together with the worker-owned
reducer and integration files before assigning the final verdict.

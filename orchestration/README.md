# Loops Orchestration Workspace

This folder contains the implementation plan, task registry, agent protocol,
acceptance criteria, and run artifacts for the Loops project.

Codex execution is configured at the project level in
[`.codex/config.toml`](/Users/hemalpatel/Development/loops/.codex/config.toml),
with the implementation role defined in
[`.codex/agents/loops-implementation-worker.toml`](/Users/hemalpatel/Development/loops/.codex/agents/loops-implementation-worker.toml)
and the verification role defined in
[`.codex/agents/loops-verification-worker.toml`](/Users/hemalpatel/Development/loops/.codex/agents/loops-verification-worker.toml).
The primary-session profile template is
[`codex-profiles/loops-orchestrator.config.toml`](/Users/hemalpatel/Development/loops/orchestration/codex-profiles/loops-orchestrator.config.toml).
These files are development orchestration configuration only and are not part
of the Vercel deployment.

## Starting the Orchestrator

The primary model is selected at session start, not by project-local config.
An opt-in user profile is installed as `$CODEX_HOME/loops-orchestrator.config.toml`.
From the repository root, start a new CLI session with:

```bash
codex --profile loops-orchestrator --cd /Users/hemalpatel/Development/loops
```

This selects `gpt-5.6-sol` at `medium` reasoning effort, with
`workspace-write` and approval prompts for the primary session. The existing
default Codex profile is unchanged. In the desktop app, select the same model
and reasoning effort manually when opening the Orchestrator session.

The orchestration workflow is:

```text
Orchestrator selects ready task
        ↓
Implementation agent receives task brief
        ↓
Implementation agent changes only its assigned files
        ↓
Implementation agent writes implementation-report.yaml
        ↓
Orchestrator checks the report and task scope
        ↓
Verification agent receives acceptance criteria
        ↓
Verification agent inspects code and runs checks
        ↓
Verification agent writes verification-report.yaml
        ↓
PASS → task complete
FAIL → remediation task → verification repeats
```

## Files

- `ORCHESTRATOR_INSTRUCTIONS.md` — operating instructions for the coordinating agent.
- `IMPLEMENTATION_PLAN.md` — phases, parallel waves, dependencies, and release gates.
- `task-registry.json` — machine-readable task list and current status.
- `templates/task-brief.yaml` — implementation-agent task input.
- `templates/implementation-report.yaml` — required implementation-agent output.
- `templates/verification-brief.yaml` — verifier task input.
- `templates/verification-report.yaml` — required verification-agent output.
- `schemas/` — JSON Schemas used to validate the YAML artifacts after parsing.
- `runs/` — preserved reports and state for each orchestration run.
- Project-scoped Codex roles live in `.codex/`; the implementation and
  verification workers use the same six-thread pool. The verifier's
  `loops-verifier` permission profile keeps project files read-only while
  allowing reports and test output under `orchestration/runs/`.

## Per-task artifact layout

Every task gets a dedicated folder under `runs/`:

```text
runs/<run-id>/tasks/<task-id>/
├── task-brief.yaml
├── implementation-report.yaml
├── verification-brief.yaml
├── verification-report.yaml
├── test-output.txt
└── status.json
```

The implementation and verification agents must write their reports to the
paths supplied in their task prompts. They must not write reports only in chat.

The Orchestrator writes `task-brief.yaml` and `verification-brief.yaml`. The
implementation agent writes `implementation-report.yaml`. The verification agent
writes `verification-report.yaml`.

## Status values

```text
queued → ready → implementing → awaiting-verification → verified
                                      ↓
                                   remediation
                                      ↓
                                   verifying
```

Allowed terminal statuses are `verified`, `blocked`, or `deferred`. A task is
not complete because an implementation agent says it is complete; it is complete
only after a verification report records `PASS`.

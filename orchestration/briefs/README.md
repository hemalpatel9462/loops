# Canonical Task Briefs

This directory contains the source task and verification briefs for every task
in `orchestration/task-registry.json`.

The Orchestrator copies the matching pair into:

```text
orchestration/runs/<run-id>/tasks/<task-id>/
```

The implementation agent receives `task-brief.yaml` and writes
`implementation-report.yaml`. The verification agent receives
`verification-brief.yaml` and writes `verification-report.yaml`.

These canonical briefs are reviewed alongside the implementation plan and task
registry. Changes to acceptance criteria should update both the plan and the
corresponding briefs.

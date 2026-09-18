# Orchestration Runs

Create one directory per implementation run:

```text
runs/<run-id>/
├── RUN-SUMMARY.md
├── task-registry.snapshot.json
└── tasks/
    └── <task-id>/
        ├── task-brief.yaml
        ├── implementation-report.yaml
        ├── verification-brief.yaml
        ├── verification-report.yaml
        ├── remediation-1-brief.yaml
        ├── test-output.txt
        └── status.json
```

Run IDs should be timestamped, for example:

```text
2026-09-18-mvp1-001
```

Never overwrite a prior run. Preserve failed attempts and remediation history.

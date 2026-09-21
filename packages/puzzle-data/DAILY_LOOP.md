# Daily Loop content

`daily-catalog.json` is the manual Daily Loop schedule. Add one entry per date and assign one validated puzzle ID to each difficulty. Run `npm run generate:daily -- --start-date YYYY-MM-DD --days 30` to generate a future batch, or edit the manifest manually:

```json
{
  "date": "2026-09-22",
  "puzzles": {
    "beginner": "loop-beginner-daily-2026-09-22",
    "easy": "loop-easy-daily-2026-09-22",
    "medium": "loop-medium-daily-2026-09-22",
    "hard": "loop-hard-daily-2026-09-22",
    "expert": "loop-expert-daily-2026-09-22"
  }
}
```

The referenced puzzle files must be included in the bundled puzzle data and must have the matching difficulty. The browser validates the manifest at startup, so a missing puzzle or difficulty mismatch fails fast instead of silently selecting another puzzle.

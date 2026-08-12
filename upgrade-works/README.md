# Frontend Upgrade Works

This directory is the durable record of the VMECC frontend quality, component-reuse, UI consistency, and live-UAT programme. Records are grouped by lifecycle so an old plan or historical status cannot be mistaken for current work.

## Current position

- Day 9 local qualification has passed.
- The frontend push is intentionally paused while this records reorganization is audited and included in a fresh release build.
- No cPanel deployment or live-system mutation is authorized by these documents alone.
- The deployable artifact is always the `build/` directory at the final pushed `HEAD`, verified against `build/version.json`.

## Lifecycle folders

| Folder | Meaning | May drive new work? |
| --- | --- | --- |
| [01-active](./01-active/README.md) | Current plans and the latest execution record | Yes |
| [02-completed](./02-completed/README.md) | Execution evidence for work already performed | No |
| [03-reference](./03-reference/README.md) | Reusable audits, catalogues, matrices, and decision records | Reference only |
| [90-archive/actioned-plans](./90-archive/actioned-plans/README.md) | Plans and task sheets whose implementation has already occurred | No |
| [90-archive/stale-status](./90-archive/stale-status/README.md) | Historical documents with a headline status superseded by later evidence | No |
| [99-temporary](./99-temporary/README.md) | Short-lived working notes that must be promoted or removed before release | No |

## Start here

1. Read the [Days 7–9 completion plan](./01-active/FRONTEND_LIVE_UAT_DAYS_7_9_COMPLETION_PLAN_2026-08-11.md) for the current programme boundary.
2. Read the [Day 9 release qualification plan](./01-active/FRONTEND_LIVE_UAT_DAY_9_RELEASE_QUALIFICATION_PLAN_2026-08-12.md) for the release gates.
3. Read the [latest final execution record](./01-active/FRONTEND_LIVE_UAT_DAYS_7_9_FINAL_EXECUTION_2026-08-12.md) for the evidence and current verdict.

## Filing rules

- `01-active` must contain only genuinely pending or in-progress work.
- When an active plan is completed, move its execution evidence to `02-completed` and its plan/task sheet to `90-archive/actioned-plans`.
- Put durable, non-sequential knowledge in `03-reference`.
- Preserve superseded records in `90-archive/stale-status`; do not silently rewrite their historical conclusions.
- `99-temporary` must not contain credentials, tokens, production data, screenshots, traces, generated builds, or other sensitive/raw test artifacts.
- Keep application source, `build/`, Playwright output, and test results outside this documentation tree.
- Before committing a reorganization, verify that all relative Markdown links resolve and that no record remains unclassified at this directory root.

## Interpretation rule

Status statements inside completed or archived records describe the point in time when those files were written. If they conflict with an active record, the newest active execution record and the repository state take precedence.

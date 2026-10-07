# Recovery log

## Harness attempt 1 — invalid

- Interrupted intent: inspect settled desktop routes and exercise search/filter controls.
- Observation: screenshots contained only the `Restoring session...` shell.
- Cause: the disposable runner treated a visible `#root` as application readiness.
- Classification: harness invalidation, not a product defect.
- Evidence retained: `screenshots/` and `desktop-audit-ledger.json`.
- Correction: require the restoring-session message to disappear and a settled application shell to exist before collecting metrics or screenshots.
- Retry allowance: one clean corrected attempt.

## State-aware suite harness observations

- Two inspection source-component cases stopped before rendering because Vite reported a missing React-refresh preamble. No product UI was exercised by those attempts.
- The typography offline-cache case used the standard project Playwright configuration, which blocks service workers, while the case waits for `navigator.serviceWorker.ready`.
- Classification: harness invalidations, not product defects.
- Evidence retained under `C:/laragon/www/vmecc/.qa/VMECC-QA-20260904-180000-deskqa/`.
- Recovery: one clean inspection retry after the Vite module has been warmed; one typography retry using a disposable QA configuration that allows service workers.

## Retry results

- High Angle desktop search: the Vite React-refresh preamble error repeated before the component rendered. Final status: blocked, `COVERAGE BLOCKER`.
- Offline typography/cache: `navigator.serviceWorker.ready` timed out again after 90 seconds with service workers allowed. Final status: blocked, `COVERAGE BLOCKER`.
- No product interaction was scored as failed from either harness result.

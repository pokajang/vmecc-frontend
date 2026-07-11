# Drill Upgrade - Backend & PDF Execution Runbook (V1)

Purpose

- Convert the existing hardened plan into an execution-only playbook for the remaining gates.
- Validate all gates in order with explicit pass/fail outcomes before enabling broader rollout.
- Keep this file as the single source for execution evidence and rollback decisions.

Primary release boundary

- Backend media/PDF hardening for Drill is covered in this runbook.
- ERCO/Inspection behavior remains in scope only as collateral impact checks.
- Frontend upload affordance rollout can begin only after Gate D.

Assumptions

- Release branch is already prepared with backend/front-end code from `DRILL_UPGRADE_BACKEND_PDF_FOLLOWUP.md`.
- `REPORT_MEDIA_DRILL_UPLOAD_ENABLED` is false in production unless explicitly switched.
- Staging and production credentials are available to run commands and view logs.
- At least one low-memory Android device and one iOS Safari-capable device are available for manual verification.

Gate A - Baseline lock and readiness

1. Confirm target artifacts
   - Check latest commit on release branch.
   - Confirm file set includes:
     - `DRILL_UPGRADE_BACKEND_PDF_FOLLOWUP.md`
     - `DRILL_UPGRADE_BACKEND_PDF_ACCEPTANCE.md`
     - `DRILL_REFERENCE_PDF_COVERAGE_V1.md`
   - Verify `.env.production` and `.env` example flags:
     - `REPORT_MEDIA_DRILL_UPLOAD_ENABLED=false`

2. Deployment pre-flight
   - Backup DB per normal playbook.
   - Snapshot private report media bucket/path.
   - Confirm queue/workers are healthy.
   - Ensure a rollback window is available.

Pass criteria:

- Current branch is frozen and documented.
- Backups completed.
- Queue and storage health verified.

Gate B - Staging schema and data prep

Run in staging after deploy.

1. Confirm schema and app status
   - `php artisan migrate:status`
   - `php artisan config:cache && php artisan config:clear` once config is corrected.
   - Verify no enum/check constraint conflict on:
     - `report_media.module`
     - `report_media.parent_type`
     - `report_media.parent_key`

2. Read-only integrity checks
   - media counts by module
   - managed media totals by owner and report type
   - existing anomalies (orphaned/stale links)
   - existing Drill media rows, if any

3. Reconciliation dry-runs
   - ERCO:
     - `php artisan report-media:reconcile-reports --module=erco --dry-run --batch=100`
   - Drill:
     - `php artisan report-media:reconcile-reports --module=drill --dry-run --batch=100`

Pass criteria:

- migrate status is clean for expected migrations.
- No unresolved schema constraint mismatch.
- Dry-runs show explainable results.
- Any rejected rows are triaged before enablement.

Gate C - Test and verification on staging

1. Automated checks
   - API/media lifecycle smoke:
     - drill upload (authorized/unauthorized)
     - draft create/update/delete/resume
     - final report create/update/delete
   - media lifecycle and transaction integrity:
     - optimistic conflict
     - wrong module idempotency conflict
     - draft rollback on invalid media
   - PDF:
     - request PDF for legacy and V2 payloads
     - verify missing media and wrong-module media are omitted safely
   - run focused tests from current code if automation is available.

2. Functional flows
   - Upload photo(s) and verify stored media row shows:
     - module `drill`
     - owner, lease, thumbnail
   - Save draft with photo and reopen.
   - Final submit and reopen as reviewer and unauthorized user.

Pass criteria:

- Staging flow completes without partial payload/version/timeline rollback.
- 0 critical API contract regressions.
- PDF renders correctly for stored managed photos.

Gate D - Staging Drill upload enablement

1. Flip flag only in staging:
   - `REPORT_MEDIA_DRILL_UPLOAD_ENABLED=true`
   - run config cache refresh.
2. Frontend validation path:
   - enable/verify upload affordance in the Drill form only.
3. Manual scenario set:
   - upload -> draft -> reload/resume -> review -> submit
   - draft deletion -> report reopen -> PDF
   - reviewer download/view checks
   - unauthorized access checks

Pass criteria:

- No login redirects in photo capture/return path.
- Media remains linked after draft lifecycle transitions.
- Upload/submit/review path stable with retries.

Gate E - Mobile/Browser hardening

Run all scenarios in both Android low-memory and current Android Chrome, plus iOS Safari.

- Camera capture + return should not force relogin.
- Upload fails gracefully with clear inline feedback.
- Ten photos max still enforced and handled.
- Retry/cancel/timeout behavior does not corrupt draft state.
- Background/foreground and expired session paths are stable.
- One failed photo plus subsequent successful photo does not break session.

Pass criteria:

- Same behavior for at least one full device test run each environment.
- No session loss after capture return.
- Photo data remains in expected form state and sync state.

Gate F - Reliability before production

1. Staging canary stress window
   - retry-heavy submit cycles
   - concurrent sync and retry actions
   - partial network degradation
   - pruning threshold test for unlinked media
2. Pre-canary observability checks
   - upload failures and `upload_id_module_conflict` count
   - reconcile reject count
   - pdf render memory/time errors
   - prune logs and media survival of linked items

Pass criteria:

- No repeated retry dead loops.
- Linked media not removed by prune.
- Error distribution stable.

Gate G - Controlled production canary + rollout

1. Enable feature in controlled canary cohort only.
2. Keep rollback command path ready:
   - immediately set `REPORT_MEDIA_DRILL_UPLOAD_ENABLED=false`
   - refresh config cache
3. Monitor 1-2 controlled cycles:
   - auth and permission denials
   - submit/review flow completion rate
   - PDF render errors and storage health
4. Expand release only when canary is stable.

Pass criteria:

- Monitoring flat and error budget within agreed thresholds.
- No unresolved ownership/module mismatch.
- No login reset linked to media actions.

Final acceptance criteria

- All Gates A through G are marked pass.
- Evidence artifacts collected (screenshots/log snippets/command outputs).
- Reconciliation dry-runs and prune behavior recorded.
- PR merge and deployment notes updated with rollback steps.

Rollback policy

1. Stop immediately on:
   - partial transaction failures
   - repeated login redirects during capture/upload
   - prune removing links that still exist
2. First rollback action:
   - disable `REPORT_MEDIA_DRILL_UPLOAD_ENABLED`
   - keep linking, hydration, and existing scoped reconciliation enabled
3. If needed, pause prune and run investigation before re-enabling upload.

Execution evidence template

- `DATE`, `ENV`, `OWNER`, `COMMAND/SCENARIO`, `RESULT`, `NEXT_ACTION`
- Keep this section filled during execution in deployment notes.

Execution log (2026-07-11)

- 2026-07-11 21:45 local, `testing`, Codex, `git status --short` in `vmecc-backend`, Result: changed files include expected backend/report/inspection drift-hardening and new supporting files; no blockers.
- 2026-07-11 21:48 local, `testing`, Codex, `php artisan migrate:status --env=testing`, Result: all migrations ran, no pending.
- 2026-07-11 21:50 local, `testing`, Codex, `php artisan migrate:fresh --env=testing`, Result: DB reset completed successfully.
- 2026-07-11 22:00 local, `testing`, Codex, baseline focused suites (`ReportMediaHardeningTest`, `ReportDraftApiTest`, `ReportApiWorkflowTest`, `InspectionPayloadGuardrailsTest`, `InspectionSessionApiTest`, `ErcoReportPdfTest`, `DrillReportPdfTest`), Result: all pass.
- 2026-07-11 22:12 local, `testing`, Codex, `php artisan test --filter='ReportMediaHardeningTest|DrillReportMediaLifecycleTest' --env=testing`, Result: PASS (23 tests).
- 2026-07-11 22:18 local, `testing`, Codex, `php artisan test --filter='ReportDraftApiTest|ReportApiWorkflowTest|DrillPayloadValidationTest' --env=testing`, Result: PASS (16 tests).
- 2026-07-11 22:22 local, `testing`, Codex, `php artisan test --filter='ErcoReportPdfTest|DrillReportPdfTest|InspectionReportPdfTest' --env=testing`, Result: PASS (31+ tests and 11+ tests).
- 2026-07-11 22:35 local, `testing`, Codex, full suite `php artisan test --env=testing`, Result: PASS (517 tests, 3441 assertions).
- 2026-07-11 22:40 local, `testing`, Codex, `php artisan report-media:reconcile-reports --module=erco --dry-run --batch=100 --env=testing`, Result: clean dry-run (0 scanned rows in local fixture).
- 2026-07-11 22:41 local, `testing`, Codex, `php artisan report-media:reconcile-reports --module=drill --dry-run --batch=100 --env=testing`, Result: clean dry-run (0 scanned rows in local fixture).

- 2026-07-11 23:05 local, `frontend`, Codex, `npx vitest run src/views/inspection/__tests__/` in `vmecc-frontend`, Result: PASS (63 files, 703 tests).
- 2026-07-11 23:08 local, `frontend`, Codex, `npx vitest run src/views/report/drill/__tests__/` in `vmecc-frontend`, Result: PASS (9 files, 30 tests).
- 2026-07-11 23:11 local, `frontend`, Codex, `npm run lint` in `vmecc-frontend`, Result: PASS.
- 2026-07-11 23:13 local, `frontend`, Codex, `npm run build -- --mode production` in `vmecc-frontend`, Result: PASS (6128 modules transformed).
- 2026-07-11 23:16 local, `testing`, Codex, `php artisan tinker --execute ... selectRaw('user_id, module, count(*)')`, Result: media inventory clean (2 users, only module=inspection in local fixture).

# Frontend Live UAT Day 7 Controlled Mutation Plan

**Date:** 2026-08-11  
**Parent:** `FRONTEND_LIVE_UAT_DAYS_7_9_COMPLETION_PLAN_2026-08-11.md`  
**Entry decision:** Day 6 GO  
**Status:** Executed; GO for Day 8  
**Execution target:** local frontend and backend on explicit loopback origins only  
**Primary outcome:** prove that the refactored frontend still completes real Inspection and Report business journeys without changing contracts, losing data, leaking filenames, or leaving disposable records behind

## 1. Day 7 boundary

Day 7 is a controlled business-outcome regression stage. It is not a production UAT run, deployment stage, visual redesign, or permission to continue extracting components.

Authorized work:

- inspect and harden the local Playwright mutation harness;
- create, update, submit, review, approve/reject, download, and delete only namespaced disposable local records;
- test all eight Inspection types and the ERCO, Fitness Test, and Drill report families;
- verify media upload, persistence, ordering, removal, retry/recovery, detail presentation, and cleanup;
- make bounded frontend fixes only for confirmed regressions;
- add or improve tests and local-only evidence controls needed to prove those fixes; and
- record an evidence-backed GO or HOLD verdict for Day 8.

Not authorized:

- mutation against `vmecc.amiosh.com` or any other non-loopback host;
- cPanel commands, Git push, release commits, or deployment;
- frontend or backend `.env` changes;
- database resets, `migrate:fresh`, broad SQL deletion, or deletion by an unscoped pattern;
- removal of the seeded UAT users needed for Days 8–9;
- backend/schema/API/permission changes without separate user authorization;
- replacement of working domain-specific components merely to increase reuse; or
- retention of real device photos, personal information, cookies, tokens, or passwords in evidence.

## 2. User journeys and quality lenses

The execution must test outcomes from the viewpoint of:

| User lens                          | Day 7 job to prove                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tactical Response Team submitter   | Start, interrupt, resume, review, and submit a valid record with evidence                       |
| Incident Commander reviewer        | Find the submitted record, understand status/context, and perform supported review actions      |
| System Administrator/catalog owner | Create only the disposable setup data required by a test and remove it safely                   |
| Goal-driven returner               | Resume a draft or unfinished workflow without losing position or media                          |
| Interrupted/mobile user            | Recover from reload, upload interruption, camera cancellation, or offline queue where supported |
| Unauthorized/unrelated user        | Remain unable to view or change records outside the intended permission boundary                |

Each journey must answer four questions with browser and API evidence:

1. Can the user orient and find the next action?
2. Does the primary action produce the expected persisted business result?
3. Is success, failure, or pending state understandable?
4. Can the user recover or continue without duplicate records or data loss?

## 3. Existing suites to reuse

Day 7 extends existing ownership instead of creating a parallel E2E system.

| Existing suite/script                                                                                  | Day 7 responsibility                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `test:e2e:live-uat-safety`                                                                             | Prove credential and live-UAT fail-closed contracts before mutation                                  |
| `test:e2e:live-uat-day5-contract`                                                                      | Reconfirm media render-site inventory and filename policy                                            |
| `test:e2e:live-uat-day6-media`                                                                         | Reconfirm shared media interaction and accessibility contracts                                       |
| `test:e2e:inspection:crud`                                                                             | Catalog CRUD, all-form draft/report/PDF matrix, workflow transitions, and cleanup                    |
| `test:e2e:inspection:smoke`                                                                            | Specialist ER Aux, Fire Extinguisher, SCBA, and High Angle browser journeys                          |
| `test:e2e:inspection:live`                                                                             | All eight Inspection types, responsive QA, workflow, offline recovery, artifacts, and cleanup ledger |
| `test:e2e:reporting-workflow`                                                                          | ERCO, Drill, and Fitness Test review/approval/rejection and permission outcomes                      |
| `test:e2e:report-media`                                                                                | Authenticated ERCO/Drill ordered-media persistence and purge path                                    |
| `workflow-approvals-e2e.spec.js`                                                                       | Shared workflow-stage regression where the reporting suite needs supporting coverage                 |
| `leave-remediation-smoke.spec.js`, `overtime-remediation-smoke.spec.js`, and focused collateral suites | Prove shared-component changes did not cross lifecycle boundaries                                    |

If a required outcome is already asserted, improve its evidence or cleanup rather than duplicating it in a new monolithic spec.

## 4. Required evidence model

Create one run ID in this exact form:

```text
VMECC-QA-YYYYMMDD-HHMMSS-xxxxxx
```

All disposable titles, identifiers, notes, locations, equipment, catalog entries, filenames, and submission keys must derive from that run ID. Evidence belongs under the existing ignored QA/artifact path and must include only:

- run ID, local origins, Git/build identity, and timestamps;
- suite/test/result and relevant route;
- non-secret disposable record identifiers;
- HTTP method, endpoint shape, response status, and sanitized contract observations;
- screenshots/traces only when they contain generated UAT data;
- cleanup attempts and final reconciliation; and
- classified findings and rerun results.

Never store passwords, cookies, CSRF tokens, authorization headers, full request dumps, real images, or copied production content. Device filenames are allowed only inside internal API/storage assertions where necessary to prove preservation; they must not appear in screenshots or user-visible evidence.

## 5. Execution tasks

### Task 7.0 — Freeze and verify the Day 6 boundary

1. Record frontend and backend `HEAD`, upstream refs, branch, and worktree status.
2. Record `build/version.json` without rebuilding or deleting the current qualified build.
3. Map every changed/untracked path to the Day 4–6 execution records; unknown paths force HOLD.
4. Confirm `.env*`, `../UAT/creds.md`, `.qa`, Playwright output, screenshots, traces, downloads, uploads, database files, and logs are not staged.
5. Run `git diff --check` before Day 7 edits.
6. Run the Day 5 inventory contract and Day 6 media browser contract independently.
7. Confirm the seeded UAT personas exist through a non-secret identity/role check; do not print password hashes or credentials.
8. Confirm local PostgreSQL, Laravel API, and Vite frontend health without configuration edits.

**Gate 7.0:** prior contracts are green, every worktree path is explained, credentials remain private, and no production origin is configured.

### Task 7.1 — Harden the mutation harness before real journeys

1. Generate one run ID and use it for both `E2E_RUN_ID` and the smoke run marker.
2. Require:
   - `VMECC_SYSTEM_QA=1`;
   - frontend `http://127.0.0.1:3000`;
   - API `http://127.0.0.1:8000/api`;
   - `VMECC_LIVE_SMOKE=1`; and
   - `VMECC_LIVE_ALLOW_MUTATIONS=1` only in the process running the guarded local suite.
3. Explicitly remove/disable `VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW`; foreign records must remain immutable.
4. Add a contract test if any mutation suite can run without a valid run marker or against a non-loopback HTTP origin.
5. Supply seeded credentials to child processes without echoing them, placing them in command history, or copying them into Markdown.
6. Capture pre-run counts only for rows/media/catalog data carrying the exact run namespace.
7. Create and remove a single namespaced probe through supported API/UI paths.
8. Simulate one cleanup failure in an isolated fixture and prove it creates a manual-cleanup artifact and forces HOLD.
9. Confirm `finally` cleanup still runs after a primary assertion failure and accepts only documented success/already-absent statuses.
10. Stop if the harness cannot distinguish a test-owned record from a pre-existing record.

**Gate 7.1:** mutation is impossible on a non-loopback origin, every created object is registered before the next action, and cleanup failure cannot be reported as a pass.

### Task 7.2 — Run the all-Inspection lifecycle matrix

Cover these eight implemented types:

1. General Inspection;
2. Health Safety Environment;
3. Fire Extinguisher;
4. Hydraulic Rescue Tools;
5. High Angle Rescue Equipment;
6. Emergency Response Auxiliary Equipment;
7. SCBA; and
8. Fire Truck Daily Readiness.

For every supported type, verify:

- entry from the correct Inspection route and clear selected-type context;
- namespaced location/equipment/catalog setup where required;
- representative OK, issue/defect, N/A, missing, or incomplete states;
- validation before a premature next/submit action;
- draft save, navigation away, reload, and accurate resume;
- one generated image upload and meaningful description;
- multiple-image count/order where supported;
- removal with immediate and persisted state agreement;
- retry, cancellation, or actionable failure feedback where supported;
- filename-free user-facing editor, queue, review, detail, viewer, fallback, toast, and error copy;
- internal media identifier/filename preservation needed by storage and API contracts;
- review and submit under the intended role;
- reviewer visibility and approve/reject/reopen only where the domain supports it;
- status, metadata, history, PDF/download, and detail consistency after transitions;
- narrow and wide journey completion without hidden primary actions; and
- reverse-order cleanup of reports, drafts, media, leases, temporary uploads, locations, equipment, and catalog rows.

Apply these type-specific assertions:

| Type              | Required specialized outcome                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| General/HSE       | Finding classification, corrective action, evidence description, and detail presentation remain linked                                |
| Fire Extinguisher | Catalog/session lifecycle, duplicate protection, next-location continuation, resolution evidence, and terminal cleanup remain correct |
| Hydraulic         | Managed equipment checks and issue evidence remain owned by the correct equipment row                                                 |
| High Angle        | Nested item state, defect evidence, mobile drawer, and PDF output remain coherent                                                     |
| ER Auxiliary      | Defect evidence and additional photos remain visibly and persistently distinct                                                        |
| SCBA              | Section/item nesting, evidence ownership, summaries, and PDF output remain correct                                                    |
| Fire Truck        | Daily-readiness equipment/checklist evidence and summary remain correct                                                               |

Use `inspection-live-smoke.spec.js` as the coverage ledger. Use the smaller specialist suites to diagnose failures and to avoid rerunning the 30-minute matrix after every local correction.

### Task 7.3 — Exercise interruption and recovery

1. Reload after a draft save and after at least one persisted media operation.
2. Navigate away and return through the records list.
3. Exercise offline queue creation, visible queued state, reconnect, sync, and cleanup where currently supported.
4. Cancel camera/file selection and confirm the prior record state is unchanged.
5. Simulate one rejected upload and confirm retry/cancel feedback is associated with the correct image without exposing its device filename.
6. Verify repeated submit/retry does not duplicate a report or media item.
7. Verify failed/missing image rendering remains usable and exposes no destructive recovery action.
8. Confirm keyboard focus returns to the initiating control after closing a media viewer or modal encountered in the journey.

**Gate 7.3:** no data loss, cross-record attachment, duplicate submission, stranded queue, or ambiguous recovery state.

### Task 7.4 — Run ERCO, Fitness Test, and Drill lifecycles

For each report family:

1. create a namespaced draft with minimum valid domain data;
2. add representative repeated rows and multiline content;
3. save, leave, reload, and resume;
4. upload generated UAT images where the module supports media;
5. edit descriptions, verify ordered persistence, and remove one image;
6. review and submit as the intended submitter;
7. find the record as the correct reviewer;
8. verify approval and rejection paths only where supported;
9. verify an unrelated persona remains blocked;
10. open detail/gallery and verify description, count, ordering, Fit/100%, previous/next, Escape, and focus return where available;
11. prove no device filename appears in user-facing success/failure/detail copy while document workflows retain useful document names; and
12. purge reports/drafts/media through the supported command/API cleanup path and reconcile storage plus database state.

Fitness Test currently receives full workflow coverage even if its media capability differs from ERCO/Drill. A legitimate capability difference is recorded, not papered over with a shared component.

### Task 7.5 — Check collateral module isolation

Run focused checks for areas that may share presentation primitives but intentionally keep different lifecycles:

- Messages attachment select/preview/cancel/lightbox;
- Leave image/document selection, validation, and removal;
- Overtime evidence and approval presentation where applicable;
- payroll/salary-claim receipt preview and useful document filename retention;
- profile/team image rendering;
- AI knowledge document upload/reader naming; and
- avatar, logo, and other static/identity imagery.

The acceptance rule is behavioral preservation. Do not migrate document-centric uploads into the evidence-photo system and do not globally hide filenames that users need to identify documents.

### Task 7.6 — Cleanup and residue reconciliation

1. Register every created identifier immediately, not at test completion.
2. Clean child/media objects before parents and catalog objects last.
3. Execute cleanup from `finally` blocks even after timeout, assertion failure, or browser close failure.
4. Treat only the endpoint's documented delete success and already-absent response as clean.
5. Requery by exact run ID after each suite and at Day 7 close.
6. Compare scoped pre/post counts and storage paths.
7. Search for run-owned drafts, reports, media, upload leases, offline queue records, locations, equipment, extinguisher/truck rows, SCBA sections/items, and workflow attachments.
8. Preserve UAT user accounts for Days 8–9; do not run `LiveUatUsersCleanupSeeder` as record cleanup.
9. If any residue remains, write sanitized identifiers and supported removal commands to `manual-cleanup.json`, issue HOLD, and complete cleanup before another mutation run.
10. Never use a broad name fragment, date range, user ID, `TRUNCATE`, database reset, or raw SQL as cleanup.

**Gate 7.6:** zero run-owned database/storage/browser-queue residue. “Test passed but cleanup failed” is a Day 7 failure.

### Task 7.7 — Diagnose and correct confirmed regressions

Classify every failure as one of:

- frontend regression;
- backend/API contract defect;
- fixture/seed-data issue;
- local infrastructure issue;
- harness/cleanup defect; or
- intentional domain difference.

For a confirmed frontend regression:

1. preserve the failing evidence;
2. add or tighten the smallest regression assertion first where practicable;
3. fix the existing shared owner if the same contract genuinely repeats;
4. keep domain differences local;
5. avoid API payload, permission, transition, or persistence changes;
6. run the focused unit/component test;
7. rerun the smallest affected Playwright journey;
8. rerun Day 5 inventory and Day 6 media contracts if media presentation changed; and
9. rerun the affected Day 7 batch with cleanup reconciliation.

A Blocker/High issue, cleanup uncertainty, contract drift, or required backend change forces HOLD. Medium/Low findings may be deferred only with evidence, owner, user harm, and a concrete trigger.

### Task 7.8 — Close Day 7

Write `FRONTEND_LIVE_UAT_DAY_7_CONTROLLED_MUTATION_EXECUTION_2026-08-11.md` containing:

- exact Git/build/environment identity;
- run ID and confirmed loopback origins;
- suite-by-suite results rather than one combined final exit code;
- journey/type/role coverage matrix;
- API and persisted-outcome reconciliation;
- filename/media/recovery findings;
- correction and rerun evidence;
- cleanup ledger and zero-residue proof;
- blocked/deferred items; and
- GO or HOLD verdict for Day 8.

Update `upgrade-works/README.md` only after the execution evidence supports the verdict.

## 6. Planned execution order and commands

Commands are run independently from `vmecc-frontend`; do not chain them and infer overall success from the last command.

### Batch A — Read-only preflight

```powershell
git status --short
git diff --check
npm run test:e2e:live-uat-safety
npm run test:e2e:live-uat-day5-contract
npm run test:e2e:live-uat-day6-media
```

### Batch B — Guarded local Inspection tests

Create a valid run ID, set `VMECC_SYSTEM_QA=1`, set both URLs to explicit `127.0.0.1` loopback origins, and load credentials privately. Then run each separately:

```powershell
npm run test:e2e:inspection:crud
npm run test:e2e:inspection:smoke
npm run test:e2e:inspection:live
```

The live suite additionally requires process-scoped `VMECC_LIVE_SMOKE=1`, `VMECC_LIVE_ALLOW_MUTATIONS=1`, and the same namespaced smoke run ID. `VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW` must be absent.

### Batch C — Guarded local Report tests

```powershell
npm run test:e2e:reporting-workflow
npm run test:e2e:report-media
```

`test:e2e:report-media` owns isolated ports 3011/8011 and requires the valid guarded run ID. Do not start competing services on those ports and do not reuse its temporary server as proof for the primary 3000/8000 environment.

### Batch D — Focused collateral and correction reruns

Run only the applicable focused spec(s), followed by the relevant Day 5/6 contract and affected mutation batch. The exact command list belongs in the execution record because it depends on observed failures; absence of a failure does not justify unrelated broad test churn.

### Batch E — Closeout checks

```powershell
git diff --check
npm run lint
```

Run focused Vitest for changed owners during corrections. A full test/build/release gate is intentionally deferred to Day 9 unless a Day 7 correction has enough blast radius to require it immediately.

## 7. Pass criteria

Day 7 earns GO for Day 8 only when all are true:

- mutation ran solely on explicit loopback origins with a valid run ID;
- all eight Inspection types completed their applicable persisted outcomes;
- ERCO, Fitness Test, and Drill completed their applicable workflow outcomes;
- required submitter/reviewer/unauthorized role boundaries held;
- draft, reload, media, interruption, retry, and recovery behavior caused no loss or duplication;
- device filenames remained absent from image-facing UI while internal identifiers and document names remained intact;
- existing API methods, payload fields, status transitions, permissions, and storage contracts did not drift;
- collateral modules retained their intended behavior;
- every created row/file/queue object was removed and scoped pre/post counts reconcile to zero;
- no Blocker/High regression remains;
- all correction reruns and mandatory contracts are green; and
- the execution record contains reproducible, sanitized evidence.

## 8. Stop conditions

Stop immediately and issue HOLD if:

- any mutation URL is not explicit loopback HTTP;
- the run ID is absent/invalid or a record cannot be proven run-owned;
- credentials, tokens, headers, cookies, or personal data appear in output/evidence;
- a test touches a pre-existing or foreign record;
- cleanup registration occurs only after a risky multi-step journey;
- cleanup fails, count reconciliation is uncertain, or a broad delete would be needed;
- draft/media data is lost, duplicated, reordered incorrectly, or attached to another record;
- a user-visible image filename returns or a useful document filename is removed;
- workflow permissions/transitions differ from the established contract;
- a primary user cannot complete, resume, or understand the journey;
- a backend/schema change appears necessary without authorization; or
- test infrastructure is mistaken for a product pass.

## 9. Rollback and recovery

- Keep each corrective slice independently reviewable.
- Revert only the failing Day 7 slice, never the pre-existing Day 4–6 worktree.
- Rerun its focused contract and affected business journey after rollback.
- Use registered supported cleanup endpoints/commands for test data; do not roll back the database globally.
- If browser cleanup times out, continue server-side cleanup and retain a sanitized manual ledger.
- Stop task-owned browser/backend/frontend processes without terminating unrelated Laragon services.
- Do not rebuild or modify committed deployment assets unless a verified source correction requires a fresh local qualification; final artifact commit handling remains Day 9.

## 10. Day 7 deliverables

1. this execution-ready plan;
2. any narrowly required safety/coverage test improvements;
3. bounded frontend corrections for verified regressions only;
4. ignored Playwright evidence and cleanup ledger;
5. `FRONTEND_LIVE_UAT_DAY_7_CONTROLLED_MUTATION_EXECUTION_2026-08-11.md`; and
6. a documented GO or HOLD decision for Day 8.

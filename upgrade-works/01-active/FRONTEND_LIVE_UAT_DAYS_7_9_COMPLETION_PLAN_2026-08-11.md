# Frontend Live UAT Days 7–9 Completion Plan

**Date:** 2026-08-11  
**Parent plan:** `FRONTEND_LIVE_UAT_COMPONENT_RECONCILIATION_PLAN_2026-08-10.md`  
**Starting point:** Days 1–6 complete; Day 6 issued GO for the remaining UAT programme  
**Status:** Day 9 local qualification passed; push, manual cPanel deployment, and live verification remain pending  
**Scope:** Controlled mutation regression, accessibility/responsive reconciliation, final qualification, intentional frontend release, and read-only post-deployment verification

**Day 7 execution plan:** `FRONTEND_LIVE_UAT_DAY_7_CONTROLLED_MUTATION_PLAN_2026-08-11.md`

**Day 7 execution record:** `FRONTEND_LIVE_UAT_DAY_7_CONTROLLED_MUTATION_EXECUTION_2026-08-11.md`

**Day 8 execution plan:** `FRONTEND_LIVE_UAT_DAY_8_ACCESSIBILITY_RESPONSIVE_PLAN_2026-08-11.md`

**Day 8 execution record:** `FRONTEND_LIVE_UAT_DAY_8_ACCESSIBILITY_RESPONSIVE_EXECUTION_2026-08-11.md`

**Day 9 execution plan:** `FRONTEND_LIVE_UAT_DAY_9_RELEASE_QUALIFICATION_PLAN_2026-08-12.md`

**Days 7–9 final execution record:** `FRONTEND_LIVE_UAT_DAYS_7_9_FINAL_EXECUTION_2026-08-12.md`

## 1. Sequence correction

The active programme runs through Day 9. Day 6 completed implementation and source-backed media verification, but it did not complete:

- **Day 7:** controlled mutation and business-outcome regression UAT;
- **Day 8:** accessibility, responsive, and cross-module consistency reconciliation; or
- **Day 9:** complete release gates, intentional commit/build/push, cPanel deployment, and final live read-only verification.

Do not commit or deploy the Day 6 worktree merely because its local component gates passed. The final diff/build release audit belongs inside Day 9, after Days 7 and 8 can expose corrective work.

## 2. Objectives

Days 7–9 must prove safety at three levels:

1. **Business behavior:** create, edit, media, review, submission, approval/rejection, recovery, and cleanup outcomes remain correct.
2. **Human interaction:** keyboard, focus, mobile/tablet/desktop layout, themes, reduced motion, and shared-component consistency remain usable.
3. **Release behavior:** the exact qualified source and committed build deploy correctly to shared cPanel hosting and pass a read-only live sweep.

No further consolidation is automatically authorized. Introduce another shared component only for a verified repeated contract found during Days 7–8 and only through an independently test-gated corrective slice.

## 3. Safety and authorization boundary

### 3.1 Controlled mutation

- Day 7 mutation journeys run against the controlled local frontend/backend and disposable UAT records.
- Do not run create, update, submit, approve, reject, delete, upload, acknowledgement, or read-state mutations against production.
- Previously seeded UAT accounts do not by themselves authorize production mutation.
- Do not change frontend or backend `.env` files.
- `../UAT/creds.md` remains local-only and ignored. Never quote credentials into commands, logs, screenshots, traces, Markdown, or Git.
- Use existing UAT seeders and supported cleanup paths; do not add one-off SQL or terminal data patches.

### 3.2 Disposable data identity

Every created record must carry a unique namespace:

```text
VMECC-UAT-YYYYMMDD-HHMMSS-xxxxxx
```

The run ledger records only non-secret identifiers required for cleanup. It must not record passwords, cookies, CSRF tokens, real uploaded images, or personal operational data.

### 3.3 Repository boundary

- Preserve all tracked and untracked Day 4–6 work.
- Do not use destructive Git reset, checkout, clean, or broad generated-file deletion.
- Do not edit the backend unless Day 7 proves a backend defect and the user separately authorizes it.
- Do not alter API contracts, database schema, permissions, workflow transitions, or stored media fields as frontend reconciliation.
- Commit, push, cPanel deployment, and eventual UAT-user cleanup remain separately gated Day 9 actions.

## 4. Pre-Day 7 checkpoint

### Task 7.0 — Freeze the qualified Day 6 boundary

1. Record frontend HEAD, upstream HEAD, worktree status, and `build/version.json`.
2. Map every modified/untracked path to the Day 4–6 execution records.
3. Confirm credentials, `.env` files, QA artifacts, traces, local uploads, and database files are not tracked.
4. Re-run the Day 5 inventory contract and Day 6 media browser contract.
5. Confirm local PostgreSQL/backend/frontend services needed by mutation tests without configuration edits.
6. Create a Day 7 run ID and ignored artifact directory before mutation.
7. Capture pre-run counts for disposable records so cleanup can be reconciled exactly.

**Entry gate:** Day 6 contracts remain green, the worktree is explained, credentials remain private, and no production mutation origin is configured.

## 5. Day 7 — Controlled mutation and regression UAT

### Task 7.1 — Mutation harness and cleanup proof

1. Require explicit loopback frontend/API origins and a valid run ID.
2. Refuse any uncontrolled or production mutation host.
3. Authenticate the minimum local roles without printing credentials.
4. Create one namespaced probe record and remove it through a supported path.
5. Reconcile the pre-run count.
6. Prove failed cleanup writes `manual-cleanup.json` and forces HOLD.
7. Keep screenshots/traces in ignored evidence storage.

**Gate:** the harness cannot mutate production or report success with incomplete cleanup.

### Task 7.2 — All Inspection lifecycles

Cover all eight implemented types:

1. General Inspection;
2. HSE Inspection;
3. Fire Extinguisher Inspection;
4. Hydraulic Rescue Equipment Inspection;
5. High Angle Rescue Equipment Inspection;
6. ER Auxiliary Equipment Inspection;
7. SCBA Inspection; and
8. Fire Truck Daily Readiness Inspection.

For each applicable type:

1. create a namespaced record;
2. complete setup/location/equipment selection;
3. exercise supported OK, issue/defect, N/A, missing, or incomplete states;
4. save a draft and resume after navigation or reload;
5. add one image, add/edit its description, and verify no device filename appears;
6. add multiple images where supported and verify order/count;
7. remove an image and verify immediate plus persisted state;
8. exercise retry/cancel or simulated upload failure where supported;
9. review and submit with the intended submitter role;
10. verify reviewer visibility and approve/reject/reopen only where supported;
11. verify detail/history/status after transition;
12. confirm internal media ID and filename data remains intact; and
13. clean up reports and disposable location/equipment/catalog rows.

Also verify:

- offline queue/recovery and interrupted camera recovery where supported;
- Fire Extinguisher continuation and resolution evidence;
- ER Aux defect versus additional photo separation;
- Hydraulic/High Angle/SCBA nested evidence ownership;
- usable failed/missing-image fallback; and
- no leftover draft, report, media lease, or catalog entry.

### Task 7.3 — ERCO, Fitness Test, and Drill lifecycles

For every report family:

1. create a namespaced draft;
2. complete minimum valid domain fields and representative repeated rows;
3. exercise multiline text;
4. upload one and multiple images;
5. edit descriptions and remove an image;
6. verify mobile/desktop editor parity;
7. review and submit;
8. open detail and gallery viewer;
9. verify description, order, Fit/100%, previous/next, Escape, and focus return;
10. verify failure copy contains no device filename; and
11. clean up through supported test mechanisms.

If a module lacks safe automated cleanup, use isolated transaction/database restoration. Never leave data behind and label the run passed.

### Task 7.4 — Specialist collateral-regression journeys

Verify that intentionally separate lifecycles were not affected:

- Messages attach/preview/cancel/lightbox;
- Leave mixed image/document selection and removal;
- Overtime evidence where applicable;
- payroll/salary-claim receipt preview and document filename retention;
- profile/team images;
- AI knowledge upload/reader document filenames; and
- representative avatar/static-brand rendering.

These are isolation checks, not authorization to merge them into the shared evidence-photo system.

### Task 7.5 — Day 7 reconciliation

1. Compare business outcomes, methods, payload fields, transitions, stored media metadata, and cleanup with pre-refactor contracts.
2. Classify failures as regression, fixture/data, infrastructure, or expected domain difference.
3. Fix only confirmed frontend regressions in bounded slices.
4. Add a failing regression test first where practicable.
5. Rerun the affected journey and Day 6 media contract after every fix.
6. Reconcile cleanup after failed or interrupted runs.
7. Write `FRONTEND_LIVE_UAT_DAY_7_CONTROLLED_MUTATION_EXECUTION_2026-08-11.md`.

**Day 7 exit gate:** mandatory business outcomes pass, zero disposable records remain, contracts are unchanged, and no Blocker/High regression remains.

## 6. Day 8 — Accessibility, responsive, and consistency reconciliation

### Task 8.0 — Deterministic fixtures

1. Use non-sensitive sparse, populated, long-content, error, and multi-image fixtures.
2. Stabilize motion through browser preference/configuration, not production CSS.
3. Record the component/route/viewport matrix before screenshots.
4. Reuse established components and tokens; add no alternative design system.

### Task 8.1 — Keyboard and assistive-technology contract

Verify navigation, filters, drawers, dialogs, galleries, editors, upload feedback, and workflow actions for:

- logical Tab/Shift+Tab order;
- visible focus;
- correct modal/drawer focus entry, trap, Escape behavior, and return;
- semantic headings, landmarks, lists, buttons, labels, and live regions;
- meaningful icon-control names;
- description/context-based filename-free image alternatives;
- associated validation and async errors;
- destructive confirmation; and
- understandable disabled/loading states.

### Task 8.2 — Responsive boundary matrix

Run high-risk surfaces at 360×800, 390×844, 768×1024, 928 px, 929 px, and 1440×900.

Verify:

- horizontal overflow does not exceed 1 px;
- Inspection Details has no left divider through 928 px and retains intentional desktop separation from 929 px;
- no image-only card-on-card presentation returns;
- images preserve aspect ratio and stay within their content column;
- sticky actions do not obscure content or safe-area controls;
- long identifiers/descriptions/labels/status copy wrap safely;
- tables and filters recompose predictably;
- mobile drawers and desktop modals preserve task parity; and
- touch targets remain usable without obscuring the primary task.

### Task 8.3 — Theme, motion, and state coverage

1. Check light/dark modes where supported.
2. Check reduced motion for drawers, dialogs, loaders, and viewers.
3. Cover loading, empty, filtered-empty, error/retry, permission, disabled, success, missing-image, and recovery states.
4. Verify readable semantic status colors and contrast.
5. Confirm feedback remains understandable without color alone.

### Task 8.4 — Cross-module consistency verdict

Compare equivalent jobs across Inspection, ERCO, Fitness Test, Drill, and adjacent modules:

- orientation and primary actions;
- metadata;
- evidence presentation and editing;
- upload status/recovery;
- confirmation/destructive actions;
- empty/error/retry states; and
- mobile/desktop action placement.

Assign every difference one disposition:

- corrected through an existing shared owner;
- aligned through existing tokens/styles;
- intentionally local due to different user job/lifecycle; or
- deferred with evidence, owner, severity, and trigger.

Inspect screenshot diffs individually. Never bulk-update baselines without proving the change is intentional.

### Task 8.5 — Day 8 closeout

1. Rerun affected tests after every correction.
2. Rerun the affected Day 7 mutation path when interaction changes.
3. Rerun Day 5 inventory and Day 6 media browser contracts.
4. Write `FRONTEND_LIVE_UAT_DAY_8_ACCESSIBILITY_RESPONSIVE_EXECUTION_2026-08-11.md`.

**Day 8 exit gate:** no Blocker/High accessibility or responsive defect, no unexplained screenshot change, and every retained inconsistency has a domain reason.

## 7. Day 9 — Full qualification, release, and live verification

### Task 9.0 — Final worktree/release-scope audit

1. Record frontend/backend HEAD and upstream state.
2. Map every modified, deleted, and untracked path to a Day 4–8 record or exclude it.
3. Inspect diffs for accidental API, permission, route, persistence, or business-rule changes.
4. Reconcile generated build churn separately from authored source.
5. Confirm credentials, `.env`, UAT data, screenshots, traces, uploads, dumps, and QA artifacts are not staged.
6. Confirm backend has no unintended Day 7 change.

**Gate:** every release path has an owner/reason; unknown files force HOLD.

### Task 9.1 — Complete local gates

Run and record each command independently:

1. dependency lock/install integrity appropriate to unchanged dependency scope;
2. full ESLint;
3. applicable production config, router, media, route coverage, credential safety, contrast, and typography audits;
4. full Vitest;
5. Day 3–6 contracts;
6. Day 7 controlled mutation with cleanup reconciliation;
7. Day 8 accessibility/responsive Playwright;
8. applicable PWA update test;
9. production build;
10. `.htaccess`, `index.html`, `version.json`, production API and no-local-origin checks;
11. asset/reference and stale hashed-asset review;
12. `git diff --check`; and
13. changed/staged secret screening.

Do not infer overall success from the final exit code of a chained shell command; assert each result separately.

### Task 9.2 — Source and build commit ordering

Because cPanel deploys committed `build/` and `version.json` derives from HEAD:

1. stage only reviewed source, tests, scripts, and durable documents;
2. commit the qualified authored work;
3. rebuild in production mode from that source commit;
4. verify the build ID prefix matches the authored source commit;
5. rerun build-origin, `.htaccess`, asset-reference, whitespace, and secret gates;
6. stage only verified `build/` changes;
7. commit the deployment artifact separately; and
8. verify both commits and final status before push.

Do not repeatedly amend trying to make a generated commit-derived hash equal the commit containing itself.

### Task 9.3 — Push and cPanel deployment

After explicit push/deploy authorization:

1. push both frontend commits to `origin/main`;
2. confirm local HEAD equals `origin/main`;
3. pull `~/vmecc-frontend` on cPanel;
4. verify build essentials before copying;
5. resolve the exact frontend document root;
6. replace only `~/public_html/vmecc.amiosh.com/` contents with committed `build/`;
7. do not run npm, change `.env`, touch backend, or run database commands; and
8. verify public `version.json` matches the committed build.

If `rsync` is unavailable, use the documented `rm` plus `cp -a build/.` workflow only after confirming the exact document root.

### Task 9.4 — Final production read-only verification

Run the hardened live harness for:

1. public login/session baseline;
2. representative intended-role routes at 390 and 1440 px;
3. nested-route direct navigation and refresh;
4. Inspection list/detail/review and corrected All-scope refresh/close;
5. every available Inspection type;
6. ERCO/Fitness/Drill list/detail/review where data exists;
7. mobile/desktop Inspection divider boundaries;
8. filename absence, neutral framing, descriptions, viewer controls, and missing-image fallback;
9. representative document filename retention;
10. console, request, 4xx/5xx, rate-limit, session, overflow, and mutation monitoring; and
11. final public build identity.

Unavailable data remains `data-blocked`; unavailable role views remain `permission-blocked`. Never mutate production to convert a block into a pass.

### Task 9.5 — Final closeout

1. Reconcile route/module/state/viewport/role coverage.
2. Confirm unexpected production mutations equal zero.
3. Record remaining blocks and Medium/Low findings with owner/trigger.
4. Stop task-owned local/browser services.
5. Confirm cleanup ledgers are empty and artifacts ignored.
6. Write `FRONTEND_LIVE_UAT_DAYS_7_9_FINAL_EXECUTION_2026-08-11.md`.
7. Update the README verdict to GO, CONDITIONAL GO, or HOLD.

## 8. Minimum evidence matrix

| Area          | Required evidence                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Inspection    | All eight types covered or explicit supported-path limitation                                      |
| Reports       | ERCO, Fitness Test, Drill create/edit/media/review/detail/cleanup                                  |
| Media         | Upload, descriptions, multiple images, remove, retry/cancel/failure, viewer, metadata preservation |
| Recovery      | Draft resume, reload, offline/interruption where supported, actionable errors                      |
| Workflow      | Submitter/reviewer outcomes; approval/rejection/reopen where supported                             |
| Accessibility | Keyboard, focus, Escape, labels/names, live regions, visible focus                                 |
| Responsive    | 360, 390, 768, 928, 929, 1440 px and measured overflow                                             |
| Themes/states | Light/dark where supported, reduced motion, loading/empty/error/permission/missing-image           |
| Isolation     | Messages, Leave, Overtime, Payroll, profile/team, knowledge/document checks                        |
| Cleanup       | Zero disposable records/media/catalog rows or HOLD with manual ledger                              |
| Release       | Authored-source commit, source-derived build commit, pushed/public identity                        |
| Live safety   | Read-only production, zero unexpected mutations, no credential leakage                             |

## 9. Stop conditions

Issue HOLD if:

- a test targets a non-loopback mutation host before Day 9;
- cleanup fails or disposable data cannot be reconciled;
- media/order/payload/permission/transition behavior changes unexpectedly;
- a draft or record is lost or attached to the wrong module;
- a keyboard user cannot operate/dismiss/recover focus;
- mandatory overflow exceeds 1 px;
- an image filename returns or document filename disappears;
- unexplained mass snapshot updates are required;
- full tests, build, audits, or origin checks fail;
- Git staging contains credentials, environments, artifacts, data, or unknown files;
- public build identity differs; or
- live UAT observes a mutation.

Infrastructure/data failures are not application passes.

## 10. Rollback

### Day 7–8 corrective rollback

1. Keep fixes independently reviewable.
2. Revert only the failing slice.
3. Rerun its affected journey plus Day 6 media contract.
4. Preserve data contracts so no schema rollback is needed.

### Day 9 deployment rollback

1. Identify the last known-good frontend build commit.
2. Keep the old public build recoverable until live verification passes.
3. Restore its committed build contents to the exact document root if needed.
4. Verify restored `version.json`, nested-route reload, login, and dashboard.
5. Record failed build ID, symptom, rollback time, and corrective owner.

Rollback does not authorize backend/database rollback for this frontend-only stage.

## 11. Deliverables

1. this plan;
2. Day 7 controlled-mutation record and cleanup summary;
3. Day 8 accessibility/responsive record and exception matrix;
4. final coverage reconciliation;
5. authored-source and build-artifact commit identities;
6. cPanel/public build identity evidence;
7. final read-only live evidence;
8. `FRONTEND_LIVE_UAT_DAYS_7_9_FINAL_EXECUTION_2026-08-11.md`; and
9. updated README verdict.

## 12. Completion criteria

The programme completes only when:

- Day 7 proves controlled outcomes and zero residual data;
- Day 8 proves accessibility/responsive/state consistency and intentional boundaries;
- Day 9 proves full local gates, reviewed scope, source-derived committed build, cPanel deployment, and read-only live verification;
- no Blocker/High regression or unexplained failure remains;
- credentials and production evidence remain outside Git;
- public build identity matches the committed artifact; and
- the final execution record supports its release verdict.
